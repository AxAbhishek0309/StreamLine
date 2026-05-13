#!/usr/bin/env bash
set -e

# Start Celery worker in background
celery -A worker.celery_app.celery_app worker --loglevel=info --concurrency=2 &

# Start FastAPI (foreground — Render watches this process)
uvicorn app.main:app --host 0.0.0.0 --port $PORT
