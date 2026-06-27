from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db_and_tables
from app.routes import reports, hotspots, trucks, tasks, routing, dashboard, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="WasteHotspot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports.router,   prefix="/api/reports",   tags=["reports"])
app.include_router(hotspots.router,  prefix="/api/hotspots",  tags=["hotspots"])
app.include_router(trucks.router,    prefix="/api/trucks",    tags=["trucks"])
app.include_router(tasks.router,     prefix="/api/tasks",     tags=["tasks"])
app.include_router(routing.router,   prefix="/api/routing",   tags=["routing"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(auth.router,      prefix="/api/auth",      tags=["auth"])


@app.get("/health")
def health():
    return {"status": "ok"}
