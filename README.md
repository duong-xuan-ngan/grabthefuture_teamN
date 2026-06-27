# 🌱 WasteFlow — Grab the Green Future Hackathon

> **Smart waste collection optimization for Vietnamese cities.**  
> Real-time citizen reports → clustered demand signals → optimized collection routes → less overflow, less fuel, less CO₂.

---

## One-liner

WasteFlow helps cities collect waste smarter by turning real-time waste reports into optimized collection routes — reducing overflow, operational costs, and CO₂ emissions.

---

## Repository Structure

```
grabthefuture_teamN/
├── backend/          → API server + route optimization engine (2 BE devs)
├── frontend/         → Web UI: report form, crew app, dashboard (1 FE dev)
├── devops/           → Docker, Nginx, deployment scripts (1 DevOps eng)
├── docs/             → Shared specs, API contracts, architecture diagrams
└── README.md         → This file
```

Each folder contains its own `README.md` with ownership, responsibilities, implementation guide, and progress tracking.

---

## Team Roles

| Role | Folder | Primary Focus |
|------|--------|---------------|
| Backend Dev 1 (API) | `backend/` | Express routes, auth, REST API |
| Backend Dev 2 (Core) | `backend/` | Clustering engine, optimizer, DB schema |
| Frontend Dev | `frontend/` | Report form, crew PWA, dashboard |
| DevOps Engineer | `devops/` | Docker Compose, Nginx, deploy scripts |

---

## Tech Stack (MVP)

| Layer | Technology |
|-------|------------|
| API Server | Node.js + Express |
| Optimization | Python (in-process via child_process or FastAPI microservice) |
| Database | PostgreSQL + PostGIS |
| Frontend | React (Vite) + Tailwind CSS |
| Maps | Leaflet.js + OpenStreetMap tiles |
| File Storage | Local disk (MVP) → S3-compatible post-hackathon |
| Container | Docker + Docker Compose |
| Reverse Proxy | Nginx |

---

## Quick Start (after DevOps sets up Docker)

```bash
# Clone and enter repo
cd grabthefuture_teamN

# Start all services
docker compose up --build

# Services will be available at:
# Frontend  → http://localhost:3000
# API       → http://localhost:4000
# Dashboard → http://localhost:3000/dashboard
```

---

## Core User Flows

1. **Citizen** scans QR on bin → fills report form → submits → sees confirmation
2. **System** clusters nearby reports → scores priority → inserts into nearest active route
3. **Crew** opens mobile app → sees updated route → checks in at each stop → marks complete
4. **Manager** watches live map + KPI dashboard update in real time

---

## Key Design Constraint

> Reports are **demand signals**, not individual work orders.  
> The system clusters reports geographically and inserts clusters into **existing routes** — it does not create new routes per report.

---

## Progress Overview

See each folder's `README.md` for detailed task status.

| Area | Status |
|------|--------|
| Backend API routes | 🔲 Not started |
| Clustering engine | 🔲 Not started |
| DB schema + seed data | 🔲 Not started |
| Report form (FE) | 🔲 Not started |
| Crew app (FE) | 🔲 Not started |
| Dashboard (FE) | 🔲 Not started |
| Docker Compose | 🔲 Not started |
| Nginx config | 🔲 Not started |

Legend: ✅ Done · 🔄 In progress · 🔲 Not started
