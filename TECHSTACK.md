# Tech Stack & Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, React Router v6, Leaflet + OpenStreetMap, Tailwind CSS |
| Backend | FastAPI (Python), Pydantic, Uvicorn |
| Database | Supabase PostgreSQL, SQLModel / SQLAlchemy, Alembic |
| Spatial indexing | Uber H3 (`h3` Python package, resolution 8, in-process) |
| File storage | Supabase Storage (`report-photos` bucket) |
| Routing API | OpenRouteService Optimization API (Haversine fallback) |
| Auth | JWT (python-jose + passlib[bcrypt]) |
| Deployment | Vercel (frontend), Render / Railway (backend), Supabase (DB + storage) |

## Architecture

```
Browser (Dispatcher / Driver / Resident / Admin)
        |
        v
React + Vite SPA — Leaflet map, polling every 10 s
        |  REST API (JSON)
        v
FastAPI Backend (Python / Uvicorn)
        |
        |-- Supabase PostgreSQL  (indexed h3_cell columns)
        |-- H3 spatial indexing  (grid_disk ring queries, computed in-process)
        |-- Supabase Storage     (resident report photos)
        |-- OpenRouteService     (vehicle routing optimisation)
        |-- priority_score.py   (5-factor scoring engine)
        |-- clustering.py       (50 m / 30 min merge logic)
        |-- routing.py          (SC-01 to SC-09 scenario evaluation)
        `-- capacity.py         (weight feasibility checks)
```

## Project Structure

```
grabthefuture_teamN/
|-- .env.example
|-- README.md
|-- SETUP.md
|-- RUNNING.md
|-- TECHSTACK.md
|
|-- backend/
|   |-- main.py
|   |-- requirements.txt
|   |-- alembic/versions/        (migrations 0001 to 0004)
|   |-- app/
|   |   |-- models.py
|   |   |-- database.py
|   |   |-- dependencies/auth.py
|   |   |-- routes/              (reports, hotspots, trucks, tasks, routing, dashboard, auth, ...)
|   |   |-- services/            (priority_score, clustering, routing, capacity, ors)
|   |   `-- utils/               (constants, spatial, serialize)
|   `-- scripts/
|       |-- seed.py
|       |-- generate_qr.py
|       `-- test_integration.py
|
`-- frontend/
    |-- package.json
    `-- src/
        |-- pages/               (Dispatcher, Driver, Resident, Admin, Login)
        |-- components/          (dispatcher/, driver/, resident/, shared/)
        `-- api/                 (client.js, mock.js)
```

## Data Model

```
waste_points  (id, name, lat, lng, h3_cell, area_type, category,
               estimated_weight_kg, normal_collection_time, status)

reports       (id, waste_point_id, hotspot_id, issue_type, source,
               description, image_url, lat, lng, created_at, status)

hotspots      (id, waste_point_id, report_count, severity,
               priority_score, status, created_at, resolved_at)

trucks        (id, name, lat, lng, h3_cell, status,
               max_capacity_kg, current_load_kg)

tasks         (id, hotspot_id, truck_id, status,
               assigned_at, completed_at, weight_collected_kg)
```

## Key Design Decisions

**H3 spatial indexing:** each waste point and truck stores an indexed `h3_cell` column. When a hotspot fires, candidate trucks are found via `grid_disk(cell, k)` ring queries — a fast indexed lookup with no PostGIS extension required.

**No autonomous dispatch:** every routing output is a suggestion. The dispatcher approves or rejects before any task is written.

**Polling over WebSockets:** the frontend polls every 10 seconds. Sufficient for MVP scale (3 trucks, 5 users) and simpler to debug.

**Configurable thresholds:** capacity warn/full percentages, detour limits, cluster radius, and score thresholds are all environment variables — tunable without redeployment.
