# WasteHotspot 🗑️📍

> **Grab the Green Future Hackathon** — Team N
>
> *Fixed route is the baseline. Hotspot response is the intelligence layer.*

---

## What is this?

WasteHotspot is a real-time waste-collection dispatch tool. Residents scan a QR code on any bin to report overflow; the system clusters reports, scores urgency, and suggests optimised truck routes to a dispatcher — who always makes the final call.

---

## Team & Roles

| Member | Role | Owns |
|--------|------|------|
| **Member 1** | Routing Engine | H3 spatial lookup, scenario matching (SC-01→SC-07), weight feasibility |
| **Member A** | Backend & Data Pipeline | DB schema, QR generation, report API, clustering, priority score, weight model |
| **Member B** | Dispatcher Experience | Live map, capacity UI, suggestion cards, KPI dashboard |
| **Member C** | Driver Experience & Integration | Driver mobile view, weight input flow, re-optimisation trigger, seed script |

---

## Quick Start (local)

### Prerequisites
- Python ≥ 3.11
- Node.js ≥ 18 (frontend tooling only)
- A free [Supabase](https://supabase.com) project (hosted Postgres + PostGIS + Storage)

### 1. Clone & install
```bash
git clone <repo-url>
cd grabthefuture_teamN

# Backend (Python / FastAPI)
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_KEY, DATABASE_URL, ORS_API_KEY, JWT_SECRET
```

### 3. Run migrations & seed
```bash
cd backend
alembic upgrade head
python scripts/seed.py
```

### 4. Start servers
```bash
# Terminal 1 — backend
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:8000 (Swagger docs at /docs)

---

## Project Structure

```
grabthefuture_teamN/
├── backend/            ← FastAPI + SQLModel + PostGIS
│   ├── alembic/        ← Migrations
│   ├── app/
│   │   ├── routes/     ← REST endpoints
│   │   ├── services/   ← Business logic (scoring, clustering, routing, capacity)
│   │   ├── dependencies/ ← Auth (JWT), error handling
│   │   └── utils/      ← Spatial helpers (H3 cells, haversine), weight calc, constants
│   └── scripts/        ← QR generator, seed script
├── frontend/           ← React (Vite) + Leaflet + Tailwind
│   └── src/
│       ├── pages/      ← Dispatcher, Driver, Resident (QR form)
│       ├── components/ ← Map, Cards, CapacityBar, etc.
│       └── api/        ← fetch wrappers
├── docs/               ← Per-member skill & progress docs
│   ├── member-1-routing-engine.md
│   ├── member-a-backend.md
│   ├── member-b-dispatcher.md
│   └── member-c-driver.md
├── .env.example
├── .gitignore
└── README.md
```

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React (Vite), Leaflet + OpenStreetMap, Tailwind CSS |
| Backend | FastAPI (Python), Pydantic, Uvicorn |
| Spatial | Uber H3 (`h3` Python package, resolution 9) |
| Database | Supabase PostgreSQL, SQLModel/SQLAlchemy, Alembic |
| File Storage | Supabase Storage (`report-photos` bucket) |
| Routing | OpenRouteService Optimization API (Haversine fallback) |
| QR Codes | `qrcode` (Python) |
| Auth | JWT (simple token login, `python-jose` + `passlib[bcrypt]`) |
| Deployment | Vercel (frontend), Render / Railway (backend), Supabase (DB) |

---

## API Overview

| Method | Path | Description | Member |
|--------|------|-------------|--------|
| POST | `/api/reports` | Submit resident report | A |
| GET | `/api/hotspots` | All active hotspots with scores | A |
| GET | `/api/hotspots/:id` | Hotspot detail | A |
| GET | `/api/trucks` | All trucks with live capacity | A |
| PATCH | `/api/trucks/:id/load` | Update truck load (driver) | C |
| GET | `/api/tasks/:truckId` | Driver task list | C |
| PATCH | `/api/tasks/:id` | Mark Done / Unreachable | C |
| POST | `/api/routing/suggest` | Run routing engine | 1 |
| POST | `/api/routing/approve/:id` | Dispatcher approves suggestion | B |
| POST | `/api/routing/reject/:id` | Dispatcher rejects suggestion | B |
| GET | `/api/dashboard/kpis` | Shift KPIs | B |
| GET | `/api/dashboard/repeat-offenders` | Repeat hotspot locations | B |
| GET | `/api/dashboard/export` | CSV export | B |
| POST | `/api/auth/login` | Token login | C |

---

## Data Model

```sql
-- lat/lng encoded into an indexed h3_cell (resolution 9) for grid_disk ring lookups
waste_points  { id, name, lat, lng, h3_cell, area_type, category, estimated_weight_kg, normal_collection_time }
reports       { id, waste_point_id, issue_type, description, image_url, lat, lng, created_at, status }
hotspots      { id, waste_point_id, report_count, severity, priority_score, status, created_at, resolved_at }
trucks        { id, name, lat, lng, h3_cell, status, current_route_id, max_capacity_kg, current_load_kg }
tasks         { id, hotspot_id, truck_id, status, assigned_at, completed_at, weight_collected_kg }
```

---

## Docs

See `docs/` for each member's skill breakdown and live progress tracker.
