# 🔧 Backend — WasteFlow API & Optimization Engine

**Owners:** Backend Dev 1 (API Routes) · Backend Dev 2 (Core Engine)  
**Stack:** Python 3.11 · FastAPI · PostgreSQL · PostGIS · asyncpg · Pydantic v2

---

## Folder Structure

```
backend/
├── src/
│   ├── main.py           → FastAPI app entry point, router registration
│   ├── config.py         → Settings loaded from .env via pydantic-settings
│   ├── routes/           → APIRouter files, one per domain (BE Dev 1)
│   ├── services/         → Business logic called by routes (shared)
│   ├── models/           → Pydantic schemas (request/response) + DB query functions
│   ├── middleware/       → Auth dependency, error handlers (BE Dev 1)
│   ├── optimizer/        → Clustering + route insertion logic (BE Dev 2)
│   ├── db/               → DB connection pool, migrations, seed data (BE Dev 2)
│   └── utils/            → Shared helpers: CO₂ calc, geo utils
├── tests/                → pytest test files
├── requirements.txt      → Python dependencies
├── .env.example          → Environment variable template
└── README.md             → This file
```

---

## Ownership Split

| Folder / File | Owner | Description |
|---------------|-------|-------------|
| `src/routes/` | **BE Dev 1** | All FastAPI router files |
| `src/middleware/` | **BE Dev 1** | JWT auth dependency, error handlers |
| `src/config.py` | **BE Dev 1** | Pydantic settings model |
| `src/main.py` | **BE Dev 1** | App init + router registration |
| `src/services/` | **Shared** | Business logic (routes call services) |
| `src/optimizer/` | **BE Dev 2** | Clustering algorithm, priority scoring, route insertion |
| `src/models/` | **BE Dev 2** | Pydantic schemas + DB query helpers |
| `src/db/` | **BE Dev 2** | asyncpg pool, migrations, seed SQL |
| `src/utils/` | **Shared** | CO₂ calculator, geo distance helpers |

---

## Architecture

```
HTTP Request
    ↓
FastAPI Router (src/routes/)
    ↓
Auth Dependency (src/middleware/auth.py)
    ↓
Service Layer (src/services/)
    ↓
Model / DB Layer (src/models/ + src/db/)  ←→  PostgreSQL + PostGIS
    ↓ (on new report)
Optimizer (src/optimizer/)   ← clustering + route update
```

**Key rule:** Routes never contain business logic. Routes call services. Services call DB functions.

---

## API Endpoints to Implement

All endpoints are prefixed `/api/v1`.

### Reports — `src/routes/reports.py` (BE Dev 1)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/reports` | None | Submit waste report |
| `GET` | `/reports` | Manager | List reports (filterable by status, severity, date) |
| `GET` | `/reports/{id}` | Manager | Single report detail |
| `PATCH` | `/reports/{id}/status` | Crew / Manager | Update status |

### Routes & Clusters — `src/routes/routes.py` (BE Dev 1)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/clusters` | Manager | List active clusters with priority scores |
| `GET` | `/routes/{id}` | Crew / Manager | Full route with ordered stops |
| `POST` | `/routes/{id}/optimize` | Manager | Trigger re-optimization |
| `POST` | `/routes/{id}/stops/{stop_id}/checkin` | Crew | Record crew check-in |

### Dashboard — `src/routes/dashboard.py` (BE Dev 1)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/dashboard/metrics` | Manager | KPI aggregates |
| `GET` | `/dashboard/map` | Manager | All cluster pins for map |
| `GET` | `/dashboard/export` | Manager | CSV report export (StreamingResponse) |

### Auth — `src/routes/auth.py` (BE Dev 1)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | None | Email + password → JWT |
| `GET` | `/auth/me` | Any | Validate current token, return user info |

---

## Pydantic Schemas — BE Dev 2

Define all request/response models in `src/models/schemas.py`.

```python
# src/models/schemas.py (skeleton)
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional
from enum import Enum

class IssueType(str, Enum):
    overflow      = "overflow"
    bulky         = "bulky"
    contamination = "contamination"
    odor          = "odor"
    illegal_dump  = "illegal_dump"

class Severity(str, Enum):
    low    = "low"
    medium = "medium"
    high   = "high"

class ReportStatus(str, Enum):
    pending     = "pending"
    assigned    = "assigned"
    in_progress = "in_progress"
    completed   = "completed"

class LocationIn(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)

class ReportCreate(BaseModel):
    issue_type:   IssueType
    severity:     Severity
    location:     LocationIn
    description:  Optional[str] = Field(None, max_length=300)
    contact_info: Optional[str] = None

class ReportOut(BaseModel):
    id:           UUID
    issue_type:   IssueType
    severity:     Severity
    status:       ReportStatus
    photo_url:    Optional[str]
    submitted_at: datetime

    model_config = {"from_attributes": True}
```

---

## Database Schema — BE Dev 2

Schema lives in `src/db/001_init.sql`. Run once to initialise.

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,           -- bcrypt hash
  role       VARCHAR(16) NOT NULL CHECK (role IN ('manager', 'crew')),
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clusters (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centroid       GEOGRAPHY(POINT, 4326) NOT NULL,
  priority_score FLOAT DEFAULT 0,
  report_count   INT DEFAULT 0,
  status         VARCHAR(16) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'resolved')),
  route_id       UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type   VARCHAR(32) NOT NULL,
  severity     VARCHAR(8)  NOT NULL,
  location     GEOGRAPHY(POINT, 4326) NOT NULL,
  photo_url    TEXT,
  description  TEXT,
  status       VARCHAR(16) DEFAULT 'pending',
  cluster_id   UUID REFERENCES clusters(id) ON DELETE SET NULL,
  contact_info TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE routes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id      UUID REFERENCES users(id),
  shift_date   DATE NOT NULL,
  stops        JSONB DEFAULT '[]',
  distance_km  FLOAT DEFAULT 0,
  baseline_km  FLOAT DEFAULT 0,
  status       VARCHAR(16) DEFAULT 'planned',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clusters ADD CONSTRAINT fk_cluster_route
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL;

CREATE INDEX idx_reports_location  ON reports  USING GIST (location);
CREATE INDEX idx_clusters_centroid ON clusters USING GIST (centroid);
```

---

## Clustering & Optimization Logic — BE Dev 2

### Clustering (`src/optimizer/cluster.py`)

```
Input:  all reports with status = 'pending'
Steps:
  1. Fetch pending reports from DB (with ST_AsGeoJSON on location)
  2. Group by ST_DWithin(location, other.location, 200)   ← 200 m radius
  3. Further filter: reports within same 4-hour window
  4. Compute centroid per group: ST_Centroid(ST_Collect(locations))
  5. Score:
       severity_weight = {high: 3, medium: 2, low: 1}
       time_factor     = hours_since_oldest_report / 4   (capped at 3)
       priority_score  = sum(severity_weight) × time_factor
  6. Upsert clusters, set report.cluster_id FK
```

### Route Insertion (`src/optimizer/router.py`)

```
Input:  updated clusters + active routes
Steps:
  1. Filter clusters: priority_score >= HIGH_PRIORITY_THRESHOLD (default 6)
     AND status = 'open' (not yet assigned)
  2. For each qualifying cluster:
       a. Find nearest active route by centroid ↔ route stops distance
       b. Try inserting cluster between every pair of consecutive stops
       c. Pick insertion point with minimum added distance (nearest-neighbor)
       d. Update route.stops JSONB: insert new stop, renumber seq
       e. Recalculate route.distance_km
  3. Persist updated routes to DB
  4. Mark cluster.status = 'assigned', set cluster.route_id
```

### CO₂ Calculation (`src/utils/co2.py`)

```
CO2_FACTOR = 0.21 kg/km  (diesel urban waste truck — configurable)
saved_km    = baseline_km - optimized_km
co2_saved   = saved_km × CO2_FACTOR
```

Always return `"co2_label": "estimated"` alongside the figure in API responses.

---

## FastAPI Conventions (BE Dev 1)

### Dependency Injection for Auth

```python
# src/middleware/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*roles: str):
    async def dependency(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dependency
```

### Route File Pattern

```python
# src/routes/reports.py (pattern to follow for all routers)
from fastapi import APIRouter, Depends
from src.middleware.auth import require_role
from src.models.schemas import ReportCreate, ReportOut
from src.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/", response_model=ReportOut, status_code=201)
async def submit_report(body: ReportCreate):
    return await report_service.create_report(body)

@router.get("/", response_model=list[ReportOut])
async def list_reports(
    status: str | None = None,
    _user=Depends(require_role("manager")),
):
    return await report_service.get_reports(status=status)
```

### App Entry Point Pattern

```python
# src/main.py
from fastapi import FastAPI
from src.routes import reports, routes, dashboard, auth

app = FastAPI(title="WasteFlow API", version="1.0.0")

app.include_router(reports.router,   prefix="/api/v1")
app.include_router(routes.router,    prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(auth.router,      prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

## DB Connection Pattern — BE Dev 2

Use **asyncpg** for async PostgreSQL. Initialize the pool at startup via FastAPI lifespan.

```python
# src/db/pool.py
import asyncpg
from contextlib import asynccontextmanager
from src.config import settings

_pool: asyncpg.Pool | None = None

async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(settings.database_url)
    return _pool

# FastAPI lifespan usage in main.py:
# @asynccontextmanager
# async def lifespan(app):
#     await get_pool()      # connect on startup
#     yield
#     await _pool.close()   # disconnect on shutdown
```

---

## Environment Variables

Copy `.env.example` → `.env`:

```env
PORT=4000
DATABASE_URL=postgresql://wasteflow:wasteflow@postgres:5432/wasteflow
JWT_SECRET=change_me_before_demo
JWT_EXPIRE_HOURS=8

CO2_FACTOR_KG_PER_KM=0.21
CLUSTER_RADIUS_METERS=200
CLUSTER_TIME_WINDOW_HOURS=4
HIGH_PRIORITY_THRESHOLD=6
CLUSTER_RERUN_INTERVAL_SECONDS=900
```

---

## Coding Conventions

- **Async everywhere** — all route handlers and service functions are `async def`
- **Pydantic for validation** — never validate manually; define schemas in `models/schemas.py`
- **No business logic in routes** — routes call `services/`, services call `db/`
- **Dependency injection** — auth, DB pool, settings all via `Depends()`
- **Naming:** `snake_case` for all Python (files, functions, variables, DB columns)
- **Type hints** — required on all function signatures
- **Docstrings** — one-line docstring on every public function explaining *what* it does
- **Error handling** — raise `HTTPException` in routes/services; never return error dicts manually

---

## Running Locally (without Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # fill in DATABASE_URL

uvicorn src.main:app --reload --port 4000
# Swagger UI → http://localhost:4000/docs
```

---

## Progress Tracker

### BE Dev 1 — API Routes & Middleware

| Task | Status | Notes |
|------|--------|-------|
| `src/main.py` + lifespan setup | 🔲 Not started | |
| `src/config.py` pydantic-settings | 🔲 Not started | |
| `src/middleware/auth.py` — JWT dependency | 🔲 Not started | |
| `require_role()` dependency factory | 🔲 Not started | |
| `POST /reports` | 🔲 Not started | No auth |
| `GET /reports` + query filters | 🔲 Not started | |
| `PATCH /reports/{id}/status` | 🔲 Not started | |
| `GET /clusters` | 🔲 Not started | |
| `GET /routes/{id}` | 🔲 Not started | |
| `POST /routes/{id}/stops/{stop_id}/checkin` | 🔲 Not started | |
| `POST /auth/login` | 🔲 Not started | bcrypt verify + JWT sign |
| `GET /auth/me` | 🔲 Not started | |
| `GET /dashboard/metrics` | 🔲 Not started | |
| `GET /dashboard/map` | 🔲 Not started | |
| `GET /dashboard/export` | 🔲 Not started | StreamingResponse CSV |

### BE Dev 2 — Core Engine & Database

| Task | Status | Notes |
|------|--------|-------|
| `src/db/pool.py` — asyncpg pool | 🔲 Not started | |
| `src/db/001_init.sql` — schema | 🔲 Not started | already drafted above |
| `src/db/seed.sql` — 2 dummy routes + crew users | 🔲 Not started | |
| `src/models/schemas.py` — all Pydantic models | 🔲 Not started | |
| PostGIS ST_DWithin proximity query | 🔲 Not started | |
| `src/optimizer/cluster.py` — clustering logic | 🔲 Not started | |
| Priority scoring formula | 🔲 Not started | |
| `src/optimizer/router.py` — route insertion | 🔲 Not started | |
| `src/utils/co2.py` — CO₂ + time estimator | 🔲 Not started | |
| 15-min cluster re-run scheduler (asyncio) | 🔲 Not started | |
| Dashboard metrics aggregation queries | 🔲 Not started | |

Legend: ✅ Done · 🔄 In progress · 🔲 Not started
