"""
In-process cache + in-flight de-duplication for external paper-lookup
requests (Semantic Scholar / OpenAlex).

Two distinct problems are solved here:

1. **Repeated queries across pipeline runs / claims**: many claims in the
   same document (or across documents from many concurrent users) often
   normalize to the same or a very similar search query. A short-TTL,
   in-memory cache avoids re-hitting the external API for a query we've
   already resolved recently.

2. **Duplicate *concurrent* requests for the same query**: when several
   claims fire off `asyncio.gather()` at the same time and happen to ask for
   the same query, without de-duplication every one of them would open its
   own outbound HTTP request simultaneously. Instead, the first caller
   creates a shared `asyncio.Future`; every other caller for the same key
   just awaits that same Future, so only one real network request is made.

This is intentionally a simple in-memory structure (a dict + asyncio
primitives), scoped to a single process/worker. It is not a substitute for
the DB-backed `cached_papers` table (which persists across process restarts
and users) — it's a fast first line of defense against redundant work
within/near a single pipeline execution.
"""
import asyncio
import logging
import time
from typing import Awaitable, Callable, TypeVar

logger = logging.getLogger("request_cache")

T = TypeVar("T")

_DEFAULT_TTL_SECONDS = 300  # 5 minutes — long enough to cover one pipeline run
# and short-lived enough not to serve badly stale results forever.


class InFlightQueryCache:
    """
    Keyed cache of (provider, normalized_query) -> result, with in-flight
    request coalescing via asyncio.Future.
    """

    def __init__(self, ttl_seconds: float = _DEFAULT_TTL_SECONDS):
        self._ttl = ttl_seconds
        self._results: dict[str, tuple[float, object]] = {}
        self._in_flight: dict[str, "asyncio.Future"] = {}
        self._lock = asyncio.Lock()

    @staticmethod
    def make_key(provider: str, query: str) -> str:
        normalized = " ".join(query.strip().lower().split())
        return f"{provider}:{normalized}"

    async def get_or_fetch(
        self,
        key: str,
        fetch_fn: Callable[[], Awaitable[T]],
    ) -> tuple[T, bool]:
        """
        Return (result, cache_hit). If a fresh cached result exists, return
        it immediately. If an identical request is already in flight, await
        its Future instead of starting a new one. Otherwise, run `fetch_fn`
        once and populate both the cache and any concurrent waiters.
        """
        async with self._lock:
            cached = self._results.get(key)
            if cached is not None:
                cached_at, value = cached
                if time.monotonic() - cached_at < self._ttl:
                    logger.info("cache=hit key=%s", key)
                    return value, True
                # stale — drop it
                del self._results[key]

            existing_future = self._in_flight.get(key)
            if existing_future is not None:
                logger.info("cache=miss key=%s coalesced=true (awaiting in-flight request)", key)
                future = existing_future
                should_fetch = False
            else:
                future = asyncio.get_event_loop().create_future()
                self._in_flight[key] = future
                should_fetch = True

        if not should_fetch:
            result = await future
            return result, False

        logger.info("cache=miss key=%s coalesced=false (issuing new request)", key)
        try:
            result = await fetch_fn()
        except Exception as exc:
            async with self._lock:
                self._in_flight.pop(key, None)
            if not future.done():
                future.set_exception(exc)
            raise
        else:
            async with self._lock:
                self._results[key] = (time.monotonic(), result)
                self._in_flight.pop(key, None)
            if not future.done():
                future.set_result(result)
            return result, False


# Separate caches per provider so a Semantic Scholar miss for a query doesn't
# collide with an OpenAlex entry for the same text.
semantic_scholar_cache = InFlightQueryCache()
openalex_cache = InFlightQueryCache()
