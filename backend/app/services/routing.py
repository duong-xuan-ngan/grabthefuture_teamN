from typing import Optional
from sqlmodel import Session, select

from app.models import Hotspot, Truck, WastePoint, HotspotStatus
from app.utils.constants import (
    DETOUR_CHEAP_MIN, CAPACITY_WARN_PCT, CAPACITY_FULL_PCT,
    TRUCK_NEARBY_RING, TRUCK_FALLBACK_RING, SCORE_RERUN_THRESHOLD,
)
from app.utils.spatial import detour_minutes, find_trucks_near
from app.services.capacity import capacity_pct, can_accept


def run_routing_engine(session: Session) -> list[dict]:
    hotspots = session.exec(
        select(Hotspot).where(Hotspot.status == HotspotStatus.active)
    ).all()

    candidates = [h for h in hotspots if h.priority_score >= SCORE_RERUN_THRESHOLD]
    candidates.sort(key=lambda h: (-h.priority_score, h.created_at))

    return [s for h in candidates if (s := _evaluate(h, session))]


def _evaluate(hotspot: Hotspot, session: Session) -> Optional[dict]:
    wp = session.get(WastePoint, hotspot.waste_point_id)
    if not wp:
        return None

    nearby = find_trucks_near(session, wp.lat, wp.lng, TRUCK_NEARBY_RING)
    if not nearby:
        nearby = find_trucks_near(session, wp.lat, wp.lng, TRUCK_FALLBACK_RING)

    enriched = []
    for row in nearby:
        truck = session.get(Truck, row["id"])
        if truck is None:
            continue
        enriched.append({
            "truck":    truck,
            "pct":      capacity_pct(truck),
            "feasible": can_accept(truck, wp.estimated_weight_kg),
            "detour":   detour_minutes(truck.lat, truck.lng, wp.lat, wp.lng),
        })

    return (
        _sc01(hotspot, enriched)
        or _sc02(hotspot, enriched)
        or _sc03(hotspot, enriched)
        or _sc04(hotspot, enriched)
        or _sc07(hotspot, wp)
    )


def _sc01(hotspot, trucks):
    if hotspot.priority_score > 40:
        return None
    for t in trucks:
        if t["pct"] < CAPACITY_WARN_PCT and t["detour"] < 45:
            return _mk("SC-01", hotspot, t, "keep_route")
    return None


def _sc02(hotspot, trucks):
    if hotspot.priority_score < SCORE_RERUN_THRESHOLD:
        return None
    feasible = [t for t in trucks if t["feasible"] and t["detour"] <= DETOUR_CHEAP_MIN]
    feasible.sort(key=lambda t: (t["detour"], t["pct"]))
    return _mk("SC-02", hotspot, feasible[0], "reorder") if feasible else None


def _sc03(hotspot, trucks):
    if hotspot.priority_score < SCORE_RERUN_THRESHOLD:
        return None
    alts = [t for t in trucks if t["feasible"] and t["detour"] <= DETOUR_CHEAP_MIN]
    if not alts:
        return None
    best = min(alts, key=lambda t: (t["detour"], t["pct"]))
    return _mk("SC-03", hotspot, best, "reassign")


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


def _mk(scenario: str, hotspot: Hotspot, t: dict, action: str) -> dict:
    return {
        "scenario":     scenario,
        "hotspot_id":   hotspot.id,
        "truck_id":     t["truck"].id,
        "detour_min":   round(t["detour"], 1),
        "capacity_pct": round(t["pct"], 1),
        "action":       action,
    }
