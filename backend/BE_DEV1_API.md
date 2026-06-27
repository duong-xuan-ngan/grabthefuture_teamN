# BE Dev 1 — API Routes & Middleware

**Role:** Backend Developer 1  
**Scope:** FastAPI app entry point · all route handlers · auth middleware · request validation  
**Stack:** Python 3.11 · FastAPI · python-jose · bcrypt · Pydantic v2

---

## Your Files

Every file you are responsible for is listed below. Nothing outside this list requires your attention unless you are helping a teammate.

```
backend/
├── src/
│   ├── main.py                  ← app init, router registration, lifespan
│   ├── config.py                ← pydantic-settings (shared read-only for others)
│   ├── middleware/
│   │   └── auth.py              ← JWT dependency + require_role() factory
│   └── routes/
│       ├── auth.py              ← POST /auth/login, GET /auth/me
│       ├── reports.py           ← CRUD for reports
│       ├── routes.py            ← clusters + route + check-in endpoints
│       └── dashboard.py         ← metrics, map pins, CSV export
```

---

## What You Are Building

### 1. `src/main.py` — App Bootstrap

- Create the `FastAPI` app instance with title, version, and lifespan context
- Register CORS middleware (allow all origins for prototype)
- Mount all four routers under `/api/v1`
- Expose `GET /health` for Docker health checks

```python
# Pattern to follow
@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()   # BE Dev 2 provides this
    yield
    await close_pool()

app = FastAPI(title="WasteFlow API", version="1.0.0", lifespan=lifespan)
app.include_router(reports.router, prefix="/api/v1")
# ... rest of routers
```

---

### 2. `src/middleware/auth.py` — Authentication

Two things to implement:

**`get_current_user`** — decodes the Bearer JWT, raises `401` if invalid or expired:
```python
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
) -> dict:
    token = credentials.credentials
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    return payload   # contains: sub (user_id), role, name
```

**`require_role(*roles)`** — dependency factory for endpoint-level role enforcement:
```python
def require_role(*roles: str):
    async def dependency(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return dependency
```

Usage in routes:
```python
@router.get("/reports", dependencies=[Depends(require_role("manager"))])
```

---

### 3. `src/routes/auth.py` — Login & Identity

| Endpoint | Method | Auth | What it does |
|----------|--------|------|--------------|
| `/auth/login` | POST | None | Verify email+password against DB → return signed JWT |
| `/auth/me` | GET | Any | Decode token → return `{id, role, name}` |

For login, the flow is:
1. Receive `LoginRequest(email, password)`
2. Call `user_service.get_by_email(email)` ← BE Dev 2 provides this
3. Verify password with `bcrypt.checkpw()`
4. Sign JWT: `{"sub": user_id, "role": role, "name": name, "exp": now + 8h}`
5. Return `TokenOut`

---

### 4. `src/routes/reports.py` — Report Endpoints

| Endpoint | Method | Auth | Request body / params |
|----------|--------|------|-----------------------|
| `/reports` | POST | None | `ReportCreate` body |
| `/reports` | GET | Manager | `?status=`, `?severity=` query params |
| `/reports/{id}` | GET | Manager | — |
| `/reports/{id}/status` | PATCH | Manager or Crew | `ReportStatusUpdate` body |
| `/reports/{id}/photo` | POST | None | `UploadFile` multipart |

**Critical:** After `POST /reports` saves successfully, trigger the optimizer:
```python
from src.optimizer.cluster import run_clustering
from src.optimizer.router import update_routes

await run_clustering()
await update_routes()
```

---

### 5. `src/routes/routes.py` — Collection Routes & Clusters

| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `/clusters` | GET | Manager | List all open/assigned clusters |
| `/routes/{id}` | GET | Manager or Crew | Full route with ordered stops |
| `/routes/{id}/optimize` | POST | Manager | Manually re-trigger optimizer |
| `/routes/{id}/stops/{stop_id}/checkin` | POST | Crew | Body: `CheckInCreate(lat, lng)` |

---

### 6. `src/routes/dashboard.py` — Analytics

| Endpoint | Method | Auth | Notes |
|----------|--------|------|-------|
| `/dashboard/metrics` | GET | Manager | `?date_from=&date_to=` |
| `/dashboard/map` | GET | Manager | Returns `list[MapPinOut]` |
| `/dashboard/export` | GET | Manager | `StreamingResponse` with CSV content-type |

For the CSV export use FastAPI's `StreamingResponse`:
```python
from fastapi.responses import StreamingResponse

async def generate_csv():
    yield "id,issue_type,severity,submitted_at\n"
    async for row in dashboard_service.iter_reports(date_from, date_to):
        yield f"{row['id']},{row['issue_type']},{row['severity']},{row['submitted_at']}\n"

return StreamingResponse(
    generate_csv(),
    media_type="text/csv",
    headers={"Content-Disposition": "attachment; filename=reports.csv"},
)
```

---

## Interfaces with Other Team Members

| You need | Provided by | What to call |
|----------|-------------|--------------|
| DB pool | BE Dev 2 | `from src.db.pool import get_pool` |
| Pydantic schemas | BE Dev 2 | `from src.models.schemas import *` |
| Clustering trigger | BE Dev 2 | `await run_clustering()` |
| Route optimizer trigger | BE Dev 2 | `await update_routes()` |
| Service functions | BE Dev 2 | `report_service`, `dashboard_service`, `user_service` |

You do **not** touch: `src/db/`, `src/models/schemas.py`, `src/optimizer/`, `src/utils/`

---

## Coding Conventions

- All route handlers are `async def`
- Never put business logic in route functions — call a service instead
- All input validated via Pydantic schemas (no manual `if not body.field` checks)
- Raise `HTTPException`, never return error dicts manually
- Type-hint every function signature
- One-line docstring on every endpoint explaining what it does

---

## Running Locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL
uvicorn src.main:app --reload --port 4000
# Swagger UI → http://localhost:4000/docs
```

---

## Progress Tracker

| Task | Status | Blocked by |
|------|--------|------------|
| `src/main.py` — app + lifespan + CORS + routers | 🔲 Not started | — |
| `src/config.py` — pydantic-settings | 🔲 Not started | — |
| `src/middleware/auth.py` — `get_current_user` | 🔲 Not started | — |
| `src/middleware/auth.py` — `require_role()` | 🔲 Not started | — |
| `POST /auth/login` | 🔲 Not started | `user_service.get_by_email` (BE Dev 2) |
| `GET /auth/me` | 🔲 Not started | — |
| `POST /reports` | 🔲 Not started | `report_service.create_report` (BE Dev 2) |
| `GET /reports` + filters | 🔲 Not started | `report_service.get_reports` (BE Dev 2) |
| `GET /reports/{id}` | 🔲 Not started | `report_service.get_report` (BE Dev 2) |
| `PATCH /reports/{id}/status` | 🔲 Not started | `report_service.update_status` (BE Dev 2) |
| `POST /reports/{id}/photo` | 🔲 Not started | — |
| `GET /clusters` | 🔲 Not started | `cluster_service.get_active` (BE Dev 2) |
| `GET /routes/{id}` | 🔲 Not started | `route_service.get_route` (BE Dev 2) |
| `POST /routes/{id}/optimize` | 🔲 Not started | optimizer (BE Dev 2) |
| `POST /routes/{id}/stops/{stop_id}/checkin` | 🔲 Not started | `route_service.checkin` (BE Dev 2) |
| `GET /dashboard/metrics` | 🔲 Not started | `dashboard_service.get_metrics` (BE Dev 2) |
| `GET /dashboard/map` | 🔲 Not started | `dashboard_service.get_map_pins` (BE Dev 2) |
| `GET /dashboard/export` — CSV StreamingResponse | 🔲 Not started | `dashboard_service.iter_reports` (BE Dev 2) |

Legend: ✅ Done · 🔄 In progress · 🔲 Not started · ⏸ Blocked
