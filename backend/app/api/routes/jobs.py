import uuid
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_session
from app.repositories.job_repository import JobRepository
from app.services.retry_service import RetryService
from app.schemas.job import JobResponse, JobListResponse, JobRetryResponse
from app.models.job import JobStatus
import math

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=JobListResponse)
async def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    status: JobStatus | None = Query(None),
    db: AsyncSession = Depends(get_session),
):
    repo = JobRepository(db)
    jobs, total = await repo.list(page=page, page_size=page_size, status=status)
    return JobListResponse(
        items=[JobResponse.model_validate(j) for j in jobs],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    repo = JobRepository(db)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return JobResponse.model_validate(job)


@router.post("/{job_id}/retry", response_model=JobRetryResponse)
async def retry_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    svc = RetryService(db)
    result = await svc.retry_job(job_id)
    return JobRetryResponse(job_id=result["job_id"], message=result["message"])


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    repo = JobRepository(db)
    job = await repo.get_by_id(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.status not in (JobStatus.PENDING, JobStatus.PROCESSING, JobStatus.RETRYING):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel job in status: {job.status}",
        )
    # Revoke Celery task if we have the ID
    if job.celery_task_id:
        from worker.celery_app import celery_app
        celery_app.control.revoke(job.celery_task_id, terminate=True)

    from app.models.job import JobStatus as JS
    updated = await repo.update_status(job_id, status=JS.CANCELLED)
    return JobResponse.model_validate(updated)
