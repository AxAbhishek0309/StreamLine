from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_session
from app.services.upload_service import UploadService
from app.services.processing_service import ProcessingService
from app.schemas.document import DocumentResponse
from app.schemas.job import JobResponse

router = APIRouter(prefix="/upload", tags=["upload"])


class UploadResult:
    def __init__(self, document: DocumentResponse, job: JobResponse, task_id: str):
        self.document = document
        self.job = job
        self.task_id = task_id


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    """
    Upload a document. Returns immediately after queuing the processing job.
    Processing happens asynchronously via Celery.
    """
    upload_svc = UploadService(db)
    document, job = await upload_svc.handle_upload(file)

    processing_svc = ProcessingService(db)
    task_id = await processing_svc.dispatch(document.id, job.id)

    return {
        "document": DocumentResponse.model_validate(document),
        "job": JobResponse.model_validate(job),
        "task_id": task_id,
        "message": "Document uploaded and queued for processing",
    }
