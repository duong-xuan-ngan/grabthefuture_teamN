# BE Dev 2 — Core Engine, Database & Services

**Role:** Backend Developer 2  
**Scope:** PostgreSQL schema · asyncpg pool · Pydantic schemas · service layer · clustering algorithm · route optimizer · CO₂ utilities  
**Stack:** Python 3.11 · asyncpg · PostGIS · Pydantic v2 · asyncio

---

## Your Files

```
backend/
├── src/
│   ├── db/
│   │   ├── pool.py              ← asyncpg connection pool
│   │   ├── 001_init.sql         ← schema + PostGIS indexes (already drafted)
│   │   └── seed.sql             ← 2 dummy routes + crew/manager users
│   ├── models/
│   │   └── schemas.py           ← all Pydantic request/response models (already drafted)
│   ├── services/
│   │   ├── report_service.py    ← CRUD for reports
│   │   ├── route_service.py     ← route + stop + check-in logic
│   │   ├── cluster_service.py   ← cluster queries
│   │   ├── dashboard_service.py ← metrics aggregation + CSV iter
│   │   └── user_service.py      ← user lookup for auth
│   ├── optimizer/
│   │   ├── cluster.py           ← clustering algorithm (stub ready)
│   │   └── router.py            ← route insertion algorithm (stub ready)
│   └── utils/
│       └── co2.py               ← CO₂ + time savings calculator (already implemented)
```

---

## What You Are Building

### 1. `src/db/pool.py` — Connection Pool

Provide two functions that BE Dev 1 will call from `main.py`:

```python
import asyncpg
from src.config import settings

_pool: asyncpg.Pool | None = None

async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=2, max_size=10)
    return _pool

async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
```

---

### 2. `src/db/001_init.sql` — Schema

Already drafted. Key points:
- `pgcrypto` + `postgis` extensions required
- `reports.location` and `clusters.centroid` are `GEOGRAPHY(POINT, 4326)`
- Spatial indexes on both: `CREATE INDEX ... USING GIST`
- `clusters.route_id` FK is added via `ALTER TABLE` after `routes` exists (circular dep workaround)

Run to initialize:
```bash
psql $DATABASE_URL -f src/db/001_init.sql
```

---

### 3. `src/db/seed.sql` — Demo Data

Create this file with enough data to make the demo credible:
- 2 manager users + 2 crew users (bcrypt-hashed password: `demo1234`)
- 2 active routes (`status='active'`) with 3–4 pre-existing stops each
- 5–6 seed reports spread across Ho Chi Minh City coordinates
- 2 pre-existing clusters (so the dashboard map isn't empty on first load)

---

### 4. `src/models/schemas.py` — Pydantic Schemas

Already fully drafted. Your job is to keep it updated as the team discovers new fields needed. The file contains:
- Enums: `IssueType`, `Severity`, `ReportStatus`, `ClusterStatus`, `RouteStatus`, `UserRole`
- Request models: `ReportCreate`, `ReportStatusUpdate`, `LoginRequest`, `CheckInCreate`
- Response models: `ReportOut`, `ClusterOut`, `RouteOut`, `MetricsOut`, `MapPinOut`, `TokenOut`
- Shared sub-models: `LocationIn`, `CO2Estimate`, `StopOut`

---

### 5. Service Layer (`src/services/`)

Services are the only layer that talks to the database. BE Dev 1's routes call these functions — never directly hit the DB pool themselves.

**Pattern for every service function:**
```python
# src/services/report_service.py
from src.db.pool import get_pool

async def create_report(body: ReportCreate) -> dict:
    """Insert a new report and return the created row."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO reports (issue_type, severity, location, description, contact_info)
            VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, $6)
            RETURNING id, issue_type, severity, status, photo_url, description,
                      cluster_id, submitted_at
            """,
            body.issue_type, body.severity,
            body.location.lng, body.location.lat,
            body.description, body.contact_info,
        )
    return dict(row)
```

**Functions BE Dev 1 is waiting on — implement these first:**

| Service file | Function | Called from |
|---|---|---|
| `user_service.py` | `get_by_email(email)` | `POST /auth/login` |
| `report_service.py` | `create_report(body)` | `POST /reports` |
| `report_service.py` | `get_reports(status, severity)` | `GET /reports` |
| `report_service.py` | `get_report(report_id)` | `GET /reports/{id}` |
| `report_service.py` | `update_status(report_id, status)` | `PATCH /reports/{id}/status` |
| `cluster_service.py` | `get_active_clusters()` | `GET /clusters` |
| `route_service.py` | `get_route(route_id)` | `GET /routes/{id}` |
| `route_service.py` | `checkin(route_id, stop_id, lat, lng, user_id)` | `POST .../checkin` |
| `dashboard_service.py` | `get_metrics(date_from, date_to)` | `GET /dashboard/metrics` |
| `dashboard_service.py` | `get_map_pins()` | `GET /dashboard/map` |
| `dashboard_service.py` | `iter_reports(date_from, date_to)` | `GET /dashboard/export` (async generator) |

---

### 6. `src/optimizer/cluster.py` — Clustering Algorithm

```
Input:  all reports with status = 'pending'

Steps:
  1. Fetch pending reports with ST_X(location::geometry) as lng,
                                   ST_Y(location::geometry) as lat
  2. Use PostGIS to group: for each report, find all others within
     ST_DWithin(r1.location, r2.location, <CLUSTER_RADIUS_METERS>)
     AND r2.submitted_at BETWEEN r1.submitted_at - INTERVAL '4 hours'
                              AND r1.submitted_at + INTERVAL '4 hours'
  3. Compute centroid per group:
     ST_AsText(ST_Centroid(ST_Collect(location::geometry)))
  4. Score each cluster:
       severity_weight = {high: 3, medium: 2, low: 1}
       time_factor     = min(hours_since_oldest / 4, 3.0)
       priority_score  = sum(severity_weight per report) × time_factor
  5. UPSERT clusters (match on centroid proximity to existing clusters)
  6. UPDATE reports SET cluster_id = <cluster_id>
     WHERE id IN (ids belonging to this cluster)
```

---

### 7. `src/optimizer/router.py` — Route Insertion

```
Input:  clusters with priority_score >= HIGH_PRIORITY_THRESHOLD
        AND status = 'open'

Steps:
  1. Fetch all active routes with their stops JSONB
  2. For each qualifying cluster:
     a. Compute distance from cluster.centroid to each route's stops
     b. Choose the route with the nearest existing stop
     c. Try inserting the cluster between every pair (stop[i], stop[i+1])
     d. Pick the insertion that minimizes:
          dist(stop[i] → cluster) + dist(cluster → stop[i+1])
          - dist(stop[i] → stop[i+1])    ← added distance
     e. Insert into route.stops JSONB at computed position
     f. Renumber seq field for all stops after the insertion point
     g. Recalculate route.distance_km using sum of all consecutive stop distances
  3. UPDATE routes SET stops = $1, distance_km = $2 WHERE id = $3
  4. UPDATE clusters SET status = 'assigned', route_id = $1 WHERE id = $2
```

**Geo helper you will need:**
```python
import math

def haversine_km(lat1, lng1, lat2, lng2) -> float:
    """Great-circle distance between two lat/lng points in km."""
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
```

---

### 8. `src/utils/co2.py` — Already Implemented ✅

Two functions are ready to use:
- `calc_co2_savings(baseline_km, optimized_km)` → `{saved_km, co2_saved_kg, co2_label}`
- `calc_time_savings_minutes(saved_km, avg_speed_kmh=20)` → `float`

Always include `co2_label: "estimated"` in any API response that surfaces a CO₂ figure.

---

## Scheduler — 15-Minute Cluster Re-Run

Add an asyncio background task to `main.py` (coordinate with BE Dev 1):

```python
import asyncio
from src.optimizer.cluster import run_clustering
from src.optimizer.router import update_routes

async def optimization_loop():
    while True:
        await asyncio.sleep(settings.cluster_rerun_interval_seconds)
        await run_clustering()
        await update_routes()

# Start in lifespan:
asyncio.create_task(optimization_loop())
```

---

## Interfaces with Other Team Members

| You provide | Used by | What to expose |
|-------------|---------|----------------|
| `get_pool()` / `close_pool()` | BE Dev 1 (`main.py`) | `from src.db.pool import get_pool, close_pool` |
| All service functions | BE Dev 1 (routes) | `from src.services import report_service` etc. |
| `run_clustering()` | BE Dev 1 (`POST /reports`, `POST .../optimize`) | `from src.optimizer.cluster import run_clustering` |
| `update_routes()` | BE Dev 1 (same triggers) | `from src.optimizer.router import update_routes` |
| `schemas.py` | BE Dev 1 (routes) + FE Dev (API contract reference) | `from src.models.schemas import *` |
| `co2.py` utils | `dashboard_service.py`, `route_service.py` | `from src.utils.co2 import calc_co2_savings` |

---

## Priority Order

Build in this order to unblock BE Dev 1 as fast as possible:

1. `db/pool.py` — needed before anything runs
2. Run `db/001_init.sql` against your local Postgres + PostGIS
3. `db/seed.sql` — needed for any manual testing
4. `models/schemas.py` — already done, just verify it matches the schema
5. `services/user_service.py` → unblocks `/auth/login`
6. `services/report_service.py` → unblocks all report endpoints
7. `services/cluster_service.py` + `services/route_service.py`
8. `services/dashboard_service.py`
9. `optimizer/cluster.py`
10. `optimizer/router.py`

---

## Progress Tracker

| Task | Status | Notes |
|------|--------|-------|
| `db/pool.py` — asyncpg pool | 🔲 Not started | |
| Run `001_init.sql` locally | 🔲 Not started | Needs Postgres + PostGIS installed |
| `db/seed.sql` — demo data | 🔲 Not started | |
| `models/schemas.py` — review + finalize | 🔲 Not started | Draft already exists |
| `services/user_service.py` — `get_by_email` | 🔲 Not started | Unblocks login |
| `services/report_service.py` — `create_report` | 🔲 Not started | |
| `services/report_service.py` — `get_reports` | 🔲 Not started | |
| `services/report_service.py` — `get_report` | 🔲 Not started | |
| `services/report_service.py` — `update_status` | 🔲 Not started | |
| `services/cluster_service.py` — `get_active_clusters` | 🔲 Not started | |
| `services/route_service.py` — `get_route` | 🔲 Not started | |
| `services/route_service.py` — `checkin` | 🔲 Not started | |
| `services/dashboard_service.py` — `get_metrics` | 🔲 Not started | |
| `services/dashboard_service.py` — `get_map_pins` | 🔲 Not started | |
| `services/dashboard_service.py` — `iter_reports` | 🔲 Not started | Async generator for CSV |
| `optimizer/cluster.py` — full clustering logic | 🔲 Not started | |
| `optimizer/router.py` — route insertion | 🔲 Not started | |
| `haversine_km` geo helper | 🔲 Not started | Goes in `utils/geo.py` |
| Asyncio background scheduler | 🔲 Not started | Coordinate with BE Dev 1 for lifespan |

Legend: ✅ Done · 🔄 In progress · 🔲 Not started · ⏸ Blocked
