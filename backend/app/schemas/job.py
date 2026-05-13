import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.job import JobStatus, JobStage


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    status: JobStatus
    progress: float
    current_stage: JobStage | None
    error_message: str | None
    retry_count: int
    celery_task_id: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime


class JobListResponse(BaseModel):
    items: list[JobResponse]
    total: int
    page: int
    page_size: int
    pages: int


class JobRetryResponse(BaseModel):
    job_id: uuid.UUID
    message: str
