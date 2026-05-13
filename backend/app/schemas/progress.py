import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.job import JobStatus, JobStage


class ProgressEvent(BaseModel):
    job_id: str
    document_id: str
    status: JobStatus
    progress: float = Field(ge=0.0, le=100.0)
    stage: JobStage
    message: str
    timestamp: str

    @classmethod
    def create(
        cls,
        job_id: uuid.UUID,
        document_id: uuid.UUID,
        status: JobStatus,
        progress: float,
        stage: JobStage,
        message: str,
    ) -> "ProgressEvent":
        return cls(
            job_id=str(job_id),
            document_id=str(document_id),
            status=status,
            progress=progress,
            stage=stage,
            message=message,
            timestamp=datetime.utcnow().isoformat() + "Z",
        )
