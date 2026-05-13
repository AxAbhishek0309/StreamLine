import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.job_repository import JobRepository
from app.models.job import JobStatus
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class RetryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.job_repo = JobRepository(db)

    async def retry_job(self, job_id: uuid.UUID) -> dict:
        job = await self.job_repo.get_by_id(job_id)
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

        if job.status not in (JobStatus.FAILED, JobStatus.CANCELLED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot retry job in status: {job.status}",
            )

        if job.retry_count >= settings.TASK_MAX_RETRIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Max retries ({settings.TASK_MAX_RETRIES}) exceeded",
            )

        await self.job_repo.increment_retry(job_id)

        # Import here to avoid circular imports at module load time
        from worker.tasks.process_document import process_document_task
        task = process_document_task.delay(
            str(job.document_id),
            str(job_id),
        )

        await self.job_repo.update_status(
            job_id,
            status=JobStatus.PENDING,
            celery_task_id=task.id,
        )

        logger.info("job_retried", job_id=str(job_id), retry_count=job.retry_count + 1)
        return {"job_id": job_id, "message": "Job queued for retry", "celery_task_id": task.id}
