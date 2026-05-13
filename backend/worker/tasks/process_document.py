import uuid
from celery import Task
from worker.celery_app import celery_app
from worker.pipelines.document_pipeline import run as run_pipeline
from worker.publishers.redis_publisher import publish_progress
from app.schemas.progress import ProgressEvent
from app.models.job import JobStatus, JobStage
from app.core.logging import get_logger

logger = get_logger(__name__)


class ProcessDocumentTask(Task):
    """Custom Task base with structured error handling."""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        document_id, job_id = args[0], args[1]
        logger.error("task_failed", task_id=task_id, job_id=job_id, error=str(exc))

        # Publish failure event so WebSocket clients get notified
        try:
            event = ProgressEvent.create(
                job_id=uuid.UUID(job_id),
                document_id=uuid.UUID(document_id),
                status=JobStatus.FAILED,
                progress=0.0,
                stage=JobStage.JOB_FAILED,
                message=f"Processing failed: {str(exc)[:200]}",
            )
            publish_progress(event)
        except Exception:
            pass

        # Persist failure to DB
        try:
            from sqlalchemy import create_engine, text
            from sqlalchemy.orm import sessionmaker
            from app.core.config import settings

            engine = create_engine(settings.DATABASE_SYNC_URL)
            Session = sessionmaker(bind=engine)
            with Session() as session:
                session.execute(
                    text("UPDATE jobs SET status = 'failed', current_stage = 'job_failed', error_message = :msg WHERE id = cast(:id as uuid)"),
                    {"msg": str(exc)[:1000], "id": job_id}
                )
                session.commit()
        except Exception as db_err:
            logger.error("failed_to_persist_failure", error=str(db_err))


@celery_app.task(
    bind=True,
    base=ProcessDocumentTask,
    name="worker.tasks.process_document",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def process_document_task(self: Task, document_id: str, job_id: str):
    """
    Main Celery task for async document processing.
    Delegates all logic to the pipeline — this task is purely the entry point.
    """
    logger.info("task_started", task_id=self.request.id, document_id=document_id, job_id=job_id)
    try:
        run_pipeline(document_id, job_id)
    except Exception as exc:
        logger.error("task_error", document_id=document_id, job_id=job_id, error=str(exc))
        raise self.retry(exc=exc, countdown=30)
