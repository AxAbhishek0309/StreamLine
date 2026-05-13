import uuid
import math
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_session
from app.repositories.document_repository import DocumentRepository
from app.repositories.result_repository import ResultRepository
from app.schemas.document import DocumentResponse, DocumentListResponse, DocumentUpdate
from app.schemas.export import ExtractedResultResponse, FinalizeRequest

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_session),
):
    repo = DocumentRepository(db)
    docs, total = await repo.list(page=page, page_size=page_size)
    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    repo = DocumentRepository(db)
    doc = await repo.get_by_id(document_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentResponse.model_validate(doc)


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: uuid.UUID,
    body: DocumentUpdate,
    db: AsyncSession = Depends(get_session),
):
    repo = DocumentRepository(db)
    doc = await repo.update(document_id, **body.model_dump(exclude_none=True))
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentResponse.model_validate(doc)


@router.get("/{document_id}/result", response_model=ExtractedResultResponse)
async def get_result(document_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    repo = ResultRepository(db)
    result = await repo.get_by_document_id(document_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not available yet")
    return ExtractedResultResponse.model_validate(result)


@router.post("/{document_id}/finalize", response_model=ExtractedResultResponse)
async def finalize_document(
    document_id: uuid.UUID,
    body: FinalizeRequest,
    db: AsyncSession = Depends(get_session),
):
    repo = ResultRepository(db)
    result = await repo.finalize(document_id, reviewed_data=body.reviewed_data)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")
    return ExtractedResultResponse.model_validate(result)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: uuid.UUID, db: AsyncSession = Depends(get_session)):
    repo = DocumentRepository(db)
    deleted = await repo.delete(document_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
