import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.job_repository import JobRepository
from app.repositories.document_repository import DocumentRepository
from app.models.job import JobStatus
from app.core.logging import get_logger

logger = get_logger(__name__)


class ProcessingService:
    """
    Responsible for dispatching Celery tasks after upload.
    Processing itself happens entirely inside the worker.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.job_repo = JobRepository(db)
        self.doc_repo = DocumentRepository(db)

    async def dispatch(self, document_id: uuid.UUID, job_id: uuid.UUID) -> str:
        from worker.tasks.process_document import process_document_task

        task = process_document_task.delay(str(document_id), str(job_id))

        await self.job_repo.update_status(
            job_id,
            status=JobStatus.PENDING,
            celery_task_id=task.id,
        )

        logger.info("task_dispatched", document_id=str(document_id), job_id=str(job_id), task_id=task.id)
        return task.id
