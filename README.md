# StreamLine

An async document processing workflow system. Upload documents, watch them get processed in real time, and export structured results.

![StreamLine Dashboard](public/placeholder.jpg)

---

## What it does

- Upload PDF, DOCX, TXT, JPG, PNG files
- Documents are queued and processed asynchronously via Celery workers
- Real-time progress updates streamed to the browser via WebSockets
- Extracts title, category, summary, keywords, and structured data
- Export results as JSON or CSV
- Retry failed jobs, cancel active ones

---

## Tech Stack

**Frontend**
- Next.js 16 + TypeScript
- Tailwind CSS v4
- Framer Motion
- Recharts
- Radix UI / shadcn

**Backend**
- FastAPI + Uvicorn
- SQLAlchemy 2.0 (async)
- Alembic migrations
- Celery workers
- Redis Pub/Sub → WebSocket streaming
- Pydantic v2

**Infrastructure**
- PostgreSQL — [Neon](https://neon.tech)
- Redis — [Upstash](https://upstash.com)
- Deployed on [Render](https://render.com)

---

## Architecture

```
Browser
  │
  ├── REST API calls ──────────────► FastAPI
  │                                     │
  └── WebSocket ──────────────────►     │
                                        │
                                   PostgreSQL (Neon)
                                        │
                              Celery Task Queued
                                        │
                                   Celery Worker
                                        │
                              ┌─────────┴──────────┐
                              │                    │
                         Parse doc           Redis Pub/Sub
                         Extract data              │
                         Store result        FastAPI WS Manager
                                                   │
                                             Browser (live updates)
```

---

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 16
- Redis

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/streamline.git
cd streamline
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
APP_NAME=StreamLine
DEBUG=true
ENVIRONMENT=development

DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/streamline
DATABASE_SYNC_URL=postgresql+psycopg2://user:pass@localhost:5432/streamline

REDIS_URL=redis://localhost:6379/0
REDIS_PUBSUB_URL=redis://localhost:6379/1
CELERY_BROKER_URL=redis://localhost:6379/2
CELERY_RESULT_BACKEND=redis://localhost:6379/3

UPLOAD_DIR=/tmp/streamline/uploads
MAX_FILE_SIZE_MB=100
```

Run migrations:

```bash
python -m alembic upgrade head
```

Start the API:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Start the worker (new terminal):

```bash
python -m celery -A worker.celery_app.celery_app worker --loglevel=info --concurrency=2
```

### 3. Frontend setup

```bash
# from repo root
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/upload` | Upload a document |
| `GET` | `/api/v1/jobs` | List all jobs |
| `GET` | `/api/v1/jobs/{id}` | Get job status |
| `POST` | `/api/v1/jobs/{id}/retry` | Retry a failed job |
| `POST` | `/api/v1/jobs/{id}/cancel` | Cancel a job |
| `GET` | `/api/v1/documents` | List documents |
| `GET` | `/api/v1/documents/{id}` | Get document |
| `GET` | `/api/v1/documents/{id}/result` | Get extracted result |
| `POST` | `/api/v1/documents/{id}/finalize` | Finalize with reviewed data |
| `GET` | `/api/v1/export/{id}/json` | Export as JSON |
| `GET` | `/api/v1/export/{id}/csv` | Export as CSV |
| `WS` | `/ws/jobs/{id}` | Real-time job progress |
| `GET` | `/health` | Health check |
| `GET` | `/health/ready` | Readiness check |

Interactive docs available at `/docs` when the backend is running.

---

## WebSocket Event Shape

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

## Processing Stages

```
document_received → parsing_started → parsing_completed →
extraction_started → extraction_completed → final_result_stored → job_completed
```

---

## Deployment (Render)

The repo includes a `render.yaml` blueprint. Connect your GitHub repo on [render.com](https://render.com) → New → Blueprint and it will create all 3 services automatically.

**Services:**
- `streamline-backend` — FastAPI web service
- `streamline-worker` — Celery background worker
- `streamline-frontend` — Next.js web service

**Required environment variables** (set in Render dashboard):

| Variable | Where |
|----------|-------|
| `DATABASE_URL` | backend + worker |
| `DATABASE_SYNC_URL` | backend + worker |
| `REDIS_URL` | backend + worker |
| `REDIS_PUBSUB_URL` | backend + worker |
| `CELERY_BROKER_URL` | backend + worker |
| `CELERY_RESULT_BACKEND` | backend + worker |
| `NEXT_PUBLIC_API_URL` | frontend |
| `NEXT_PUBLIC_WS_URL` | frontend |

---

## Project Structure

```
streamline/
├── app/                        # Next.js app
│   └── dashboard/
│       ├── page.tsx            # Dashboard with live stats
│       ├── uploads/            # Upload page
│       ├── jobs/               # Jobs monitor
│       ├── documents/          # Documents list
│       ├── exports/            # Export downloads
│       └── settings/
├── components/                 # React components
├── hooks/                      # Custom hooks incl. useJobSocket
├── lib/
│   ├── api.ts                  # All API calls
│   └── types.ts                # TypeScript types
├── backend/
│   ├── app/
│   │   ├── api/routes/         # FastAPI route handlers
│   │   ├── core/               # Config, DB, Redis, logging
│   │   ├── models/             # SQLAlchemy models
│   │   ├── repositories/       # Data access layer
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   ├── websocket/          # WS connection manager
│   │   └── main.py
│   ├── worker/
│   │   ├── celery_app.py
│   │   ├── tasks/              # Celery task entry points
│   │   ├── pipelines/          # Document processing pipeline
│   │   └── publishers/         # Redis Pub/Sub publisher
│   ├── migrations/             # Alembic migrations
│   └── requirements.txt
├── render.yaml                 # Render deployment blueprint
└── docker-compose.yml          # Local Docker alternative
```

---

## License

MIT
