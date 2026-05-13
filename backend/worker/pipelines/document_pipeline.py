"""
Multi-stage document processing pipeline.

Stages and progress mapping:
  document_received       →  5%
  parsing_started         → 15%
  parsing_completed       → 40%
  extraction_started      → 50%
  extraction_completed    → 85%
  final_result_stored     → 95%
  job_completed           → 100%
"""
import os
import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.job import JobStatus, JobStage
from app.schemas.progress import ProgressEvent
from worker.publishers.redis_publisher import publish_progress
from app.core.logging import get_logger

logger = get_logger(__name__)

# Synchronous SQLAlchemy engine for Celery workers
_sync_engine = create_engine(settings.DATABASE_SYNC_URL, pool_pre_ping=True)
SyncSession = sessionmaker(bind=_sync_engine, expire_on_commit=False)


def _emit(job_id: str, document_id: str, status: JobStatus, progress: float, stage: JobStage, message: str):
    event = ProgressEvent.create(
        job_id=uuid.UUID(job_id),
        document_id=uuid.UUID(document_id),
        status=status,
        progress=progress,
        stage=stage,
        message=message,
    )
    publish_progress(event)


def _update_job(session: Session, job_id: uuid.UUID, **kwargs):
    """Update job using raw SQL. Uses SQLAlchemy :param style."""
    from sqlalchemy import text
    sets = []
    params: dict = {}
    for k, v in kwargs.items():
        val = v.value if hasattr(v, 'value') else v
        sets.append(f"{k} = :{k}")
        params[k] = val
    if not sets:
        return
    # Use cast() function instead of :: to avoid conflict with :param syntax
    params["job_id"] = str(job_id)
    sql = f"UPDATE jobs SET {', '.join(sets)} WHERE id = cast(:job_id as uuid)"
    session.execute(text(sql), params)
    session.commit()


def run(document_id: str, job_id: str):
    job_uuid = uuid.UUID(job_id)
    doc_uuid = uuid.UUID(document_id)

    with SyncSession() as session:
        from app.models.document import Document
        from app.models.extracted_result import ExtractedResult

        # ── Stage 1: document_received ──────────────────────────────────────
        _emit(job_id, document_id, JobStatus.PROCESSING, 5.0, JobStage.DOCUMENT_RECEIVED, "Document received")
        _update_job(session, job_uuid,
                    status=JobStatus.PROCESSING,
                    current_stage=JobStage.DOCUMENT_RECEIVED,
                    progress=5.0,
                    started_at=datetime.now(timezone.utc))

        doc = session.get(Document, doc_uuid)
        if not doc:
            raise ValueError(f"Document {document_id} not found")

        # ── Stage 2: parsing_started ────────────────────────────────────────
        _emit(job_id, document_id, JobStatus.PROCESSING, 15.0, JobStage.PARSING_STARTED, "Parsing document")
        _update_job(session, job_uuid, current_stage=JobStage.PARSING_STARTED, progress=15.0)

        raw_text, page_count = _parse_document(doc.storage_path, doc.mime_type)

        # ── Stage 3: parsing_completed ──────────────────────────────────────
        _emit(job_id, document_id, JobStatus.PROCESSING, 40.0, JobStage.PARSING_COMPLETED,
              f"Parsed {page_count} page(s)")
        _update_job(session, job_uuid, current_stage=JobStage.PARSING_COMPLETED, progress=40.0)

        # Update page count on document
        from sqlalchemy import text as sqlt
        session.execute(sqlt("UPDATE documents SET page_count = :pc WHERE id = cast(:id as uuid)"),
                        {"pc": page_count, "id": str(doc_uuid)})
        session.commit()

        # ── Stage 4: extraction_started ─────────────────────────────────────
        _emit(job_id, document_id, JobStatus.PROCESSING, 50.0, JobStage.EXTRACTION_STARTED,
              "Extracting structured data")
        _update_job(session, job_uuid, current_stage=JobStage.EXTRACTION_STARTED, progress=50.0)

        extracted = _extract(raw_text, doc.original_name, doc.mime_type, doc.file_size)

        # ── Stage 5: extraction_completed ───────────────────────────────────
        _emit(job_id, document_id, JobStatus.PROCESSING, 85.0, JobStage.EXTRACTION_COMPLETED,
              "Extraction complete")
        _update_job(session, job_uuid, current_stage=JobStage.EXTRACTION_COMPLETED, progress=85.0)

        # ── Stage 6: final_result_stored ────────────────────────────────────
        _emit(job_id, document_id, JobStatus.PROCESSING, 95.0, JobStage.FINAL_RESULT_STORED,
              "Storing results")
        _update_job(session, job_uuid, current_stage=JobStage.FINAL_RESULT_STORED, progress=95.0)

        # Upsert extracted result using raw SQL to avoid ORM enum issues
        from sqlalchemy import text as sqlt
        import json as _json
        session.execute(sqlt("""
            INSERT INTO extracted_results
                (id, document_id, title, category, summary, raw_text, keywords, structured_data, is_finalized)
            VALUES
                (gen_random_uuid(), cast(:doc_id as uuid), :title, :category, :summary, :raw_text,
                 cast(:keywords as jsonb), cast(:structured_data as jsonb), false)
            ON CONFLICT (document_id) DO UPDATE SET
                title = EXCLUDED.title,
                category = EXCLUDED.category,
                summary = EXCLUDED.summary,
                raw_text = EXCLUDED.raw_text,
                keywords = EXCLUDED.keywords,
                structured_data = EXCLUDED.structured_data,
                updated_at = now()
        """), {
            "doc_id": str(doc_uuid),
            "title": extracted["title"],
            "category": extracted["category"],
            "summary": extracted["summary"],
            "raw_text": extracted["raw_text"],
            "keywords": _json.dumps(extracted["keywords"]),
            "structured_data": _json.dumps(extracted["structured_data"]),
        })
        session.commit()

        # ── Stage 7: job_completed ───────────────────────────────────────────
        _emit(job_id, document_id, JobStatus.COMPLETED, 100.0, JobStage.JOB_COMPLETED,
              "Processing complete")
        _update_job(session, job_uuid,
                    status=JobStatus.COMPLETED,
                    current_stage=JobStage.JOB_COMPLETED,
                    progress=100.0,
                    completed_at=datetime.now(timezone.utc))

        logger.info("pipeline_complete", job_id=job_id, document_id=document_id)


# ── Parsers ──────────────────────────────────────────────────────────────────

def _parse_document(storage_path: str, mime_type: str) -> tuple[str, int]:
    """Extract raw text and page count from a document."""
    if not os.path.exists(storage_path):
        raise FileNotFoundError(f"File not found: {storage_path}")

    if mime_type == "application/pdf":
        return _parse_pdf(storage_path)
    elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return _parse_docx(storage_path)
    elif mime_type == "text/plain":
        return _parse_txt(storage_path)
    else:
        # For images and unsupported types, return metadata-only text
        size_kb = os.path.getsize(storage_path) // 1024
        return f"[Binary file: {mime_type}, {size_kb}KB]", 1


def _parse_pdf(path: str) -> tuple[str, int]:
    try:
        import PyPDF2
        with open(path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            pages = len(reader.pages)
            text = "\n".join(
                page.extract_text() or "" for page in reader.pages
            )
        return text, pages
    except Exception as e:
        logger.warning("pdf_parse_error", path=path, error=str(e))
        return "", 0


def _parse_docx(path: str) -> tuple[str, int]:
    try:
        from docx import Document as DocxDocument
        doc = DocxDocument(path)
        text = "\n".join(p.text for p in doc.paragraphs)
        # Approximate page count: ~500 words per page
        word_count = len(text.split())
        pages = max(1, word_count // 500)
        return text, pages
    except Exception as e:
        logger.warning("docx_parse_error", path=path, error=str(e))
        return "", 0


def _parse_txt(path: str) -> tuple[str, int]:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        word_count = len(text.split())
        pages = max(1, word_count // 500)
        return text, pages
    except Exception as e:
        logger.warning("txt_parse_error", path=path, error=str(e))
        return "", 0


# ── Extractor ─────────────────────────────────────────────────────────────────

def _extract(raw_text: str, original_name: str, mime_type: str, file_size: int) -> dict:
    """Extract structured metadata from raw text."""
    words = raw_text.split()
    word_count = len(words)

    title = _infer_title(raw_text, original_name)
    category = _infer_category(raw_text, original_name, mime_type)
    summary = _generate_summary(raw_text)
    keywords = _extract_keywords(raw_text)

    structured_data = {
        "word_count": word_count,
        "char_count": len(raw_text),
        "file_size_bytes": file_size,
        "mime_type": mime_type,
        "original_filename": original_name,
        "has_content": word_count > 0,
    }

    return {
        "title": title,
        "category": category,
        "summary": summary,
        "raw_text": raw_text[:10000],  # Store first 10k chars
        "keywords": keywords,
        "structured_data": structured_data,
    }


def _infer_title(text: str, filename: str) -> str:
    # Use first non-empty line if it looks like a title
    for line in text.splitlines():
        line = line.strip()
        if 5 < len(line) < 120 and not line.startswith("["):
            return line
    # Fall back to filename without extension
    return os.path.splitext(filename)[0].replace("_", " ").replace("-", " ").title()


def _infer_category(text: str, filename: str, mime_type: str) -> str:
    combined = (text[:2000] + filename).lower()
    categories = {
        "invoice": ["invoice", "billing", "payment", "amount due", "total"],
        "contract": ["contract", "agreement", "terms", "parties", "clause"],
        "report": ["report", "analysis", "summary", "findings", "quarterly"],
        "form": ["form", "application", "fill", "signature", "date of birth"],
        "image": ["image/jpeg", "image/png"],
    }
    for category, signals in categories.items():
        if any(s in combined for s in signals):
            return category
    return "document"


def _generate_summary(text: str) -> str:
    if not text.strip():
        return "No text content could be extracted from this document."
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
    return " ".join(sentences[:3]) if sentences else text[:300]


def _extract_keywords(text: str) -> list[str]:
    if not text:
        return []
    # Simple frequency-based keyword extraction
    stop_words = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "this", "that", "these", "those", "it", "its",
    }
    words = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
    freq: dict[str, int] = {}
    for w in words:
        if w not in stop_words:
            freq[w] = freq.get(w, 0) + 1
    sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [w for w, _ in sorted_words[:15]]
