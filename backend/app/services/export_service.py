import csv
import io
import json
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.result_repository import ResultRepository
from app.repositories.document_repository import DocumentRepository


class ExportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.result_repo = ResultRepository(db)
        self.doc_repo = DocumentRepository(db)

    async def export_json(self, document_id_str: str) -> dict:
        doc_id = uuid.UUID(document_id_str)
        doc = await self.doc_repo.get_by_id(doc_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

        result = await self.result_repo.get_by_document_id(doc_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Processing result not available yet — wait for the job to complete"
            )

        return {
            "document": {
                "id": str(doc.id),
                "original_name": doc.original_name,
                "file_size": doc.file_size,
                "mime_type": doc.mime_type,
                "page_count": doc.page_count,
                "created_at": doc.created_at.isoformat(),
            },
            "extraction": {
                "title": result.title,
                "category": result.category,
                "summary": result.summary,
                "keywords": result.keywords,
                "structured_data": result.structured_data,
                "reviewed_data": result.reviewed_data,
                "is_finalized": result.is_finalized,
                "finalized_at": result.finalized_at.isoformat() if result.finalized_at else None,
            },
        }

    async def export_csv(self, document_id_str: str) -> str:
        doc_id = uuid.UUID(document_id_str)
        doc = await self.doc_repo.get_by_id(doc_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

        result = await self.result_repo.get_by_document_id(doc_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Processing result not available yet — wait for the job to complete"
            )

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["field", "value"])
        writer.writerow(["document_id", str(doc.id)])
        writer.writerow(["original_name", doc.original_name])
        writer.writerow(["file_size_bytes", doc.file_size])
        writer.writerow(["mime_type", doc.mime_type])
        writer.writerow(["page_count", doc.page_count])
        writer.writerow(["title", result.title or ""])
        writer.writerow(["category", result.category or ""])
        writer.writerow(["summary", result.summary or ""])
        writer.writerow(["keywords", json.dumps(result.keywords or [])])

        # Structured data fields
        for key, value in (result.structured_data or {}).items():
            writer.writerow([key, str(value)])

        # Reviewed/finalized overrides if present
        for key, value in (result.reviewed_data or {}).items():
            writer.writerow([f"reviewed_{key}", str(value)])

        return output.getvalue()
