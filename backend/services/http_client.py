"""
Shared HTTP client manager.

Provides a single, process-wide httpx.AsyncClient with connection pooling
and HTTP/2 enabled, instead of opening a brand new TCP/TLS connection for
every outbound request. This is critical for external API calls (Semantic
Scholar, OpenAlex) that happen many times per pipeline run — creating a new
`httpx.AsyncClient()` per request throws away keep-alive connections and
multiplies TLS handshake overhead, which makes bursts of requests slower
and more prone to being flagged/rate limited by upstream providers.

Usage:
    from services.http_client import get_http_client, init_http_client, close_http_client

    # at app startup (see main.py lifespan):
    await init_http_client()

    # anywhere in request-handling code:
    client = get_http_client()
    resp = await client.get(url)

    # at app shutdown:
    await close_http_client()
"""
import logging
import httpx

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None


async def init_http_client() -> httpx.AsyncClient:
    """Create the shared AsyncClient. Safe to call multiple times."""
    global _client
    if _client is not None:
        return _client

    limits = httpx.Limits(
        max_connections=50,
        max_keepalive_connections=20,
        keepalive_expiry=30.0,
    )
    timeout = httpx.Timeout(connect=10.0, read=20.0, write=10.0, pool=10.0)

    try:
        # http2=True requires the optional `h2` package. Fall back gracefully
        # if it isn't installed so the app doesn't crash at startup.
        _client = httpx.AsyncClient(limits=limits, timeout=timeout, http2=True)
    except ImportError:
        logger.warning(
            "h2 package not installed — falling back to HTTP/1.1 for the shared client. "
            "Install `httpx[http2]` to enable HTTP/2."
        )
        _client = httpx.AsyncClient(limits=limits, timeout=timeout, http2=False)

    logger.info("Shared HTTP client initialized (http2=%s).", _client._transport is not None)
    return _client


def get_http_client() -> httpx.AsyncClient:
    """
    Return the shared AsyncClient. Lazily initializes a fallback client if
    `init_http_client()` was never called (e.g. in tests / scripts run
    outside the FastAPI lifespan), so callers never crash on a None client.
    """
    global _client
    if _client is None or _client.is_closed:
        logger.warning(
            "Shared HTTP client accessed before initialization — "
            "creating a fallback client. Call init_http_client() at app startup."
        )
        limits = httpx.Limits(max_connections=50, max_keepalive_connections=20)
        _client = httpx.AsyncClient(limits=limits, timeout=httpx.Timeout(20.0))
    return _client


async def close_http_client() -> None:
    """Close the shared client cleanly. Call this during app shutdown."""
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
        logger.info("Shared HTTP client closed.")
    _client = None
