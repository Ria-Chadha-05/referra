"""
Production-grade outbound rate limiting for external API providers
(Semantic Scholar, OpenAlex, ...).

Responsibilities of this module (and only this module — business logic for
parsing/normalizing provider responses stays in ai/paper_retriever.py):

  1. Bound concurrency per-provider with an asyncio.Semaphore, so a burst of
     N claims never opens more than a handful of simultaneous connections to
     a single upstream API.
  2. Space requests out (minimum inter-request interval) so even sequential
     requests don't hammer the provider back-to-back.
  3. Retry on transient failures (429 / 500 / 502 / 503 / 504) with
     exponential backoff + jitter, honoring `Retry-After` when the provider
     sends one.
  4. Emit structured, greppable logs for every attempt: provider, endpoint,
     status, retry count, backoff duration, and total latency.

This module is intentionally transport-agnostic: callers pass in a coroutine
factory (`() -> Awaitable[httpx.Response]`) and get back the final response
(or the last exception, if retries are exhausted).
"""
import asyncio
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Awaitable, Callable

import httpx

from config import settings

logger = logging.getLogger("rate_limiter")

RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


@dataclass
class ProviderLimiterConfig:
    name: str
    max_concurrent: int = 3          # concurrent in-flight requests to this provider
    min_interval_seconds: float = 0.34  # spacing between request *starts* (~3 req/s)
    max_retries: int = 5
    base_backoff_seconds: float = 0.5
    max_backoff_seconds: float = 20.0


class ProviderRateLimiter:
    """
    One instance per external provider. Wraps request execution with:
      - a semaphore bounding concurrency
      - a leaky-bucket-ish throttle spacing out request starts
      - retry with exponential backoff + jitter on retryable errors
      - a circuit breaker: if a provider reports a long Retry-After (or we
        detect it's clearly blocked long-term), stop hammering it entirely
        for a cooldown window instead of burning retries that can't succeed.
    """

    # If a Retry-After (or computed backoff) exceeds this, treat it as a
    # long-term block: stop retrying this request and open the circuit
    # instead of sleeping through it.
    LONG_BLOCK_THRESHOLD_SECONDS = 30.0
    # How long to keep the circuit open once we've detected a long-term
    # block, before allowing a single "probe" request through again.
    CIRCUIT_COOLDOWN_SECONDS = 60.0

    def __init__(self, config: ProviderLimiterConfig):
        self.config = config
        self._semaphore = asyncio.Semaphore(config.max_concurrent)
        self._throttle_lock = asyncio.Lock()
        self._last_request_started_at: float = 0.0
        self._circuit_open_until: float = 0.0  # monotonic timestamp; 0 = closed

    def _circuit_is_open(self) -> bool:
        return time.monotonic() < self._circuit_open_until

    def _open_circuit(self, seconds: float) -> None:
        until = time.monotonic() + min(seconds, self.CIRCUIT_COOLDOWN_SECONDS)
        self._circuit_open_until = max(self._circuit_open_until, until)
        logger.error(
            "provider=%s circuit_breaker=open cooldown_s=%.1f -> "
            "skipping further requests to this provider until cooldown elapses",
            self.config.name, until - time.monotonic(),
        )

    async def _throttle(self) -> None:
        """Ensure at least `min_interval_seconds` between request starts,
        regardless of how many concurrent slots are free. This turns bursts
        into a smooth, sustainable stream of requests."""
        async with self._throttle_lock:
            now = time.monotonic()
            elapsed = now - self._last_request_started_at
            wait = self.config.min_interval_seconds - elapsed
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_request_started_at = time.monotonic()

    def _compute_backoff(self, attempt: int, retry_after: float | None) -> float:
        """Exponential backoff with full jitter, capped at max_backoff_seconds.
        Respects the provider's Retry-After header when present."""
        if retry_after is not None:
            return min(retry_after, self.config.max_backoff_seconds)
        exp = self.config.base_backoff_seconds * (2 ** attempt)
        exp = min(exp, self.config.max_backoff_seconds)
        # full jitter: random value in [0, exp]
        return random.uniform(0, exp)

    @staticmethod
    def _parse_retry_after(response: httpx.Response | None) -> float | None:
        if response is None:
            return None
        header = response.headers.get("retry-after")
        if not header:
            return None
        try:
            return float(header)
        except ValueError:
            # Retry-After can also be an HTTP-date; not handling that format
            # here is acceptable since providers we target send delta-seconds.
            return None

    async def execute(
        self,
        request_fn: Callable[[], Awaitable[httpx.Response]],
        *,
        endpoint: str,
    ) -> httpx.Response:
        """
        Run `request_fn()` under this provider's concurrency + throttle
        limits, retrying on transient errors with exponential backoff.

        Raises the last httpx exception / HTTPStatusError if all retries
        are exhausted.
        """
        provider = self.config.name
        attempt = 0
        last_exc: Exception | None = None
        overall_start = time.monotonic()

        if self._circuit_is_open():
            remaining = self._circuit_open_until - time.monotonic()
            logger.warning(
                "provider=%s endpoint=%s circuit_breaker=open remaining_s=%.1f "
                "-> skipping request (no network call made)",
                provider, endpoint, remaining,
            )
            raise RuntimeError(
                f"{provider} circuit breaker open for another {remaining:.0f}s "
                f"(provider reported a long-term block)"
            )

        async with self._semaphore:
            while attempt <= self.config.max_retries:
                await self._throttle()
                attempt_start = time.monotonic()
                response: httpx.Response | None = None
                try:
                    response = await request_fn()
                    latency_ms = round((time.monotonic() - attempt_start) * 1000, 1)

                    if response.status_code in RETRYABLE_STATUS_CODES:
                        retry_after = self._parse_retry_after(response)

                        # Forensic logging: print every header the provider sent
                        # back on a retryable/error status. This is what lets us
                        # diagnose *why* a 429 happened (Retry-After, X-RateLimit-*,
                        # CF-*, Server, Via, Age, ...) instead of guessing blind.
                        logger.warning(
                            "provider=%s endpoint=%s status=%s response_headers=%s",
                            provider, endpoint, response.status_code,
                            dict(response.headers),
                        )

                        # Long-term block detected: open the circuit instead
                        # of burning retries that cannot possibly succeed.
                        if retry_after is not None and retry_after > self.LONG_BLOCK_THRESHOLD_SECONDS:
                            self._open_circuit(retry_after)
                            response.raise_for_status()

                        backoff = self._compute_backoff(attempt, retry_after)
                        logger.warning(
                            "provider=%s endpoint=%s status=%s attempt=%d/%d "
                            "latency_ms=%s backoff_s=%.2f retry_after=%s -> retrying",
                            provider, endpoint, response.status_code,
                            attempt + 1, self.config.max_retries + 1,
                            latency_ms, backoff, retry_after,
                        )
                        if attempt == self.config.max_retries:
                            response.raise_for_status()
                        await asyncio.sleep(backoff)
                        attempt += 1
                        continue

                    response.raise_for_status()

                    total_ms = round((time.monotonic() - overall_start) * 1000, 1)
                    logger.info(
                        "provider=%s endpoint=%s status=%s attempt=%d retries=%d "
                        "latency_ms=%s total_latency_ms=%s cache=miss result=success",
                        provider, endpoint, response.status_code,
                        attempt + 1, attempt, latency_ms, total_ms,
                    )
                    return response

                except httpx.HTTPStatusError as exc:
                    last_exc = exc
                    # Non-retryable status (e.g. 400, 401, 404) — fail fast.
                    logger.error(
                        "provider=%s endpoint=%s status=%s attempt=%d -> "
                        "non-retryable HTTP error: %s",
                        provider, endpoint,
                        exc.response.status_code if exc.response is not None else "?",
                        attempt + 1, exc,
                    )
                    raise
                except (httpx.TimeoutException, httpx.TransportError) as exc:
                    last_exc = exc
                    backoff = self._compute_backoff(attempt, None)
                    logger.warning(
                        "provider=%s endpoint=%s attempt=%d/%d network_error=%s "
                        "backoff_s=%.2f -> retrying",
                        provider, endpoint, attempt + 1,
                        self.config.max_retries + 1, exc, backoff,
                    )
                    if attempt == self.config.max_retries:
                        break
                    await asyncio.sleep(backoff)
                    attempt += 1
                    continue

            total_ms = round((time.monotonic() - overall_start) * 1000, 1)
            logger.error(
                "provider=%s endpoint=%s retries_exhausted=%d total_latency_ms=%s "
                "result=failure last_error=%s",
                provider, endpoint, attempt, total_ms, last_exc,
            )
            if last_exc:
                raise last_exc
            raise RuntimeError(f"{provider} request to {endpoint} failed with no response")


# ── Shared, process-wide limiter instances ───────────────────────────────────
# 2-3 concurrent requests per provider, as required. Kept as module-level
# singletons so every call site (and every claim being processed concurrently)
# shares the same semaphore / throttle state — this is what actually prevents
# bursts, as opposed to each call creating its own limiter.
semantic_scholar_limiter = ProviderRateLimiter(
    ProviderLimiterConfig(
        name="semantic_scholar",
        max_concurrent=getattr(settings, "SS_MAX_CONCURRENT_REQUESTS", 1),
        min_interval_seconds=1.2,
        max_retries=getattr(settings, "EXTERNAL_API_MAX_RETRIES", 5),
    )
)

openalex_limiter = ProviderRateLimiter(
    ProviderLimiterConfig(
        name="openalex",
        max_concurrent=getattr(settings, "OPENALEX_MAX_CONCURRENT_REQUESTS", 1),
        min_interval_seconds=1.2,  # OpenAlex allows a higher polite-pool rate
        max_retries=getattr(settings, "EXTERNAL_API_MAX_RETRIES", 5),
    )
)
