# WasteHotspot MVP Milestones

This plan is based on the Technical Requirements Document v1.1 and the current project implementation under `grabthefuture_teamN`.

## Current State Audit

### Mostly Implemented

| Feature | Evidence in project | Remaining risk |
|---|---|---|
| F-QR resident reporting | `frontend/src/pages/ResidentPage.jsx`, `backend/app/routes/reports.py`, `backend/app/routes/bins.py`, admin QR URLs | Need production `APP_URL`, photo bucket credentials, and QR export/demo verification |
| F-CLUSTER hotspot clustering | `backend/app/services/clustering.py` | Clustering currently keys primarily by same `waste_point_id`; verify true 50 m behavior for ad-hoc reports |
| F-SCORE priority scoring | `backend/app/services/priority_score.py`, constants in `backend/app/utils/constants.py` | Formula uses configured area names and schedule heuristic; test all scoring branches |
| F-WEIGHT capacity model | `backend/app/models.py`, `backend/app/services/capacity.py`, driver weight flow | Need visible 70% warning and 90% blocking alert polish in dispatcher UI |
| F-ROUTE routing suggestions | `backend/app/services/routing.py`, `backend/app/routes/routing.py`, ORS fallback in `backend/app/services/ors.py` | Scenario tests missing; constants use H3 resolution 8 while TRD says resolution 9 |
| F-MAP dispatcher map | `frontend/src/pages/DispatcherPage.jsx`, `MapPanel`, routes/zones/trucks APIs | Need end-to-end visual QA with real backend data |
| F-DRIVER mobile flow | `frontend/src/pages/DriverPage.jsx`, `backend/app/routes/tasks.py` | No periodic polling after first load; needs mobile QA and role-based truck selection |
| F-DASH KPIs/export | `backend/app/routes/dashboard.py`, dispatcher KPI strip, Topbar export | Repeat offenders endpoint exists but UI currently shows area analytics, not explicit repeat-offender table |
| Auth | `backend/app/routes/auth.py`, `backend/app/dependencies/auth.py`, frontend login | Enforcement is off by default unless `AUTH_REQUIRED=true`; deployment decision needed |
| Demo seed | `backend/scripts/seed.py`, migrations | Must be run against target DB and smoke-tested before deploy |

### Main Gaps To Close

1. Deployment files and environment templates are missing or incomplete for Vercel + Render/Railway.
2. The frontend README still references an Express backend and `localhost:3000`; backend is FastAPI on `8000`.
3. H3 defaults do not match the TRD exactly: code uses resolution 8 with ring 1/2; TRD asks resolution 9 with ring 2/3.
4. Re-optimisation is computed on demand by `/api/routing/suggest`, but there is no persisted suggestions table or push trigger. This is acceptable for MVP polling, but should be explicitly demo-tested.
5. Dispatcher approval does not persist rejected suggestions, so a rejected hotspot may show the same suggestion again on next poll.
6. Driver app uses `VITE_DRIVER_TRUCK_ID` or `1`, instead of using the authenticated user's `truck_id`.
7. Supabase photo upload is optional/fallback; production bucket setup is not verified.
8. There are no automated scenario tests for SC-01 through SC-07 or end-to-end tests for report -> suggest -> approve -> driver done.

## Milestone 0 - Stabilize The Baseline

**Goal:** make the existing app reproducible locally and align docs with reality.

**Status on 2026-06-28:** complete for local MVP baseline. Env templates, docs, H3 defaults, ignore rules, frontend dependency install, frontend build, backend dependency install, H3 import check, `/health`, Supabase/Postgres migrations, seed idempotency, and API smoke checks are done. `npm audit` reports a Vite/esbuild advisory whose automated fix requires a breaking Vite major upgrade, so defer that to a deliberate dependency-upgrade task.

**Tasks**

- Done: add/complete `.env.example` at project root with `DATABASE_URL`, `JWT_SECRET`, `AUTH_REQUIRED`, `APP_URL`, `ORS_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `CAPACITY_WARN_PCT`, `CAPACITY_FULL_PCT`, `H3_RESOLUTION`, `TRUCK_NEARBY_RING`, and `TRUCK_FALLBACK_RING`.
- Done: update `frontend/README.md` so it references FastAPI at `http://localhost:8000`, not Express at `localhost:3000`.
- Done: align H3 defaults with TRD v1.1: `H3_RESOLUTION=9`, `TRUCK_NEARBY_RING=2`, `TRUCK_FALLBACK_RING=3`.
- Done: remove generated `__pycache__` files from the working tree and add ignore rules for future cache/build artifacts.
- Done: add compatibility migrations for the existing Supabase Alembic revision `20260628_0001` and legacy `routes` schema.
- Done: run migrations and seed against the configured Supabase/Postgres database.

**Acceptance checks**

- Done: `alembic upgrade head` succeeds against Supabase/Postgres. SQLite is not a valid migration target because migrations use PostgreSQL `DO $$` enum blocks.
- Done: `python scripts/seed.py` succeeds twice against the selected Postgres database without corrupting data.
- Done: `GET /health` returns `{"status":"ok"}` via FastAPI test client.
- Done: frontend production build succeeds after `npm install`.
- Done: API smoke checks pass for `/api/hotspots`, `/api/trucks`, `/api/dashboard/kpis`, `/api/routes`, `/api/bins`, and `/api/routing/suggest`.

## Milestone 1 - Complete Core Backend Contracts

**Goal:** every TRD Must Have API behaves correctly with seeded data.

**Tasks**

- Verify `POST /api/reports` persists before returning 200 and clusters a second report at the same bin within 30 minutes.
- Add or verify ad-hoc 50 m clustering behavior if reports can arrive without `waste_point_id`.
- Verify hotspot detail includes report timestamps, uploaded photos, report count, severity, score, and map coordinates.
- Confirm bin categories and `estimated_weight_kg` defaults match TRD midpoints.
- Add backend tests for priority score factors: severity, report count cap, sensitive area, truck far, repeat offender.
- Add backend tests for capacity transitions: `<70`, `70-89`, `>=90`, and `can_accept`.

**Acceptance checks**

- `F-QR-01` through `F-QR-03` pass with real API calls.
- `F-CLUSTER-01` and `F-CLUSTER-02` pass with two reports and a photo.
- `F-SCORE-01` formula produces expected scores for representative cases.
- `F-WEIGHT-01`, `F-WEIGHT-02`, and `F-WEIGHT-06` are covered by tests or scripts.

## Milestone 2 - Routing Engine Confidence

**Goal:** suggestions are trustworthy enough for a live demo.

**Tasks**

- Add scenario tests for SC-01 through SC-07 using seeded or in-memory SQLModel sessions.
- Fix SC-03 if needed so it actually distinguishes "current truck too far/heavy" from SC-02 rather than duplicating the same feasible candidate logic.
- Decide MVP behavior for rejected suggestions: keep ephemeral, store a rejection record, or suppress per hotspot for the current session.
- Verify `/api/routing/approve/{hotspot_id}` creates exactly one assigned task and rejects over-capacity trucks.
- Verify ORS failure fallback still reorders tasks deterministically.
- Confirm SC-06 warnings appear when projected remaining heavy stops push a truck over 90%.

**Acceptance checks**

- High priority hotspot returns SC-02 or SC-03 within 5 seconds.
- Critical hotspot with no feasible truck returns SC-04.
- Multiple high-priority hotspots use SC-05 greedy assignment without double-booking a truck.
- Approving a suggestion creates a driver-visible task.

## Milestone 3 - Dispatcher MVP Polish

**Goal:** dispatcher can monitor, decide, approve/reject, and report from one screen.

**Tasks**

- Verify Leaflet map renders fixed route polylines, truck markers, waste point markers, and hotspot markers with score labels.
- Ensure hotspot click opens a side panel with score, report count, issue type, photos, age, suggestion, capacity bar, and Approve/Reject buttons.
- Add explicit 70% non-blocking warning state and 90% blocking alert state if current UI only color-codes bars.
- Add repeat-offender table to the Reports tab or clearly rename current area analytics as an extension.
- Wire date-range controls for CSV export if the demo needs chosen ranges; otherwise document all-time export.
- QA desktop layout at common widths: 1366x768, 1440x900, 1920x1080.

**Acceptance checks**

- Dispatcher sees updated hotspot/truck/KPI data within the polling interval.
- Approve creates a task and the suggestion card changes state.
- Reject is visible and does not create a task.
- Capacity colors match green `<70`, amber `70-89`, red `>=90`.

## Milestone 4 - Driver MVP Polish

**Goal:** driver can complete assigned work without dispatcher calls.

**Tasks**

- Use `truck_id` from login response instead of hard-coded `VITE_DRIVER_TRUCK_ID` when auth is enabled.
- Add driver task polling or refresh-on-focus so newly approved tasks appear without a page reload.
- Verify task detail shows location map, issue type, report photos, estimated weight, and large Done/Unreachable actions.
- Verify Done opens weight input pre-filled from bin category default.
- Ensure Done increments truck load, resolves hotspot, resets waste point status, and updates dispatcher on next poll.
- QA mobile layout on Chrome mobile and Safari-sized viewport.

**Acceptance checks**

- Login as `driver1` lands on that driver's truck tasks.
- Done with edited weight updates `current_load_kg`.
- Crossing 70% or 90% changes truck status and dispatcher capacity display.
- Unreachable updates task status and keeps operational state understandable.

## Milestone 5 - Admin, QR, And Demo Data

**Goal:** seed and admin tools can prepare a convincing hackathon demo.

**Tasks**

- Verify Admin QR Management lists all seeded waste points and generates `/r?b={id}` URLs using deployed `APP_URL`.
- Verify downloaded QR SVG scans on mobile and opens the correct bin form.
- Verify manager account creation, manager URL, emergency declaration, and hotspot escalation.
- Make seed data match the demo story: 25-30 waste points, 2-3 trucks, fixed routes, one high-priority hotspot, one near-capacity truck scenario.
- Document demo accounts and route through the whole flow once.

**Acceptance checks**

- QR scan -> resident form -> submit -> confirmation -> status page works.
- Admin emergency -> priority 100 hotspot -> routing suggestion appears.
- Demo accounts work: admin, dispatcher, driver1, driver2, selected manager accounts.

## Milestone 6 - Deployment

**Goal:** deploy backend, frontend, and database with production-like environment settings.

**Tasks**

- Supabase:
  - Create hosted Postgres project.
  - Create `report-photos` storage bucket and confirm public URL behavior.
  - Run Alembic migrations.
  - Run seed script.
- Backend on Render/Railway:
  - Add `Procfile` or `render.yaml`.
  - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT` from `backend`, or equivalent.
  - Set env vars: `DATABASE_URL`, `JWT_SECRET`, `AUTH_REQUIRED`, `APP_URL`, `ORS_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`.
  - Confirm CORS works with the Vercel frontend URL.
- Frontend on Vercel:
  - Set root directory to `frontend`.
  - Set `VITE_API_URL` to deployed backend URL.
  - Set `VITE_USE_MOCK=false`.
  - Set `VITE_POLL_INTERVAL=10000`.
- Smoke test deployed URLs end to end.

**Acceptance checks**

- Deployed `/health` passes.
- Deployed frontend login works.
- Resident public route works without auth.
- Dispatcher/driver/admin routes work with auth if `AUTH_REQUIRED=true`.
- CSV export downloads from deployed frontend.

## Milestone 7 - Final Verification And Demo Script

**Goal:** turn the implementation into a reliable presentation.

**Tasks**

- Write a 5-minute demo script:
  1. Dispatcher opens live map and KPIs.
  2. Resident scans QR and submits overflow report with optional photo.
  3. System clusters/scores hotspot.
  4. Routing suggestion appears with detour and capacity.
  5. Dispatcher approves.
  6. Driver sees task, marks Done, confirms weight.
  7. Dispatcher sees hotspot resolved and truck capacity update.
  8. Admin exports CSV or shows repeat offenders.
- Run the script twice on deployed infrastructure.
- Capture fallback screenshots in case network or ORS quota fails.
- Prepare a short "what we built vs what is next" slide:
  - Built: QR reports, clustering, scoring, routing suggestions, dispatcher approval, driver weight update, KPIs/export.
  - Next: persistent suggestion history, stronger auth/RLS, production map ETAs, WebSocket updates, richer operations analytics.

**Acceptance checks**

- Full demo path completes in under 5 minutes.
- No page requires browser devtools or database manual edits.
- Team knows the recovery path if ORS or photo upload is unavailable.

## Priority Order

1. Milestone 0: local reproducibility.
2. Milestone 1: backend contract correctness.
3. Milestone 2: routing scenario confidence.
4. Milestone 3 and 4 in parallel: dispatcher and driver polish.
5. Milestone 5: QR/admin/demo story.
6. Milestone 6: deploy.
7. Milestone 7: rehearse and harden the presentation.

## Definition Of Done For MVP

The MVP is deployable when a resident report can create or update a hotspot, the hotspot receives a visible Priority Score, the dispatcher receives a feasible route suggestion with detour and truck capacity, the dispatcher can approve it, the driver can complete it with a collected weight, and the dashboard reflects resolution and capacity changes without manual database intervention.
