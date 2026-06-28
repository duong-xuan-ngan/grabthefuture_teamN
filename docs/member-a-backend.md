# Duong Xuan Ngan — Backend & Data Pipeline

**Owner:** TBD
**Branch:** `feature/backend-pipeline`

---

## Skill Overview

Member A owns the foundational data layer that every other member depends on. This includes the SQLModel schema, the report ingestion API, hotspot clustering logic, priority scoring, and the bin/truck weight model. Nothing works until Member A's API is live.

---

## Responsibilities

| Feature | Req IDs | Description |
|---------|---------|-------------|
| QR Code Generation | F-QR-01 | Generate one PNG per bin encoding `bin_id` + GPS; printable assets |
| Resident Report Form & API | F-QR-02 / F-QR-03 | Mobile form + `POST /api/reports`; Supabase Storage photo upload; confirmation response |
| Hotspot Clustering | F-CLUSTER-01 / F-CLUSTER-02 | 50 m / 30 min merge; severity escalation; aggregate photos into hotspot |
| Priority Score Engine | F-SCORE-01 / F-SCORE-02 | Formula with all 5 weighted factors; `GET /api/hotspots` |
| Bin & Truck Weight Model | F-WEIGHT-01 / F-WEIGHT-02 | Seed bin categories + defaults; `max_capacity_kg` config; expose via API |
| Weight Feasibility Utility | F-WEIGHT-06 | `can_accept()` function consumed by routing engine (Member 1) |

---

## Files Owned

```
backend/app/models.py                   ← shared SQLModel schema (review with team)
backend/app/routes/reports.py           ← POST /api/reports
backend/app/routes/hotspots.py          ← GET /api/hotspots, GET /api/hotspots/:id
backend/app/routes/trucks.py            ← GET /api/trucks (data model + capacity fields)
backend/app/services/clustering.py      ← clustering logic
backend/app/services/priority_score.py  ← priority score formula
backend/app/utils/constants.py          ← BIN_WEIGHT_DEFAULTS, score weights, thresholds
backend/scripts/generate_qr.py          ← QR PNG generator
```

---

## Priority Score Formula Reference

```
score = severity_base
      + min((report_count - 1) × 5, 20)   ← report bonus, capped +20
      + 15  if area_type in [market, school, apartment]
      + 20  if scheduled truck > 3 h away
      + 10  if ≥ 3 hotspots at this point in last 30 days
      capped at 100
```

| Severity | Base |
|----------|------|
| Overflow | 60 |
| (Near) Full | 40 |
| Near Full / Bulky / Bad Smell | 20 |

---

## Bin Category Defaults

| Category | Default Weight (kg) |
|----------|-------------------|
| `small_residential` | 30 |
| `medium_residential` | 75 |
| `market_commercial` | 150 |
| `large_public` | 115 |

Stored in `constants.py` as `BIN_WEIGHT_DEFAULTS`. Drivers can override after collection.

---

## API Endpoints

| Method | Path | Body / Params | Returns |
|--------|------|--------------|---------|
| POST | `/api/reports` | `waste_point_id`, `issue_type`, `description?`, `image?` | `{ report, hotspot }` |
| GET | `/api/hotspots` | — | `{ hotspots[] }` with `priority_score` |
| GET | `/api/hotspots/:id` | — | Hotspot + all reports + photos |
| GET | `/api/trucks` | — | Trucks with computed capacity fields |

---

## Progress Tracker

| Task | Status | Notes |
|------|--------|-------|
| Review and agree shared SQLModel schema with team | ⬜ Not started | **Blocker for everyone** |
| Enable PostGIS on Supabase (`CREATE EXTENSION postgis`) | ⬜ Not started | One-time, done in Supabase SQL editor |
| Run `python -m alembic upgrade head` or `create_db_and_tables()` | ⬜ Not started | |
| `POST /api/reports` — persist report | ⬜ Not started | |
| Supabase Storage photo upload integration (`_upload_to_supabase` in routes/reports.py) | ✅ Done | Uploads to `report-photos`; falls back to None if unconfigured (NFR-07) |
| `cluster_report()` — wire in clustering.py | ⬜ Not started | |
| `compute_priority_score()` — wire repeat-offender query | ✅ Done | All 5 factors incl. `_is_truck_far` (schedule-based) |
| `GET /api/hotspots` | ⬜ Not started | |
| `GET /api/hotspots/:id` | ⬜ Not started | |
| `GET /api/trucks` with computed capacity fields | ⬜ Not started | |
| Run seed script (`python scripts/seed.py`) | ⬜ Not started | |
| QR generation (`python scripts/generate_qr.py`) | ⬜ Not started | Needs waste points seeded first |
| Manual test: submit report → hotspot created | ⬜ Not started | |
| Manual test: second report within 50 m clusters | ⬜ Not started | |
| Manual test: priority score correct for all 5 factors | ⬜ Not started | |

**Legend:** ✅ Done / 🔄 In progress / ⬜ Not started / ❌ Blocked

---

## Integration Points

- **Member 1 (Routing):** consumes `GET /api/hotspots` and the `can_accept()` utility from `services/capacity.py`.
- **Member B (Dispatcher):** consumes `GET /api/hotspots`, `GET /api/trucks`; subscribes to polling.
- **Member C (Driver):** `PATCH /api/trucks/:id/load` increments `current_load_kg` — Member A must ensure the trucks endpoint is live.
- **Shared schema:** `waste_points`, `reports`, `hotspots`, `trucks`, `tasks` — agree with team before first migration.

---

## Key Decisions

- **PostGIS via Supabase** — `ST_DWithin` for spatial queries. Enable once in the Supabase SQL editor: `CREATE EXTENSION IF NOT EXISTS postgis;`
- **Supabase Storage** — report photos stored in the `report-photos` bucket; `image_url` in `reports` table holds the public URL. No Cloudinary needed.
- **Midpoint weights** — use category midpoint as default; driver overrides are the source of truth after collection.
- **Clustering window** — 50 m radius, 30 min window, configurable via `CLUSTER_RADIUS_M` / `CLUSTER_WINDOW_MIN` in `.env`.
