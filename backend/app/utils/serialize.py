"""Serialization helpers shared by route handlers.

These build the *enriched* response shapes the frontend consumes (joined
waste-point data, derived severity labels, capacity fields) while keeping the
underlying SQLModel contract — used by the routing engine and other members —
untouched. Everything here is computed from real DB state; fields that are
straight-line proxies (distance/ETA via haversine) are labelled as such.
"""
from typing import Optional

from app.models import Hotspot, Report, Truck, WastePoint
from app.services.capacity import capacity_pct, remaining_kg
from app.utils.spatial import haversine_km, detour_minutes


def severity_label(priority_score: int) -> str:
    """green/amber/red bucket the dispatcher UI colours by (F-SCORE-02)."""
    if priority_score >= 70:
        return "high"
    if priority_score >= 40:
        return "mid"
    return "low"


def hotspot_view(hotspot: Hotspot, wp: Optional[WastePoint], photo_count: int) -> dict:
    """Hotspot joined with its waste point — gives the map pin a location."""
    return {
        "id":                  hotspot.id,
        "waste_point_id":      hotspot.waste_point_id,
        "name":                wp.name if wp else None,
        "area_type":           wp.area_type if wp else None,
        "category":            wp.category if wp else None,
        "lat":                 wp.lat if wp else None,
        "lng":                 wp.lng if wp else None,
        "estimated_weight_kg": wp.estimated_weight_kg if wp else None,
        # hotspot.severity stores the most-severe IssueType; the UI also wants a
        # green/amber/red label derived from the priority score.
        "issue_type":          hotspot.severity,
        "severity":            severity_label(hotspot.priority_score),
        "priority_score":      hotspot.priority_score,
        "report_count":        hotspot.report_count,
        "photos":              photo_count,
        "status":              hotspot.status,
        "created_at":          hotspot.created_at,
        "resolved_at":         hotspot.resolved_at,
    }


def truck_view(truck: Truck, driver: Optional[str], stops_left: int,
               route: Optional[list] = None) -> dict:
    """Truck with computed capacity + joined driver name and open-stop count.

    `route` is the active fixed-route waypoints ([[lat,lng],...]) so the
    dispatcher map can draw the truck's baseline route and animate it.
    """
    return {
        **truck.model_dump(),
        "capacity_pct":          round(capacity_pct(truck), 1),
        "remaining_capacity_kg": remaining_kg(truck),
        "driver":                driver,
        "stops_left":            stops_left,
        "route":                 route,
    }


def task_view(
    task,
    hotspot: Optional[Hotspot],
    wp: Optional[WastePoint],
    truck: Optional[Truck],
    photo_urls: list[str],
    sequence: int,
    ui_status: str,
) -> dict:
    """Driver task joined with hotspot + waste point + straight-line distance.

    distance_km / eta_minutes are haversine proxies (no road-network routing in
    the MVP fallback); they match the detour-cost model in spatial.py.
    """
    distance_km = None
    eta_minutes = None
    if truck and wp:
        distance_km = round(haversine_km(truck.lat, truck.lng, wp.lat, wp.lng), 1)
        eta_minutes = round(detour_minutes(truck.lat, truck.lng, wp.lat, wp.lng))

    return {
        "id":                  task.id,
        "hotspot_id":          task.hotspot_id,
        "waste_point_id":      task.waste_point_id if hasattr(task, "waste_point_id") else (wp.id if wp else None),
        "truck_id":            task.truck_id,
        "name":                wp.name if wp else None,
        "address":             wp.area_type if wp else None,
        "category":            wp.category if wp else None,
        "estimated_weight_kg": wp.estimated_weight_kg if wp else None,
        "issue_type":          hotspot.severity if hotspot else None,
        "priority_score":      hotspot.priority_score if hotspot else None,
        "photo_urls":          photo_urls,
        "sequence":            sequence,
        "distance_km":         distance_km,
        "eta_minutes":         eta_minutes,
        "status":              ui_status,
        "weight_collected_kg": task.weight_collected_kg,
        # Location fields for the driver map pin
        "lat":                 wp.lat if wp else None,
        "lng":                 wp.lng if wp else None,
        "truck_lat":           truck.lat if truck else None,
        "truck_lng":           truck.lng if truck else None,
    }
