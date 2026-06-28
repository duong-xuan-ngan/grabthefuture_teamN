# Do Minh Triet — Dispatcher Experience

**Owner:** TBD
**Branch:** `feature/dispatcher-ui`

---

## Skill Overview

Member B owns everything the dispatcher sees: the live operations map, truck capacity bars, routing suggestion cards, the KPI dashboard, and the CSV export. The dispatcher is the primary power user — their screen must be clear, fast, and never hide information needed to make a decision.

---

## Responsibilities

| Feature | Req IDs | Description |
|---------|---------|-------------|
| Live Operations Map | F-MAP-01 / F-MAP-02 | Leaflet map: route polylines, truck markers (60 s poll), hotspot pins colour-coded by score, side panel on pin click |
| Truck Capacity UI | F-WEIGHT-04 / F-WEIGHT-05 | Live capacity bar per truck (green/amber/red); non-blocking warning at 70%; blocking alert at 90% |
| Dispatcher Approval UI | F-ROUTE-03 | Suggestion card: scenario label, truck ID, detour cost, capacity bar, Approve / Reject buttons |
| KPI Dashboard | F-DASH-01 / F-DASH-02 | Shift KPIs; repeat-offender table |
| CSV Export | F-DASH-03 | Admin export button + backend endpoint |

---

## Files Owned

```
frontend/src/pages/DispatcherPage.jsx        ← main dispatcher view
frontend/src/components/LiveMap.jsx          ← Leaflet map component
frontend/src/components/HotspotPin.jsx       ← colour-coded map marker
frontend/src/components/HotspotPanel.jsx     ← side panel (score, photos, suggestion)
frontend/src/components/SuggestionCard.jsx   ← scenario card with Approve/Reject
frontend/src/components/CapacityBar.jsx      ← reusable green/amber/red bar
frontend/src/components/KpiDashboard.jsx     ← shift KPIs widget
frontend/src/api/dispatcher.js               ← fetch wrappers for dispatcher endpoints
backend/app/routes/dashboard.py              ← GET /api/dashboard/kpis, repeat-offenders, export (stub)
backend/app/routes/routing.py                ← POST /api/routing/approve/:id, reject/:id (stub)
```

---

## UI Component Spec

### HotspotPin colour coding
| Priority Score | Colour |
|---------------|--------|
| < 40 | 🟢 Green |
| 40–69 | 🟡 Yellow |
| ≥ 70 | 🔴 Red |

### CapacityBar colour coding
| `capacity_pct` | Colour | Label |
|---------------|--------|-------|
| < 70% | Green | Available |
| 70–89% | Amber | Near Full |
| ≥ 90% | Red | Full — reassign |

### SuggestionCard fields
```
Scenario: SC-02 — High priority, cheap detour
Truck: Truck Alpha  |  Detour: +8 min  |  Capacity: [████░░░░░░] 60%
[ ✓ Approve ]  [ ✗ Reject ]
```

### Polling strategy
- `GET /api/hotspots` every **10 s** → update map pins + suggestion cards
- `GET /api/trucks` every **10 s** → update truck markers + capacity bars
- `GET /api/dashboard/kpis` every **60 s** → KPI widgets
- No WebSockets needed for MVP

---

## API Consumed

| Method | Path | Used by |
|--------|------|---------|
| GET | `/api/hotspots` | LiveMap, KpiDashboard |
| GET | `/api/trucks` | LiveMap, CapacityBar |
| POST | `/api/routing/approve/:id` | SuggestionCard |
| POST | `/api/routing/reject/:id` | SuggestionCard |
| GET | `/api/dashboard/kpis` | KpiDashboard |
| GET | `/api/dashboard/repeat-offenders` | KpiDashboard |
| GET | `/api/dashboard/export` | Export button |

---

## Progress Tracker

| Task | Status | Notes |
|------|--------|-------|
| Scaffold `DispatcherPage.jsx` with layout | ⬜ Not started | |
| `LiveMap.jsx` — Leaflet map + OpenStreetMap tiles | ⬜ Not started | Use `react-leaflet` |
| `HotspotPin.jsx` — colour-coded markers | ⬜ Not started | |
| `HotspotPanel.jsx` — side panel on pin click | ⬜ Not started | |
| `CapacityBar.jsx` — reusable bar component | ⬜ Not started | |
| `SuggestionCard.jsx` — scenario card | ⬜ Not started | |
| Wire Approve button → `POST /api/routing/approve/:id` | ⬜ Not started | |
| Wire Reject button → `POST /api/routing/reject/:id` | ⬜ Not started | |
| Truck markers on map (60 s poll) | ⬜ Not started | |
| `KpiDashboard.jsx` — shift KPIs | ⬜ Not started | |
| Repeat-offender table | ⬜ Not started | |
| Blocking alert modal at 90% capacity | ⬜ Not started | |
| Non-blocking warning toast at 70% capacity | ⬜ Not started | |
| `GET /api/dashboard/kpis` backend | ⬜ Not started | |
| `GET /api/dashboard/repeat-offenders` backend | ⬜ Not started | |
| CSV export button + backend endpoint | ✅ Done | `GET /api/dashboard/export?start&end`; Export button in Topbar |
| Responsive layout (desktop Chrome/Edge target) | ⬜ Not started | |
| End-to-end test: report → suggestion card appears | ⬜ Not started | |

**Legend:** ✅ Done / 🔄 In progress / ⬜ Not started / ❌ Blocked

---

## Integration Points

- **Member A:** depends on `GET /api/hotspots` and `GET /api/trucks` being live.
- **Member 1 (Routing):** `SuggestionCard` receives suggestions from `POST /api/routing/suggest`; Approve wires to `POST /api/routing/approve/:id`.
- **Member C:** capacity bar updates in real time when Member C's driver Done flow increments `current_load_kg`.

---

## Key Decisions

- **Leaflet + OpenStreetMap** — zero API key needed. `react-leaflet` wrapper for React integration.
- **Tailwind CSS** — utility classes only; no separate CSS files.
- **Polling not WebSockets** — 10 s poll is sufficient for 3 trucks and 5 users at MVP scale.
- **No component library** — custom components are faster to build than learning a new UI kit under time pressure.
- **Suggestion cards live in the side panel** — not a separate modal. Keeps map + suggestion visible simultaneously.
