import json
from typing import Optional
from sqlmodel import Session, select

from app.models import (
    Hotspot, Truck, WastePoint, HotspotStatus, Task, TaskStatus, TruckStatus,
    RouteSegment, Zone,
)
from app.utils.constants import (
    DETOUR_CHEAP_MIN, CAPACITY_WARN_PCT, CAPACITY_FULL_PCT,
    TRUCK_NEARBY_RING, TRUCK_FALLBACK_RING, SCORE_RERUN_THRESHOLD,
    HEAVY_STOP_KG,
)
from app.utils.spatial import detour_minutes, find_trucks_near, latlng_to_cell, get_ring_cells
from app.services.capacity import capacity_pct, can_accept, remaining_kg


def find_routes_near(lat: float, lng: float, k: int, session: Session) -> set[int]:
    """Return truck_ids whose route segments pass within ring-k of (lat, lng).

    This is Nhóm 3 — H3 Route Segment Index. It complements find_trucks_near
    (which finds trucks by current position) with trucks whose *upcoming route*
    already passes near the hotspot, enabling cheaper route insertion as SC-02.
    """
    center = latlng_to_cell(lat, lng)
    ring_cells = set(get_ring_cells(center, k))

    truck_ids = set()
    segments = session.exec(select(RouteSegment)).all()
    for seg in segments:
        try:
            seg_cells = set(json.loads(seg.h3_cells))
        except (ValueError, TypeError):
            continue
        if seg_cells & ring_cells:   # any overlap
            truck_ids.add(seg.truck_id)
    return truck_ids


def run_routing_engine(session: Session) -> list[dict]:
    """Evaluate all active hotspots and return one suggestion each.

    Implements SC-01 → SC-07. SC-05 (multiple simultaneous high-priority
    hotspots) is handled at this level: hotspots are processed highest-score
    first, and a truck committed to one hotspot is excluded from the candidate
    pool for the remaining ones (greedy, prevents over-dispatch). SC-06 is
    weight-triggered and added independently per truck.
    """
    hotspots = session.exec(
        select(Hotspot).where(Hotspot.status == HotspotStatus.active)
    ).all()

    # Drop hotspots that already have an open (assigned) task — they've been
    # dispatched and shouldn't be re-suggested.
    assigned_hotspot_ids = {
        t.hotspot_id
        for t in session.exec(
            select(Task).where(Task.status == TaskStatus.assigned)
        ).all()
    }
    hotspots = [h for h in hotspots if h.id not in assigned_hotspot_ids]

    # Tie-break: higher score first, then older first-report timestamp.
    candidates = [h for h in hotspots if h.priority_score >= SCORE_RERUN_THRESHOLD]
    candidates.sort(key=lambda h: (-h.priority_score, h.created_at))

    multi = len(candidates) >= 2  # SC-05 condition
    committed_truck_ids: set[int] = set()
    suggestions: list[dict] = []

    for h in candidates:
        s = _evaluate(h, session, committed_truck_ids, multi)
        if s:
            suggestions.append(s)
            if s.get("truck_id") is not None:
                committed_truck_ids.add(s["truck_id"])

    # Also evaluate low-priority hotspots (SC-01 / SC-07) that fell below the
    # rerun threshold, so the dispatcher still sees a suggestion for them.
    for h in hotspots:
        if h.priority_score >= SCORE_RERUN_THRESHOLD:
            continue
        s = _evaluate(h, session, committed_truck_ids, False)
        if s:
            suggestions.append(s)

    # SC-06: proactive overload warnings, independent of hotspots.
    suggestions.extend(_sc06_warnings(session))

    return suggestions


def _candidate_trucks(hotspot, session, excluded: set[int]):
    wp = session.get(WastePoint, hotspot.waste_point_id) if hotspot.waste_point_id else None
    lat = wp.lat if wp else None
    lng = wp.lng if wp else None
    if lat is None:
        return wp, []

    # Candidates by truck position (primary + fallback rings).
    nearby = find_trucks_near(session, lat, lng, TRUCK_NEARBY_RING)
    if not nearby:
        nearby = find_trucks_near(session, lat, lng, TRUCK_FALLBACK_RING)

    nearby_ids = {row["id"] for row in nearby}

    # Candidates by route segment proximity (Nhóm 3).
    route_truck_ids = find_routes_near(lat, lng, TRUCK_FALLBACK_RING, session)
    extra_ids = route_truck_ids - nearby_ids - excluded
    for truck_id in extra_ids:
        truck = session.get(Truck, truck_id)
        if truck and truck.status not in (TruckStatus.off_shift, TruckStatus.full):
            nearby.append({
                "id": truck.id, "name": truck.name,
                "lat": truck.lat, "lng": truck.lng,
                "h3_cell": truck.h3_cell, "status": truck.status,
                "max_capacity_kg": truck.max_capacity_kg,
                "current_load_kg": truck.current_load_kg,
            })

    enriched = []
    est_weight = wp.estimated_weight_kg if wp else 0
    for row in nearby:
        if row["id"] in excluded:
            continue
        truck = session.get(Truck, row["id"])
        if truck is None:
            continue
        enriched.append({
            "truck":    truck,
            "pct":      capacity_pct(truck),
            "feasible": can_accept(truck, est_weight),
            "detour":   detour_minutes(truck.lat, truck.lng, lat, lng),
        })
    return wp, enriched


def _get_zone_truck(hotspot: Hotspot, session: Session) -> Optional[Truck]:
    """SC-08: find the zone-assigned truck for this hotspot's location."""
    wp = session.get(WastePoint, hotspot.waste_point_id) if hotspot.waste_point_id else None
    if not wp:
        return None
    cell = latlng_to_cell(wp.lat, wp.lng)
    zones = session.exec(select(Zone)).all()
    for zone in zones:
        if not zone.truck_id:
            continue
        try:
            cells = set(json.loads(zone.h3_cells))
        except (ValueError, TypeError):
            continue
        if cell in cells or any(c in cells for c in get_ring_cells(cell, 1)):
            return session.get(Truck, zone.truck_id)
    return None


def _evaluate(hotspot, session, excluded: set[int], multi: bool) -> Optional[dict]:
    wp, enriched = _candidate_trucks(hotspot, session, excluded)
    if not wp:
        return None

    # SC-08: try zone truck first before global candidates.
    zone_truck = _get_zone_truck(hotspot, session)

    return (
        _sc08_zone(hotspot, enriched, zone_truck, excluded)
        or _sc01(hotspot, enriched)
        or _sc02(hotspot, enriched, multi)
        or _sc03(hotspot, enriched, multi)
        or _sc09_zone_overflow(hotspot, enriched, zone_truck)
        or _sc04(hotspot, enriched)
        or _sc07(hotspot, wp)
    )


def _sc08_zone(hotspot, trucks, zone_truck: Optional[Truck], excluded: set[int]) -> Optional[dict]:
    """SC-08: hotspot is in a zone with an assigned truck — prefer that truck.

    Only fires when the zone truck is feasible AND its detour is within the
    cheap threshold (≤ 15 min). Zone preference avoids unnecessary cross-zone
    dispatching when the zone truck can handle it.
    """
    if zone_truck is None or zone_truck.id in excluded:
        return None
    wp_match = next((t for t in trucks if t["truck"].id == zone_truck.id), None)
    if not wp_match:
        return None
    if not wp_match["feasible"]:
        return None
    if wp_match["detour"] > DETOUR_CHEAP_MIN:
        return None
    return _mk("SC-08", hotspot, wp_match, "zone_preferred")


def _sc09_zone_overflow(hotspot, trucks, zone_truck: Optional[Truck]) -> Optional[dict]:
    """SC-09: zone truck is overloaded/absent — suggest nearest adjacent-zone truck.

    Fires only for high-priority hotspots when the zone truck cannot serve.
    """
    if hotspot.priority_score < SCORE_RERUN_THRESHOLD:
        return None
    # Check zone truck is infeasible or absent.
    zone_failed = (
        zone_truck is None
        or not next((t for t in trucks if t["truck"].id == zone_truck.id and t["feasible"]), None)
    )
    if not zone_failed:
        return None
    # Find best feasible truck from outside the zone (already in candidates).
    alts = [t for t in trucks
            if t["feasible"] and t["detour"] <= DETOUR_CHEAP_MIN
            and (zone_truck is None or t["truck"].id != zone_truck.id)]
    if not alts:
        return None
    best = min(alts, key=lambda t: (t["detour"], -remaining_kg(t["truck"])))
    return _mk("SC-09", hotspot, best, "zone_overflow")


def _sc01(hotspot, trucks):
    if hotspot.priority_score > 40:
        return None
    for t in trucks:
        if t["pct"] < CAPACITY_WARN_PCT and t["detour"] < 45:
            return _mk("SC-01", hotspot, t, "keep_route")
    return None


def _sc02(hotspot, trucks, multi=False):
    if hotspot.priority_score < SCORE_RERUN_THRESHOLD:
        return None
    feasible = [t for t in trucks if t["feasible"] and t["detour"] <= DETOUR_CHEAP_MIN]
    feasible.sort(key=lambda t: (t["detour"], -remaining_kg(t["truck"])))
    if not feasible:
        return None
    # SC-05 marker: when 2+ high-priority hotspots compete, label the greedy pick.
    scenario = "SC-05" if multi else "SC-02"
    action = "assign_greedy" if multi else "reorder"
    return _mk(scenario, hotspot, feasible[0], action)


def _sc03(hotspot, trucks, multi=False):
    if hotspot.priority_score < SCORE_RERUN_THRESHOLD:
        return None
    alts = [t for t in trucks if t["feasible"] and t["detour"] <= DETOUR_CHEAP_MIN]
    if not alts:
        return None
    best = min(alts, key=lambda t: (t["detour"], -remaining_kg(t["truck"])))
    scenario = "SC-05" if multi else "SC-03"
    action = "assign_greedy" if multi else "reassign"
    return _mk(scenario, hotspot, best, action)


def _sc04(hotspot, trucks):
    if hotspot.priority_score < 90:
        return None
    return {"scenario": "SC-04", "hotspot_id": hotspot.id, "truck_id": None,
            "detour_min": None, "capacity_pct": None, "action": "manual_alert"}


def _sc07(hotspot, wp):
    if hotspot.report_count == 1 and wp.estimated_weight_kg < 40:
        return {"scenario": "SC-07", "hotspot_id": hotspot.id, "truck_id": None,
                "detour_min": None, "capacity_pct": None, "action": "watching"}
    return None


def _sc06_warnings(session: Session) -> list[dict]:
    """SC-06 — truck near capacity with heavy stops remaining on its route.

    Weight-triggered, not location-triggered. For each truck already at/over the
    warn threshold (70%), project the load it would carry after its remaining
    assigned heavy stops; if that projection crosses the full threshold (90%),
    surface a warning so the dispatcher can offload heavy stops to another truck.
    """
    out = []
    trucks = session.exec(select(Truck)).all()
    for truck in trucks:
        if truck.status == TruckStatus.off_shift:
            continue
        pct = capacity_pct(truck)
        if pct < CAPACITY_WARN_PCT:
            continue

        remaining_tasks = session.exec(
            select(Task).where(
                Task.truck_id == truck.id,
                Task.status == TaskStatus.assigned,
            )
        ).all()

        projected = truck.current_load_kg
        heavy_stops = 0
        for task in remaining_tasks:
            hotspot = session.get(Hotspot, task.hotspot_id) if task.hotspot_id else None
            wp = session.get(WastePoint, hotspot.waste_point_id) if hotspot else None
            est = wp.estimated_weight_kg if wp else 0
            projected += est
            if est >= HEAVY_STOP_KG:
                heavy_stops += 1

        projected_pct = (projected / truck.max_capacity_kg * 100) if truck.max_capacity_kg else 0
        if projected_pct >= CAPACITY_FULL_PCT and heavy_stops >= 1:
            out.append({
                "scenario":     "SC-06",
                "hotspot_id":   None,
                "truck_id":     truck.id,
                "detour_min":   None,
                "capacity_pct": round(pct, 1),
                "projected_pct": round(projected_pct, 1),
                "heavy_stops":  heavy_stops,
                "action":       "warn_offload",
            })
    return out


def _mk(scenario: str, hotspot, t: dict, action: str) -> dict:
    return {
        "scenario":     scenario,
        "hotspot_id":   hotspot.id,
        "truck_id":     t["truck"].id,
        "detour_min":   round(t["detour"], 1),
        "capacity_pct": round(t["pct"], 1),
        "action":       action,
    }
