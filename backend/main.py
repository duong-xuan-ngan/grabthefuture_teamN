from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db_and_tables
from app.routes import reports, hotspots, trucks, tasks, routing, dashboard, auth, bins, zones, admin
from app.routes import routes as routes_router
from app.dependencies.auth import require_roles

# Role guards (no-ops unless AUTH_REQUIRED=true). Dispatcher views also admit
# admin (added automatically); driver routes admit driver + dispatcher + admin.
dispatcher_guard = Depends(require_roles("dispatcher"))
driver_guard = Depends(require_roles("driver", "dispatcher"))


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

# Resident QR endpoints are public by design (NFR-08).
app.include_router(reports.router,   prefix="/api/reports",   tags=["reports"])
app.include_router(bins.router,      prefix="/api/bins",      tags=["bins"])
app.include_router(zones.router,     prefix="/api/zones",     tags=["zones"],     dependencies=[dispatcher_guard])
app.include_router(routes_router.router, prefix="/api/routes", tags=["routes"],   dependencies=[dispatcher_guard])
app.include_router(admin.router,     prefix="/api/admin",     tags=["admin"],     dependencies=[Depends(require_roles("admin", "dispatcher"))])
app.include_router(auth.router,      prefix="/api/auth",      tags=["auth"])

# Dispatcher / admin views.
app.include_router(hotspots.router,  prefix="/api/hotspots",  tags=["hotspots"],  dependencies=[dispatcher_guard])
app.include_router(routing.router,   prefix="/api/routing",   tags=["routing"],   dependencies=[dispatcher_guard])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"], dependencies=[dispatcher_guard])

# Trucks + tasks are read/updated by both dispatcher and driver apps.
app.include_router(trucks.router,    prefix="/api/trucks",    tags=["trucks"],    dependencies=[driver_guard])
app.include_router(tasks.router,     prefix="/api/tasks",     tags=["tasks"],     dependencies=[driver_guard])


@app.get("/health")
def health():
    return {"status": "ok"}
