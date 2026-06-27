# src/db/pool.py
# BE Dev 2 owns this file.

import asyncpg
from src.config import settings

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Return the shared connection pool, creating it on first call."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=2,
            max_size=10,
        )
    return _pool


async def close_pool() -> None:
    """Close the pool gracefully on app shutdown."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
