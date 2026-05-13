import asyncio
import json
from redis.asyncio import Redis
from app.core.redis import get_job_channel
from app.websocket.manager import ws_manager
from app.core.logging import get_logger

logger = get_logger(__name__)


class WebSocketService:
    """
    Subscribes to a Redis Pub/Sub channel for a job and
    forwards messages to all connected WebSocket clients.
    """

    @staticmethod
    async def stream_job_progress(job_id: str, redis: Redis):
        channel = get_job_channel(job_id)
        pubsub = redis.pubsub()
        await pubsub.subscribe(channel)
        logger.info("pubsub_subscribed", job_id=job_id, channel=channel)

        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    payload = json.loads(message["data"])
                except (json.JSONDecodeError, TypeError):
                    continue

                await ws_manager.broadcast(job_id, payload)

                # Stop listening once job reaches a terminal state
                terminal = {"completed", "failed", "cancelled"}
                if payload.get("status") in terminal:
                    logger.info("pubsub_terminal", job_id=job_id, status=payload.get("status"))
                    break
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
