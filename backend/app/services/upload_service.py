import uuid
import os
import aiofiles
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.logging import get_logger
from app.repositories.document_repository import DocumentRepository
from app.repositories.job_repository import JobRepository
from app.models.document import Document
from app.models.job import Job

logger = get_logger(__name__)


class UploadService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.doc_repo = DocumentRepository(db)
        self.job_repo = JobRepository(db)

    async def handle_upload(self, file: UploadFile) -> tuple[Document, Job]:
        self._validate_file(file)

        file_id = uuid.uuid4()
        filename = f"{file_id}_{file.filename}"
        storage_path = os.path.join(settings.UPLOAD_DIR, filename)

        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

        # Stream file to disk
        file_size = 0
        async with aiofiles.open(storage_path, "wb") as f:
            while chunk := await file.read(1024 * 64):  # 64KB chunks
                file_size += len(chunk)
                if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                    await f.close()
                    os.remove(storage_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit",
                    )
                await f.write(chunk)

        document = await self.doc_repo.create(
            filename=filename,
            original_name=file.filename,
            file_size=file_size,
            mime_type=file.content_type or "application/octet-stream",
            storage_path=storage_path,
        )

        job = await self.job_repo.create(document_id=document.id)

        logger.info("upload_complete", document_id=str(document.id), job_id=str(job.id))
        return document, job

    def _validate_file(self, file: UploadFile):
        if file.content_type not in settings.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type: {file.content_type}",
            )
