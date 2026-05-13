from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_session
from app.services.export_service import ExportService

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/{document_id}/json")
async def export_json(document_id: str, db: AsyncSession = Depends(get_session)):
    svc = ExportService(db)
    data = await svc.export_json(document_id)
    return JSONResponse(content=data, headers={
        "Content-Disposition": f'attachment; filename="export_{document_id}.json"'
    })


@router.get("/{document_id}/csv")
async def export_csv(document_id: str, db: AsyncSession = Depends(get_session)):
    svc = ExportService(db)
    csv_content = await svc.export_csv(document_id)
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="export_{document_id}.csv"'
        },
    )
