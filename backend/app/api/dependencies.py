from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from fastapi import Depends
from app.core.database import get_db
from app.core.redis import get_redis, get_pubsub_redis


async def get_session(db: AsyncSession = Depends(get_db)) -> AsyncSession:
    return db


async def get_redis_client(redis: Redis = Depends(get_redis)) -> Redis:
    return redis


async def get_pubsub_client(redis: Redis = Depends(get_pubsub_redis)) -> Redis:
    return redis
