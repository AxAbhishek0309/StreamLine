import json
import ssl
import certifi
import redis
from app.core.config import settings
from app.core.redis import get_job_channel
from app.schemas.progress import ProgressEvent
from app.core.logging import get_logger

logger = get_logger(__name__)

_ssl_ctx = ssl.create_default_context(cafile=certifi.where())

# Synchronous Redis client for use inside Celery tasks
_sync_redis = redis.from_url(
    settings.REDIS_PUBSUB_URL,
    decode_responses=True,
    ssl_ca_certs=certifi.where(),
)


def publish_progress(event: ProgressEvent):
    """Publish a progress event to the Redis Pub/Sub channel for a job."""
    channel = get_job_channel(event.job_id)
    payload = event.model_dump()
    _sync_redis.publish(channel, json.dumps(payload))
    logger.info(
        "progress_published",
        job_id=event.job_id,
        stage=event.stage,
        progress=event.progress,
    )
