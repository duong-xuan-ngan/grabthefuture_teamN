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
- Node.js ≥ 18
- Docker (for Postgres)
- A free [Cloudinary](https://cloudinary.com) account

### 1. Clone & install
```bash
git clone <repo-url>
cd grabthefuture_teamN

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Start Postgres
```bash
docker run --name wastehotspot-db \
  -e POSTGRES_PASSWORD=pass \
  -e POSTGRES_DB=wastehotspot \
  -p 5432:5432 \
  -d postgres:16
```

### 3. Configure environment
```bash
cp .env.example .env
# Fill in CLOUDINARY_URL and JWT_SECRET
```

### 4. Run migrations & seed
```bash
cd backend
npx prisma migrate dev
npm run seed
```

### 5. Start servers
```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:3000

---

## Project Structure

```
grabthefuture_teamN/
├── backend/            ← Express + Prisma + H3
│   ├── prisma/         ← Schema & migrations
│   ├── src/
│   │   ├── routes/     ← REST endpoints
│   │   ├── services/   ← Business logic (scoring, clustering, routing)
│   │   ├── middleware/ ← Auth, error handling
│   │   └── utils/      ← H3 helpers, weight calc, constants
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
| Frontend | React (Vite), Leaflet.js, Tailwind CSS |
| Backend | Node.js, Express |
| Spatial | Uber H3 (`h3-js`) |
| Database | PostgreSQL 16, Prisma ORM |
| File Storage | Cloudinary (free tier) |
| QR Codes | `qrcode` npm package |
| Auth | JWT (simple token login) |
| Deployment | Railway.app (optional) |

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
| GET | `/api/admin/export` | CSV export | B |
| POST | `/api/auth/login` | Token login | C |

---

## Data Model

```sql
waste_points  { id, name, lat, lng, h3_cell, area_type, category, estimated_weight_kg, normal_collection_time }
reports       { id, waste_point_id, issue_type, description, image_url, lat, lng, created_at, status }
hotspots      { id, waste_point_id, report_count, severity, priority_score, status, created_at, resolved_at }
trucks        { id, name, lat, lng, h3_cell, status, current_route_id, max_capacity_kg, current_load_kg }
tasks         { id, hotspot_id, truck_id, status, assigned_at, completed_at, weight_collected_kg }
```

---

## Docs

See `docs/` for each member's skill breakdown and live progress tracker.
