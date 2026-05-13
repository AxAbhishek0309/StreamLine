import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.document import Document


class DocumentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs) -> Document:
        doc = Document(**kwargs)
        self.db.add(doc)
        await self.db.flush()
        await self.db.refresh(doc)
        return doc

    async def get_by_id(self, doc_id: uuid.UUID) -> Document | None:
        result = await self.db.execute(select(Document).where(Document.id == doc_id))
        return result.scalar_one_or_none()

    async def list(self, page: int = 1, page_size: int = 20) -> tuple[list[Document], int]:
        offset = (page - 1) * page_size
        count_result = await self.db.execute(select(func.count()).select_from(Document))
        total = count_result.scalar_one()
        result = await self.db.execute(
            select(Document).order_by(Document.created_at.desc()).offset(offset).limit(page_size)
        )
        return result.scalars().all(), total

    async def update(self, doc_id: uuid.UUID, **kwargs) -> Document | None:
        doc = await self.get_by_id(doc_id)
        if not doc:
            return None
        for key, value in kwargs.items():
            setattr(doc, key, value)
        await self.db.flush()
        await self.db.refresh(doc)
        return doc

    async def delete(self, doc_id: uuid.UUID) -> bool:
        doc = await self.get_by_id(doc_id)
        if not doc:
            return False
        await self.db.delete(doc)
        await self.db.flush()
        return True
