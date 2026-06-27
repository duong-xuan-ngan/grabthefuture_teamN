# WasteHotspot — Technical Requirements Document

> **Version 1.1** | MVP Scope | Grab the Green Future Hackathon
>
> *Fixed route is the baseline. Hotspot response is the intelligence layer.*

---

## Table of Contents

1. [User Story Table](#1-user-story-table)
2. [Weight Model](#2-weight-model)
3. [Routing Scenarios](#3-routing-scenarios)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Task Allocation](#6-task-allocation)
7. [Tech Stack](#7-tech-stack)

---

## 1. User Story Table

| ID | Role | I want to… | So that… | Priority | Feature |
|----|------|------------|----------|----------|---------|
| US-01 | Dispatcher | view a live map of all waste points, truck locations, and active hotspots | I can monitor the entire collection operation from a single screen | High | F-MAP |
| US-02 | Dispatcher | see a Priority Score (0–100) for each hotspot | I can quickly identify which overflowing point needs attention first | High | F-SCORE |
| US-03 | Dispatcher | receive an AI-generated suggestion (keep route / reorder / reassign truck) | I can make a dispatch decision in seconds without mental math | High | F-ROUTE |
| US-04 | Dispatcher | see the Detour Cost (extra minutes) and remaining truck capacity for each suggestion | I can weigh urgency against operational cost and feasibility before confirming | High | F-ROUTE |
| US-05 | Dispatcher | approve or reject a route suggestion with one tap | I remain in control and am never bypassed by automation | High | F-ROUTE |
| US-06 | Dispatcher | see a warning when a truck is near its weight limit | I can proactively dispatch a second truck before an overflow situation occurs | High | F-WEIGHT |
| US-07 | Dispatcher | view a dashboard with today's KPIs (hotspots raised, resolved, avg. response time) | I can report operational performance at end of shift | Medium | F-DASH |
| US-08 | Dispatcher | see which waste points are repeat offenders | I can recommend long-term infrastructure changes | Medium | F-DASH |
| US-09 | Driver | see my current task list and the location of any assigned hotspot on my phone | I know exactly where to go without calling the dispatcher | High | F-DRIVER |
| US-10 | Driver | mark a task as Done or Unreachable | The dispatcher and dashboard reflect real-world status instantly | High | F-DRIVER |
| US-11 | Driver | input the estimated waste weight collected at each stop | The system can track remaining truck capacity and warn when I'm near the limit | High | F-WEIGHT |
| US-12 | Resident | scan a QR code on a bin to open a report form instantly | I can report overflow without downloading an app or remembering a hotline | High | F-QR |
| US-13 | Resident | submit a report with issue type and optional photo | I can provide evidence so the dispatcher can verify urgency | High | F-QR |
| US-14 | System | cluster multiple reports at the same location into one hotspot automatically | Dispatchers are not overwhelmed by duplicate alerts | High | F-CLUSTER |
| US-15 | System | recalculate the optimised route when a new high-priority hotspot appears or a truck nears capacity | The suggestion offered to the dispatcher always reflects current conditions | High | F-ROUTE |
| US-16 | Admin | pre-load fixed routes, truck capacity, and truck positions before each shift | The routing engine has accurate baseline data to optimise against | High | F-ROUTE |
| US-17 | Admin | export a CSV of historical hotspot data | We can analyse patterns outside the system | Low | F-DASH |

---

## 2. Weight Model

This section defines how bin weight and truck capacity are modelled in the MVP. Because no IoT weight sensors are assumed, the model uses **driver-entered estimates** and **bin category defaults**.

### 2.1 Bin Weight Categories

Each waste point is assigned a category that determines its default estimated weight per collection.

| Category | Example Locations | Estimated Weight per Collection |
|----------|------------------|---------------------------------|
| Small residential | Street-side bins, alley bins | 20–40 kg |
| Medium residential | Apartment block bins | 50–100 kg |
| Market / commercial | Wet markets, food courts | 100–200 kg |
| Large public area | Parks, schools, event venues | 80–150 kg |

> **MVP simplification:** the system uses the midpoint of each range as the default estimate. Drivers can override the estimate after collection.

### 2.2 Truck Capacity Model

Each truck has two capacity attributes tracked in real time during a shift.

| Attribute | Description |
|-----------|-------------|
| `max_capacity_kg` | Physical weight limit of the truck (set by admin at shift start, e.g. 3,000 kg) |
| `current_load_kg` | Running total of waste collected so far in the shift |
| `remaining_capacity_kg` | `max_capacity_kg − current_load_kg` (computed field) |
| `capacity_pct` | `current_load_kg / max_capacity_kg × 100` (used for UI colour coding) |

### 2.3 Capacity Thresholds

| Threshold | `capacity_pct` | Meaning | System Action |
|-----------|---------------|---------|---------------|
| Available | < 70% | Truck can accept more stops | Normal routing |
| Near Full | 70–89% | Truck is getting heavy | Warn dispatcher; deprioritise assigning new hotspots to this truck |
| Full | ≥ 90% | Truck should return to depot | Remove truck from available pool; alert dispatcher |

### 2.4 Weight-Aware Feasibility Check

Before the routing engine assigns a hotspot to a truck, it runs a feasibility check:

```
can_accept = (truck.remaining_capacity_kg >= bin.estimated_weight_kg)
```

If `can_accept` is false, the truck is excluded from the candidate list for that hotspot regardless of its detour cost. A truck at ≥ 90% capacity is also excluded from all hotspot assignments until it returns to depot and the driver resets the load counter.

### 2.5 How Weight Updates Work (MVP Flow)

1. Driver arrives at a bin and collects waste.
2. Driver taps **Done** on the task card, which reveals a weight input field (pre-filled with the bin category default).
3. Driver adjusts the value if needed and confirms.
4. `current_load_kg` for the truck is incremented by the entered value.
5. If `capacity_pct` crosses 70% or 90%, the dispatcher dashboard updates in real time.

---

## 3. Routing Engine

### 3.1 Workflow Evaluation

The submitted diagram shows a pipeline adapted from a **ride-hailing / food-delivery order-matching system** (Grab-style). The core steps are: H3 geospatial indexing → store in Postgres with H3 cell index → retrieve nearest collectors via 1-hop H3 neighbours → Matching Engine → Balance and Assign → Route undelivered items.

**What fits our project well:**

| Concept from diagram | How it maps to WasteHotspot |
|----------------------|----------------------------|
| H3 indexing on incoming location | Index each hotspot's bin GPS into an H3 cell at resolution 8–9 (≈ 150–300 m cells); enables fast nearest-truck lookup without computing full distances to every truck |
| 1-hop H3 neighbour retrieval | When a hotspot fires, query trucks whose current H3 cell is in the hotspot cell's ring-1 neighbourhood — a simple `H3.kRing(cell, 1)` call instead of a geospatial radius scan |
| Postgres as the indexed store | Already our chosen DB; storing H3 cell IDs as indexed varchar columns is trivial and fast |
| Balance and Assign step | Directly maps to our weight feasibility check + detour cost comparison before issuing a dispatch suggestion |

**What does not fit and should be dropped:**

| Diagram concept | Problem for WasteHotspot |
|----------------|--------------------------|
| "Top các user gần đó" (top nearby users) | In delivery, you match a passive customer to an active driver. In WasteHotspot, the "demand" is a bin hotspot and the "supply" is a truck — there is no user-side matching pool to query |
| "Router từ các item đang có mà chưa giao" (route undelivered items) | This implies a parcel-delivery queue. We do not have a queue of items awaiting delivery; we have a fixed-route truck that needs to detour to a single hotspot |
| Matching Engine as a separate service | Over-engineered for MVP. The matching logic is a small function inside the routing engine, not a separate microservice |

**Verdict:** adopt the spatial-indexing concept and the Balance/Assign logic. Implement spatial lookups with **H3** (Uber's hierarchical hexagonal grid) at resolution 9, using `grid_disk(cell, k)` ring queries to retrieve candidate trucks — directly mirroring the original Grab-style diagram. Each `waste_point` and `truck` stores an indexed `h3_cell`; candidate lookup is a fast `h3_cell = ANY(:cells)` query against the ring set. The `h3` Python package computes cells in-process, so no database extension is required. Drop the user-matching pool and parcel-queue concepts — they belong to a different problem domain.

---

### 3.2 Adapted Routing Workflow

The routing workflow for WasteHotspot, using H3 ring queries:

```
Hotspot created (QR report clustered, Priority Score computed)
        │
        ▼
[1] Encode hotspot bin location to an H3 cell
    → h3.latlng_to_cell(bin.lat, bin.lng, 9) stored as indexed h3_cell
        │
        ▼
[2] Retrieve candidate trucks via H3 ring lookup
    → cells = h3.grid_disk(hotspot_cell, 2)   # ring-2 ≈ 600 m
    → SELECT trucks WHERE h3_cell = ANY(cells)
    → fallback: expand to ring-3 (≈ 900 m) if no truck found in ring-2
        │
        ▼
[3] Weight feasibility filter
    → discard any truck where remaining_capacity_kg < bin.estimated_weight_kg
    → discard any truck where capacity_pct ≥ 90%
        │
        ▼
[4] Detour cost calculation (per surviving candidate truck)
    → extra_minutes = haversine(truck.pos, bin.pos) / avg_speed × 1.3
        │
        ▼
[5] Scenario matching (SC-01 → SC-07, first match wins)
    → returns: scenario_id, truck_id, detour_minutes, truck capacity_pct
        │
        ▼
[6] Suggestion surfaced to dispatcher
    → dispatcher approves or rejects
        │
        ▼
[7] On approval: task written to DB, driver notified
    On rejection: hotspot stays active, dispatcher handles manually
        │
        ▼
[8] Driver marks Done → weight_collected_kg logged → truck load updated
    → routing engine re-runs for any remaining active hotspots
```

**Spatial lookup for MVP:** Steps 1–2 use H3 `grid_disk` ring queries at resolution 9 — ring-2 (≈ 600 m) as the primary lookup, ring-3 (≈ 900 m) as the fallback before escalating to SC-04 (manual dispatch alert). Cells are computed in-process by the `h3` Python package and matched against indexed `h3_cell` columns, so no database extension is required. This directly preserves the H3 indexing approach from the original Grab-style diagram.

---

### 3.3 Scenario Table

The routing engine evaluates each active hotspot against the scenarios below **in order** and returns the first match as a suggestion to the dispatcher. The engine re-runs when:
- A new hotspot reaches Priority Score ≥ 70, or
- A truck's `capacity_pct` crosses 70% or 90%, or
- A driver marks a task as Done.

> **Design principle:** the system never dispatches a truck autonomously. Every scenario produces a *suggestion*; the dispatcher always makes the final call.

**Optimisation objective:** maximise the number of high-priority hotspots resolved within 30 minutes while minimising total distance travelled, subject to each truck's remaining weight capacity.

**Tie-breaking rules:**
- Two hotspots with equal Priority Score → serve the one with the older first-report timestamp first.
- Two trucks with equal detour cost → prefer the one with more remaining capacity.

| ID | Scenario Name | Trigger Condition | Weight Check | Spatial Lookup (H3) | System Action | Rationale |
|----|--------------|-------------------|--------------|------------------|---------------|-----------|
| SC-01 | Low priority, truck arriving soon | Priority Score ≤ 40; scheduled truck < 45 min away | `capacity_pct` < 70% | Truck in ring-1 (≈ 300 m, on fixed route) | Keep fixed route unchanged | Lowest disruption; route integrity maintained |
| SC-02 | High priority, cheap detour | Priority Score ≥ 70; nearest truck detour ≤ 15 min | `remaining_capacity_kg` ≥ bin estimated weight | Truck in ring-2 (≈ 600 m) | Reorder stops: insert hotspot as next stop for that truck | Handles urgency without significant delay to other stops |
| SC-03 | High priority, current truck too far or too heavy | Priority Score ≥ 70; current truck detour > 15 min OR `capacity_pct` ≥ 70%; a second truck exists with detour ≤ 15 min | Second truck passes feasibility check | Second truck in ring-2 (≈ 600 m) | Reassign hotspot to the closer/lighter truck | Avoids sending a near-full truck; minimises total distance |
| SC-04 | Critical priority, no feasible truck in range | Priority Score 90–100; all trucks in ring-3 either detour > 30 min or fail weight check | All trucks fail feasibility | No truck in ring-3 (≈ 900 m) passes | Alert dispatcher for manual decision; display all truck statuses and ETAs | Human judgment required; system surfaces full context |
| SC-05 | Multiple simultaneous hotspots | 2+ active hotspots with Priority Score ≥ 70 at same time | Per-truck feasibility check for each hotspot | grid_disk ring lookup runs per hotspot independently | Rank by Priority Score; assign greedily to nearest feasible truck per hotspot | Prevents over-dispatching; highest-value hotspot resolved first |
| SC-06 | Truck near capacity, approaching heavy bins | Any truck `capacity_pct` ≥ 70% with 2+ heavy stops remaining on fixed route | Projected load exceeds 90% before depot return | N/A (weight-triggered, not location-triggered) | Warn dispatcher; suggest swapping remaining heavy stops to another truck with capacity | Proactive overload prevention mid-route |
| SC-07 | Single unverified report | Only 1 report, no photo, low-sensitivity area, bin category weight < 40 kg | N/A | N/A | No dispatch; flag as Watching; re-evaluate after 15 min or if a second report arrives | Avoids false positives; preserves dispatcher trust |

---

### 3.4 Weight Scenario Detail: SC-06

SC-06 is triggered by weight accumulation on a running route, not by a hotspot.

**Example:**
- Truck A has collected 2,400 kg of 3,000 kg capacity (`capacity_pct` = 80%).
- Truck A has 3 stops remaining: two market bins (est. 150 kg each) + one small residential bin (est. 30 kg).
- Projected final load: 2,400 + 150 + 150 + 30 = **2,730 kg (91%)** — exceeds the 90% threshold.
- System flags to dispatcher: *"Truck A projected to reach 91% capacity before completing route. Consider offloading the 2 market stops to Truck B."*

---

## 4. Functional Requirements

All **Must Have** items are in scope for the hackathon MVP.

### F-QR — QR Reporting

| Req. ID | Description | Priority |
|---------|-------------|----------|
| F-QR-01 | Each physical bin has a unique QR code encoding its bin ID and GPS coordinate. Scanning opens a mobile-friendly web form pre-filled with bin location. No app install required. | Must Have |
| F-QR-02 | The form offers four issue types: Overflow, Near Full, Bulky Waste, Bad Smell. Resident may optionally add a photo and short text note. | Must Have |
| F-QR-03 | On submit, a confirmation message is shown to the resident. The report is persisted immediately and triggers the clustering check (F-CLUSTER). | Must Have |

### F-CLUSTER — Hotspot Clustering

| Req. ID | Description | Priority |
|---------|-------------|----------|
| F-CLUSTER-01 | Reports within 50 m radius submitted within 30 minutes are merged into one hotspot. The hotspot inherits the most severe issue type from any constituent report. | Must Have |
| F-CLUSTER-02 | The hotspot detail view shows: count of reports, list of timestamps, all uploaded photos, and map pin. | Must Have |

### F-SCORE — Priority Score

| Req. ID | Description | Priority |
|---------|-------------|----------|
| F-SCORE-01 | Score (0–100) computed on creation and on each new constituent report. Formula: severity base (Overflow = 60, Full = 40, Near Full = 20) + 5 per additional report (cap +20) + 15 if within 100 m of market/school/apartment + 20 if scheduled truck > 3 h away + 10 if location is a repeat offender (3+ hotspots in 30 days). Cap at 100. | Must Have |
| F-SCORE-02 | Priority Score is visible on the map pin (colour-coded: green < 40, yellow 40–69, red ≥ 70) and in the hotspot detail panel. | Must Have |

### F-WEIGHT — Weight Tracking

| Req. ID | Description | Priority |
|---------|-------------|----------|
| F-WEIGHT-01 | Each waste point is assigned a category (small residential, medium residential, market/commercial, large public) with a default estimated weight. Admin can override per-bin. | Must Have |
| F-WEIGHT-02 | Each truck has a configurable `max_capacity_kg` set at shift start by admin. | Must Have |
| F-WEIGHT-03 | After marking a task Done, the driver sees a weight input pre-filled with the bin category default. Confirmed value increments `current_load_kg` for that truck. | Must Have |
| F-WEIGHT-04 | Dispatcher dashboard shows a live capacity bar for each truck (green < 70%, amber 70–89%, red ≥ 90%). | Must Have |
| F-WEIGHT-05 | When a truck reaches 70% capacity, a non-blocking warning appears on the dispatcher dashboard. When it reaches 90%, a blocking alert is shown and the truck is removed from the routing candidate pool. | Must Have |
| F-WEIGHT-06 | The feasibility check (`remaining_capacity_kg ≥ bin.estimated_weight_kg`) runs before any truck is included in a routing suggestion. | Must Have |

### F-ROUTE — Routing Engine

| Req. ID | Description | Priority |
|---------|-------------|----------|
| F-ROUTE-01 | For each candidate truck, compute: detour cost (extra minutes via straight-line × 1.3 traffic factor) and weight feasibility check. | Must Have |
| F-ROUTE-02 | Evaluate active hotspots against scenarios SC-01 through SC-07. Return the first matching suggestion per hotspot: scenario label, affected truck, detour cost, current truck `capacity_pct`. | Must Have |
| F-ROUTE-03 | Dispatcher sees the suggestion as a card: scenario label, truck name, detour cost, truck capacity bar, Approve/Reject buttons. | Must Have |
| F-ROUTE-04 | Re-run the routing engine when: a hotspot reaches Priority Score ≥ 70, a truck crosses a capacity threshold (70% or 90%), or a driver marks a task Done. | Must Have |

### F-MAP — Live Operations Map

| Req. ID | Description | Priority |
|---------|-------------|----------|
| F-MAP-01 | Web dashboard map shows: fixed route polylines, truck position markers (updated every 60 s via driver app), waste point markers coloured by status, active hotspot markers with Priority Score label. | Must Have |
| F-MAP-02 | Clicking a hotspot marker opens a side panel: Priority Score, report count, issue type, photos, time since first report, suggested action, truck capacity bar, Approve/Reject buttons. | Must Have |

### F-DRIVER — Driver Mobile View

| Req. ID | Description | Priority |
|---------|-------------|----------|
| F-DRIVER-01 | Mobile web view shows the driver their current task: hotspot location map, issue type, photos from reports, and estimated weight. Large buttons: Done / Unreachable. | Must Have |
| F-DRIVER-02 | After tapping Done, driver confirms/adjusts collected weight. Status updates to Resolved; `current_load_kg` increments. Both actions update the live map immediately. | Must Have |
| F-DRIVER-03 | Driver can see their own truck's current load and remaining capacity at the top of the task view. | Should Have |

### F-DASH — Dashboard & Reporting

| Req. ID | Description | Priority |
|---------|-------------|----------|
| F-DASH-01 | Dispatcher dashboard shows: hotspots opened today, hotspots resolved, average response time (report to Done), current open count by severity, and a live capacity bar per truck. | Must Have |
| F-DASH-02 | Table of waste points with ≥ 3 hotspots in the last 30 days, sorted by hotspot count descending. Used to flag infrastructure problems. | Should Have |
| F-DASH-03 | Admin can export hotspot data (location, severity, response time, truck assigned, weight collected) as CSV for a chosen date range. | Nice to Have |

---

## 5. Non-Functional Requirements

| Req. ID | Category | Requirement |
|---------|----------|-------------|
| NFR-01 | Performance | Map and hotspot list must load within 3 seconds on a standard 4G mobile connection. |
| NFR-02 | Performance | Routing suggestion (including weight feasibility check) must be computed and displayed within 5 seconds of a triggering event. |
| NFR-03 | Availability | System uptime ≥ 95% during operating hours (05:00–22:00). Acceptable for hackathon MVP; production target would be 99.5%. |
| NFR-04 | Usability | Resident QR form must be completable in under 60 seconds with no instructions. Driver task view requires no training beyond a 5-minute briefing. |
| NFR-05 | Usability | All interactive elements must meet a minimum tap target size of 44 × 44 px for mobile use. |
| NFR-06 | Scalability | MVP must support up to 30 waste points, 3 trucks, and 5 concurrent users. Architecture should not require re-design for up to 300 waste points. |
| NFR-07 | Reliability | A submitted resident report must not be lost even if the network drops after the HTTP POST completes. Use server-side persistence before returning 200 OK. |
| NFR-08 | Security | QR report form is unauthenticated (by design). Dispatcher and driver views require simple token-based login. No sensitive personal data is collected from residents. |
| NFR-09 | Maintainability | Priority Score formula, routing thresholds, weight category defaults, and capacity alert thresholds are stored as configurable constants — not hard-coded — so they can be tuned after pilot feedback without redeployment. |
| NFR-10 | Compatibility | Resident and driver views must function on Chrome/Safari mobile (iOS 14+, Android 10+). Dispatcher dashboard targets Chrome/Edge desktop. |

---

## 6. Task Allocation

The routing engine is owned by a dedicated fourth team member and is not listed below. The three remaining members are assigned tasks to achieve equal effort distribution.

> **Split principle:** Member A owns the backend data pipeline, Member B owns the dispatcher experience, Member C owns the driver experience and integration glue.

### Member A — Backend & Data Pipeline

| Req. ID(s) | Task | Description | Priority |
|------------|------|-------------|----------|
| F-QR-01 | QR Code Generation | Generate unique QR codes per bin (encode bin ID + GPS). Produce printable PNG assets for physical placement. | High |
| F-QR-02 / F-QR-03 | Resident Report Form & API | Build mobile web form; `POST /api/reports` endpoint; return confirmation response. | High |
| F-CLUSTER-01 / F-CLUSTER-02 | Hotspot Clustering Logic | Implement 50 m / 30 min clustering; aggregate photos and metadata into hotspot object. | High |
| F-SCORE-01 / F-SCORE-02 | Priority Score Engine | Implement scoring formula with all weighted factors; expose via `GET /api/hotspots`. | High |
| F-WEIGHT-01 / F-WEIGHT-02 | Bin & Truck Weight Model | Seed bin categories with default weights; `max_capacity_kg` config per truck; expose via API. | High |
| F-WEIGHT-06 | Weight Feasibility Check | Implement `remaining_capacity_kg ≥ bin.estimated_weight_kg` check; expose as a utility function consumed by the routing engine. | High |

### Member B — Dispatcher Experience

| Req. ID(s) | Task | Description | Priority |
|------------|------|-------------|----------|
| F-MAP-01 / F-MAP-02 | Live Operations Map | Integrate map library; render route polylines, truck markers (60 s poll), hotspot pins with colour coding and detail popup including capacity bar. | High |
| F-WEIGHT-04 / F-WEIGHT-05 | Truck Capacity UI | Live capacity bar per truck on dashboard (green/amber/red); non-blocking warning at 70%; blocking alert at 90%. | High |
| F-ROUTE-03 | Dispatcher Approval UI | Suggestion card component: scenario label, truck ID, detour cost, capacity bar, Approve/Reject buttons. Wire to backend. | High |
| F-DASH-01 / F-DASH-02 | KPI Dashboard Panel | Compute and render shift KPIs including weight collected; repeat-offender table. | Medium |
| F-DASH-03 | CSV Export | Admin export endpoint + download button; include weight column in export. | Low |

### Member C — Driver Experience & Integration

| Req. ID(s) | Task | Description | Priority |
|------------|------|-------------|----------|
| F-DRIVER-01 / F-DRIVER-02 / F-DRIVER-03 | Driver Mobile View | Token-authenticated mobile web view: task card, map pin, estimated weight display, Done / Unreachable buttons; `PATCH /api/tasks/:id` endpoint; weight input on Done flow; increment `current_load_kg`. | High |
| F-WEIGHT-03 | Weight Input Flow | Post-Done weight confirmation screen pre-filled with category default; driver can override; confirmed value sent to server. | High |
| F-ROUTE-04 | Re-optimisation Trigger Hook | Watch for hotspot score ≥ 70, task completions, and truck capacity threshold crossings; call routing engine (Member 1); push updated suggestion to dispatcher UI via polling. | High |
| NFR-07 / NFR-08 | Auth, Persistence & Error Handling | Token login for dispatcher and driver; server-side report persistence; global error handling and loading states. | Medium |
| — | Demo Data Seed Script | Seed 25 waste points with categories/weights, 2 fixed routes, 2 trucks with capacity, and a scripted hotspot + weight scenario for the live demo. | Medium |

### Collaboration Points

- **Member A** exposes `/api/hotspots` (with Priority Score) and the weight feasibility utility consumed by the routing engine (Member 1) and Member B's map.
- **Member C**'s re-optimisation trigger fires on weight threshold crossings — it must subscribe to the same truck state that Member A's API maintains.
- **Member C**'s demo seed script exercises the full flow: QR report → cluster → score → weight check → routing suggestion → dispatcher approval → driver Done → weight update.
- All members must align on the **shared data model** before writing the first line of code.

### Shared Data Model

```
waste_points  { id, name, lat, lng, area_type, category, estimated_weight_kg, normal_collection_time }
reports       { id, waste_point_id, issue_type, description, image_url, lat, lng, created_at, status }
hotspots      { id, waste_point_id, report_count, severity, priority_score, status, created_at, resolved_at }
trucks        { id, name, lat, lng, status, current_route_id, max_capacity_kg, current_load_kg }
tasks         { id, hotspot_id, truck_id, status, assigned_at, completed_at, weight_collected_kg }
```

---

## 7. Tech Stack

### Overview

```
Browser (Dispatcher / Driver / Resident / Admin)
        │
        ▼
React + Vite SPA + Leaflet + OpenStreetMap
        │  REST API (polling every 10 s)
        ▼
FastAPI Backend (Python)
        │
        ├── Supabase PostgreSQL (indexed h3_cell columns)
        ├── H3 spatial indexing (h3 Python package, in-process)
        ├── Supabase Storage (report photos)
        ├── OpenRouteService Optimization API
        └── Python services: priority_score.py / clustering.py / routing.py / capacity.py
```

---

### Frontend

| Choice | Why |
|--------|-----|
| **React + Vite** | Fast setup, familiar, excellent hot reload for hackathon speed |
| **React Router** | Dispatcher, driver, resident, and admin are separate routes — no separate apps needed |
| **Leaflet + OpenStreetMap** | Free, no API key, integrates naturally with OpenRouteService data |
| **Tailwind CSS** | Rapid UI without managing CSS architecture |
| **No component library** | A few custom components are enough: map panel, task card, hotspot card, KPI card |

---

### Backend

| Choice | Why |
|--------|-----|
| **FastAPI** | Fast, concise, auto-generates Swagger docs, strong validation via Pydantic |
| **Pydantic** | Standardises request/response schemas for reports, hotspots, trucks, and tasks |
| **Uvicorn** | Lightweight ASGI server; easy to run locally and deploy |
| **REST API** | Sufficient for MVP; easy to divide tasks across members; straightforward to debug |
| **Polling every 10 s** | Simpler than WebSockets; works well enough for the demo |

---

### Database & Storage

| Choice | Why |
|--------|-----|
| **Supabase PostgreSQL** | Hosted Postgres with a clean dashboard; the whole team shares one DB without local Docker setup |
| **H3 spatial indexing** | Uber's hexagonal grid; the `h3` Python package computes cells in-process, so nearby-truck lookups are a fast indexed `h3_cell = ANY(cells)` query — no DB extension required |
| **SQLAlchemy / SQLModel** | Natural fit for Python/FastAPI; avoids the Prisma/Node mismatch |
| **Alembic** | Standard migration tool for Python backends |
| **Supabase Storage** | Stores report photos and returns a public URL for `reports.image_url`; no Cloudinary needed |

**H3 spatial lookup pattern:**

```python
import h3

# Encode each waste point / truck position to a resolution-9 cell (stored in indexed h3_cell column)
cell = h3.latlng_to_cell(lat, lng, 9)

# Find candidate trucks within ring-2 (≈ 600 m) of a hotspot
cells = h3.grid_disk(hotspot_cell, 2)
```

```sql
-- h3_cell is a plain indexed varchar column — no PostGIS extension needed
CREATE INDEX idx_waste_points_h3 ON waste_points (h3_cell);
CREATE INDEX idx_trucks_h3       ON trucks (h3_cell);

-- Example: find candidate trucks whose cell is in the hotspot's ring set
SELECT * FROM trucks
WHERE h3_cell = ANY(:cells)
  AND status NOT IN ('off_shift', 'full');
```

> H3 cells are computed by the `h3` Python package in-process — no database extension to enable.

---

### Routing & Intelligence Layer

| Choice | Why |
|--------|-----|
| **OpenRouteService Optimization API** | Computes real road-network routes from OpenStreetMap data; has a Vehicle Routing Problem (VRP) endpoint; free tier is sufficient for MVP |
| **Fallback heuristic** | If the ORS API is down or quota is exhausted, the system falls back to Haversine distance + fixed-route insertion so the demo still runs |
| **Python service modules** | Logic is split into focused files: `priority_score.py`, `clustering.py`, `routing.py`, `capacity.py` — one owner per file maps cleanly to task allocation |
| **OR-Tools (optional)** | Only add if the team has capacity and wants custom VRP optimisation beyond what ORS provides |

**OpenRouteService integration sketch:**

```python
# routing.py — call ORS Optimization endpoint
import httpx

ORS_BASE = "https://api.openrouteservice.org/optimization"

async def get_optimized_route(truck: Truck, stops: list[Stop], api_key: str) -> Route:
    payload = {
        "jobs": [{"id": s.id, "location": [s.lng, s.lat], "amount": [s.estimated_weight_kg]} for s in stops],
        "vehicles": [{"id": truck.id, "start": [truck.lng, truck.lat], "capacity": [truck.remaining_capacity_kg]}],
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(ORS_BASE, json=payload, headers={"Authorization": api_key})
        r.raise_for_status()
        return parse_ors_response(r.json())
```

---

### Auth

| Choice | Why |
|--------|-----|
| **Simple JWT (manual)** | Sufficient for dispatcher/driver demo. Supabase Auth is skipped for now — its RLS policies and session management add configuration overhead that isn't worth the time at hackathon pace |

---

### Deployment

| Choice | Why |
|--------|-----|
| **Vercel** | Deploy the React frontend from GitHub in one click; free tier, custom domain optional |
| **Render / Railway** | Deploy FastAPI backend easily; both support Python with a `Procfile` or `render.yaml` |
| **Supabase** | Hosted database and storage; no infrastructure to manage |
| **OpenRouteService** | Hosted routing API; no self-hosting needed |

---

### What to Skip

- **No Docker Compose** — Supabase is hosted; no local DB to containerise.
- **No WebSockets** — polling every 10 s is sufficient at MVP scale (3 trucks, 5 users).
- **No Supabase Auth** — simple JWT is faster to implement and easier to demo.
- **No OR-Tools** — use ORS Optimization API first; add OR-Tools only if there is time and a clear reason.
- **No Redis / message queues** — synchronous FastAPI endpoints are sufficient for MVP throughput.

---

### Environment Variables (`.env`)

```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key
DATABASE_URL=postgresql://postgres:pass@db.your-project.supabase.co:5432/postgres

# Routing
ORS_API_KEY=your-openrouteservice-key

# Auth
JWT_SECRET=change_me_in_production

# App
PORT=8000
```

---

*End of document.*
