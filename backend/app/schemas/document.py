import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class DocumentBase(BaseModel):
    original_name: str
    mime_type: str
    file_size: int


class DocumentCreate(DocumentBase):
    filename: str
    storage_path: str


class DocumentUpdate(BaseModel):
    original_name: str | None = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    original_name: str
    file_size: int
    mime_type: str
    storage_path: str
    page_count: int
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int
    pages: int
