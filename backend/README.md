# StreamLine — Backend

Async document processing workflow system.

## Architecture

```
Upload → FastAPI → PostgreSQL + Celery task queued
                              ↓
                    Celery Worker processes document
                              ↓
                    Redis Pub/Sub publishes progress events
                              ↓
                    FastAPI WebSocket streams to frontend
```

## Stack

| Layer | Technology |
|---|---|
| API | FastAPI + Uvicorn |
| Workers | Celery |
| Message broker | Redis |
| Realtime | Redis Pub/Sub → WebSocket |
| Database | PostgreSQL + SQLAlchemy 2.0 |
| Migrations | Alembic |
| Validation | Pydantic v2 |

## Running locally (Docker)

```bash
docker compose up --build
```

This starts: postgres, redis, backend, celery_worker, frontend, and runs migrations.

## API

| Method | Path | Description |
|---|---|---|
| POST | /api/v1/upload | Upload document, returns job immediately |
| GET | /api/v1/jobs | List all jobs |
| GET | /api/v1/jobs/{id} | Get job status |
| POST | /api/v1/jobs/{id}/retry | Retry failed job |
| POST | /api/v1/jobs/{id}/cancel | Cancel job |
| GET | /api/v1/documents | List documents |
| GET | /api/v1/documents/{id} | Get document |
| PATCH | /api/v1/documents/{id} | Update document |
| GET | /api/v1/documents/{id}/result | Get extracted result |
| POST | /api/v1/documents/{id}/finalize | Finalize with reviewed data |
| GET | /api/v1/export/{id}/json | Export as JSON |
| GET | /api/v1/export/{id}/csv | Export as CSV |
| WS | /ws/jobs/{id} | Real-time job progress |
| GET | /health | Health check |
| GET | /health/ready | Readiness check (DB + Redis) |

## WebSocket event shape

```json
{
  "job_id": "uuid",
  "document_id": "uuid",
  "status": "processing",
  "progress": 50.0,
  "stage": "extraction_started",
  "message": "Extracting structured data",
  "timestamp": "2026-05-11T10:00:00Z"
}
```

## Processing stages

`document_received` → `parsing_started` → `parsing_completed` → `extraction_started` → `extraction_completed` → `final_result_stored` → `job_completed`
