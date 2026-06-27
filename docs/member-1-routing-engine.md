# Member 1 — Routing Engine

**Owner:** TBD (dedicated routing engine member)
**Branch:** `feature/routing-engine`

---

## Skill Overview

The routing engine is the intelligence layer of WasteHotspot. It takes live hotspot data and truck states, runs a spatial lookup via H3 (`grid_disk` ring search), applies weight feasibility filters, and returns a ranked dispatch *suggestion* to the dispatcher. The dispatcher always approves or rejects — the engine never acts autonomously.

---

## Responsibilities

| Area | Description |
|------|-------------|
| H3 spatial indexing | Encode bin/truck lat+lng to an H3 cell (resolution 9); query candidate trucks via `grid_disk(cell, k)` ring lookup (ring-2 ≈ 600 m primary, ring-3 ≈ 900 m fallback) |
| Weight feasibility filter | Discard trucks where `remaining_capacity_kg < bin.estimated_weight_kg` or `capacity_pct ≥ 90%` |
| Detour cost calculation | `extra_minutes = haversine(truck, bin) / 25 km/h × 1.3` |
| Scenario matching | Evaluate SC-01 → SC-07 in order; return first match per hotspot |
| Tie-breaking | Equal score → older timestamp first; equal detour → more remaining capacity first |
| Re-run trigger | Engine re-runs on: hotspot score ≥ 70, capacity threshold crossing (70% / 90%), or driver marks Done |

---

## Files Owned

```
backend/app/services/routing.py   ← main logic (SC-01 → SC-07)
backend/app/utils/spatial.py      ← latlng_to_cell, get_ring_cells, haversine_km, detour_minutes, find_trucks_near (H3)
backend/app/services/capacity.py  ← can_accept, capacity_pct, remaining_kg
backend/app/routes/routing.py     ← POST /api/routing/suggest, /approve/:id, /reject/:id
```

---

## Scenario Reference

| ID | Trigger | Action |
|----|---------|--------|
| SC-01 | Score ≤ 40, truck in ring-1, `capacity_pct` < 70% | Keep fixed route |
| SC-02 | Score ≥ 70, detour ≤ 15 min, truck feasible in ring-2 | Reorder — insert hotspot as next stop |
| SC-03 | Score ≥ 70, current truck too far/heavy, second truck OK | Reassign to closer/lighter truck |
| SC-04 | Score 90–100, no feasible truck in ring-3 | Manual alert — surface all truck statuses |
| SC-05 | 2+ hotspots score ≥ 70 simultaneously | Greedy rank by score; assign per hotspot independently |
| SC-06 | Truck `capacity_pct` ≥ 70%, projected route exceeds 90% | Warn dispatcher; suggest swapping heavy stops |
| SC-07 | 1 report, no photo, weight < 40 kg | Mark Watching; re-evaluate in 15 min |

---

## API Contract

### Input (from DB, queried internally)
```json
{
  "hotspots": [{ "id": 1, "priority_score": 85, "waste_point": { "lat": 10.77, "lng": 106.70, "estimated_weight_kg": 150 } }],
  "trucks":   [{ "id": 1, "lat": 10.77, "lng": 106.69, "max_capacity_kg": 3000, "current_load_kg": 1800 }]
}
```

### Output
```json
[
  {
    "scenario": "SC-02",
    "hotspot_id": 1,
    "truck_id": 1,
    "detour_min": 8,
    "capacity_pct": 60,
    "action": "reorder"
  }
]
```

---

## Progress Tracker

| Task | Status | Notes |
|------|--------|-------|
| Read & understand requirements | ⬜ Not started | |
| `haversine_km` + `detour_minutes` | ✅ Done (spatial.py) | |
| `find_trucks_near` (H3 grid_disk ring lookup) | ✅ Done (spatial.py) | |
| `can_accept` weight feasibility check | ✅ Done (capacity.py) | |
| SC-01 through SC-04, SC-07 | ✅ Scaffolded (routing.py) | Needs integration testing |
| SC-05 (multi-hotspot greedy) | ✅ Done (routing.py) | Greedy by score; committed truck excluded from other hotspots' pool |
| SC-06 (mid-route weight warning) | ✅ Done (routing.py) | `_sc06_warnings` projects load from remaining heavy stops |
| Wire `POST /api/routing/suggest` | ✅ Done (routes/routing.py) | |
| Wire approve / reject endpoints | ✅ Done (routes/routing.py) | Feasibility-checked; ORS reorder on approve |
| OpenRouteService reorder (Haversine fallback) | ✅ Done (services/ors.py) | Optimizes stop order; falls back if no ORS key/quota |
| Unit test each scenario | ⬜ Not started | |
| Integration test with seed data | ⬜ Not started | |

**Legend:** ✅ Done / 🔄 In progress / ⬜ Not started / ❌ Blocked

---

## Key Decisions

- **No separate Matching Engine microservice** — matching logic lives as `run_routing_engine()` in `services/routing.py`. Over-engineered for MVP scale.
- **H3 resolution 9** — ~150 m cells. Ring-2 covers ~600 m (primary lookup), ring-3 covers ~900 m (fallback) before escalating to SC-04. `h3_cell` column on `waste_points` and `trucks` is B-tree indexed for fast `= ANY(cells)` queries.
- **Synchronous engine** — no message queue. Engine runs synchronously on trigger; result polled by frontend every 10 s.
- **No auto-dispatch** — engine always returns a suggestion. Dispatcher approval creates the Task record via `POST /api/routing/approve/:hotspot_id`.
