import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from enum import Enum


class ExportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"


class ExportRequest(BaseModel):
    format: ExportFormat


class ExtractedResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    title: str | None
    category: str | None
    summary: str | None
    keywords: list[str] | None
    structured_data: dict | None
    reviewed_data: dict | None
    is_finalized: bool
    finalized_at: datetime | None
    created_at: datetime
    updated_at: datetime


class FinalizeRequest(BaseModel):
    reviewed_data: dict
