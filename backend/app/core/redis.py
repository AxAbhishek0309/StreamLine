import ssl
import certifi
import redis.asyncio as aioredis
from redis.asyncio import Redis
from app.core.config import settings

_redis_client: Redis | None = None
_pubsub_client: Redis | None = None


def _make_ssl_ctx() -> ssl.SSLContext:
    ctx = ssl.create_default_context(cafile=certifi.where())
    return ctx


async def get_redis() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            ssl_ca_certs=certifi.where(),
        )
    return _redis_client


async def get_pubsub_redis() -> Redis:
    global _pubsub_client
    if _pubsub_client is None:
        _pubsub_client = aioredis.from_url(
            settings.REDIS_PUBSUB_URL,
            encoding="utf-8",
            decode_responses=True,
            ssl_ca_certs=certifi.where(),
        )
    return _pubsub_client


async def close_redis():
    global _redis_client, _pubsub_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
    if _pubsub_client:
        await _pubsub_client.aclose()
        _pubsub_client = None


def get_job_channel(job_id: str) -> str:
    return f"job:{job_id}:progress"
