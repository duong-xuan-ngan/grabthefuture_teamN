# src/main.py
# BE Dev 1 owns this file.

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.db.pool import get_pool, close_pool
from src.routes import reports, routes, dashboard, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB pool on startup; close it on shutdown."""
    await get_pool()
    yield
    await close_pool()


app = FastAPI(
    title="WasteFlow API",
    version="1.0.0",
    description="Smart waste collection optimization platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(reports.router,   prefix="/api/v1")
app.include_router(routes.router,    prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(auth.router,      prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
