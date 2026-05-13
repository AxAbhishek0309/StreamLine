import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.job import Job, JobStatus, JobStage


class JobRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, document_id: uuid.UUID) -> Job:
        job = Job(document_id=document_id, status=JobStatus.PENDING.value)
        self.db.add(job)
        await self.db.flush()
        await self.db.refresh(job)
        return job

    async def get_by_id(self, job_id: uuid.UUID) -> Job | None:
        result = await self.db.execute(select(Job).where(Job.id == job_id))
        return result.scalar_one_or_none()

    async def get_by_document_id(self, document_id: uuid.UUID) -> list[Job]:
        result = await self.db.execute(
            select(Job).where(Job.document_id == document_id).order_by(Job.created_at.desc())
        )
        return result.scalars().all()

    async def list(
        self,
        page: int = 1,
        page_size: int = 20,
        status: JobStatus | None = None,
    ) -> tuple[list[Job], int]:
        offset = (page - 1) * page_size
        query = select(Job)
        count_query = select(func.count()).select_from(Job)
        if status:
            query = query.where(Job.status == status)
            count_query = count_query.where(Job.status == status)
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()
        result = await self.db.execute(
            query.order_by(Job.created_at.desc()).offset(offset).limit(page_size)
        )
        return result.scalars().all(), total

    async def update_status(
        self,
        job_id: uuid.UUID,
        status: JobStatus,
        progress: float | None = None,
        stage: JobStage | None = None,
        error_message: str | None = None,
        celery_task_id: str | None = None,
    ) -> Job | None:
        job = await self.get_by_id(job_id)
        if not job:
            return None
        job.status = status.value if hasattr(status, 'value') else status
        if progress is not None:
            job.progress = progress
        if stage is not None:
            job.current_stage = stage.value if hasattr(stage, 'value') else stage
        if error_message is not None:
            job.error_message = error_message
        if celery_task_id is not None:
            job.celery_task_id = celery_task_id
        await self.db.flush()
        await self.db.refresh(job)
        return job

    async def increment_retry(self, job_id: uuid.UUID) -> Job | None:
        job = await self.get_by_id(job_id)
        if not job:
            return None
        job.retry_count += 1
        job.status = JobStatus.RETRYING.value
        job.error_message = None
        await self.db.flush()
        await self.db.refresh(job)
        return job
