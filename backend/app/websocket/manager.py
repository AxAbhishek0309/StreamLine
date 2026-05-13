import asyncio
import json
from collections import defaultdict
from fastapi import WebSocket
from app.core.logging import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections per job_id.
    Multiple clients can subscribe to the same job.
    """

    def __init__(self):
        # job_id -> set of active WebSocket connections
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        self._connections[job_id].add(websocket)
        logger.info("ws_connected", job_id=job_id, total=len(self._connections[job_id]))

    def disconnect(self, job_id: str, websocket: WebSocket):
        self._connections[job_id].discard(websocket)
        if not self._connections[job_id]:
            del self._connections[job_id]
        logger.info("ws_disconnected", job_id=job_id)

    async def broadcast(self, job_id: str, payload: dict):
        """Send a message to all clients subscribed to a job."""
        dead: list[WebSocket] = []
        for ws in list(self._connections.get(job_id, [])):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(job_id, ws)

    def subscriber_count(self, job_id: str) -> int:
        return len(self._connections.get(job_id, set()))


# Singleton — shared across the app process
ws_manager = ConnectionManager()
