import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.extracted_result import ExtractedResult


class ResultRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, document_id: uuid.UUID, **kwargs) -> ExtractedResult:
        result = ExtractedResult(document_id=document_id, **kwargs)
        self.db.add(result)
        await self.db.flush()
        await self.db.refresh(result)
        return result

    async def get_by_document_id(self, document_id: uuid.UUID) -> ExtractedResult | None:
        result = await self.db.execute(
            select(ExtractedResult).where(ExtractedResult.document_id == document_id)
        )
        return result.scalar_one_or_none()

    async def update(self, document_id: uuid.UUID, **kwargs) -> ExtractedResult | None:
        record = await self.get_by_document_id(document_id)
        if not record:
            return None
        for key, value in kwargs.items():
            setattr(record, key, value)
        await self.db.flush()
        await self.db.refresh(record)
        return record

    async def finalize(self, document_id: uuid.UUID, reviewed_data: dict) -> ExtractedResult | None:
        record = await self.get_by_document_id(document_id)
        if not record:
            return None
        record.reviewed_data = reviewed_data
        record.is_finalized = True
        record.finalized_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(record)
        return record
