import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.redis import get_pubsub_redis
from app.websocket.manager import ws_manager
from app.services.websocket_service import WebSocketService
from app.core.logging import get_logger

router = APIRouter(tags=["websocket"])
logger = get_logger(__name__)


@router.websocket("/ws/jobs/{job_id}")
async def job_progress_ws(job_id: str, websocket: WebSocket):
    """
    WebSocket endpoint for real-time job progress.

    Flow:
      1. Client connects
      2. We subscribe to Redis Pub/Sub channel job:{job_id}:progress
      3. Worker publishes events → Redis → this handler → WebSocket client
      4. On terminal state or disconnect, we clean up
    """
    await ws_manager.connect(job_id, websocket)
    redis = await get_pubsub_redis()

    stream_task = asyncio.create_task(
        WebSocketService.stream_job_progress(job_id, redis)
    )

    try:
        # Keep connection alive; client can send pings
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info("ws_client_disconnected", job_id=job_id)
    finally:
        stream_task.cancel()
        ws_manager.disconnect(job_id, websocket)
