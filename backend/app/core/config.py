from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "StreamLine"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://streamline:streamline@postgres:5432/streamline"
    DATABASE_SYNC_URL: str = "postgresql+psycopg2://streamline:streamline@postgres:5432/streamline"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    REDIS_PUBSUB_URL: str = "redis://redis:6379/1"

    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/2"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/3"

    # File storage
    UPLOAD_DIR: str = "/tmp/streamline/uploads"
    MAX_FILE_SIZE_MB: int = 100
    ALLOWED_MIME_TYPES: list[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "image/jpeg",
        "image/png",
    ]

    # CORS — allow all origins in dev, lock down in production
    CORS_ORIGINS: list[str] = ["*"]

    # Celery task settings
    TASK_MAX_RETRIES: int = 3
    TASK_RETRY_BACKOFF: int = 60  # seconds


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
