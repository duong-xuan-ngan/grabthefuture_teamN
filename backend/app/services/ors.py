"""OpenRouteService Optimization integration (F-ROUTE).

Given a truck and a set of stops, returns an ordered stop sequence that
minimises travel. Calls the ORS Optimization API when ORS_API_KEY is set;
otherwise (or on any error/quota issue) falls back to a Haversine
nearest-neighbour ordering so the demo always runs — exactly the fallback
described in the Tech Stack doc.
"""
import os
from typing import Optional

import httpx

from app.utils.spatial import haversine_km

ORS_BASE = "https://api.openrouteservice.org/optimization"
ORS_DIRECTIONS = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"


def get_road_geometry(waypoints: list[list[float]]) -> list[list[float]]:
    """Snap a list of [lat, lng] waypoints to the road network.

    Returns a denser list of [lat, lng] points that follow real roads.
    Falls back to the original straight-line waypoints if ORS is unavailable
    or the key is missing — so the map always has *something* to draw.

    ORS uses [lng, lat] ordering; we accept and return [lat, lng].
    """
    if not waypoints or len(waypoints) < 2:
        return waypoints

    api_key = os.getenv("ORS_API_KEY")
    if not api_key:
        return waypoints

    # ORS Directions accepts up to 50+ coordinates; cap defensively.
    coords = [[lng, lat] for lat, lng in waypoints][:50]
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.post(
                ORS_DIRECTIONS,
                json={"coordinates": coords},
                headers={"Authorization": api_key},
            )
            r.raise_for_status()
            geo = r.json()["features"][0]["geometry"]["coordinates"]
        # geo is [[lng, lat], ...] → convert back to [lat, lng]
        return [[lat, lng] for lng, lat in geo]
    except Exception:
        return waypoints


def optimize_stop_order(
    start_lat: float,
    start_lng: float,
    stops: list[dict],
    truck_capacity_kg: Optional[float] = None,
) -> list[int]:
    """Return stop ids in an optimized visiting order.

    `stops` items: {"id": int, "lat": float, "lng": float, "weight_kg": float}.
    Tries ORS first, falls back to nearest-neighbour. Never raises.
    """
    if not stops:
        return []

    api_key = os.getenv("ORS_API_KEY")
    if api_key:
        try:
            return _ors_order(start_lat, start_lng, stops, truck_capacity_kg, api_key)
        except Exception:
            # Quota/network/parse error → fall through to heuristic.
            pass
    return _nearest_neighbour_order(start_lat, start_lng, stops)


def _ors_order(start_lat, start_lng, stops, capacity, api_key) -> list[int]:
    jobs = [
        {
            "id": s["id"],
            "location": [s["lng"], s["lat"]],
            "amount": [int(s.get("weight_kg", 0))],
        }
        for s in stops
    ]
    vehicle = {"id": 1, "start": [start_lng, start_lat]}
    if capacity is not None:
        vehicle["capacity"] = [int(capacity)]

    payload = {"jobs": jobs, "vehicles": [vehicle]}
    with httpx.Client(timeout=8.0) as client:
        r = client.post(ORS_BASE, json=payload, headers={"Authorization": api_key})
        r.raise_for_status()
        data = r.json()

    # ORS returns routes[].steps[] with type "job" carrying the job id in order.
    routes = data.get("routes", [])
    if not routes:
        raise ValueError("ORS returned no route")
    order = [step["job"] for step in routes[0].get("steps", []) if step.get("type") == "job"]
    if not order:
        raise ValueError("ORS route had no job steps")
    return order


def _nearest_neighbour_order(start_lat, start_lng, stops) -> list[int]:
    remaining = list(stops)
    order = []
    cur_lat, cur_lng = start_lat, start_lng
    while remaining:
        nxt = min(
            remaining,
            key=lambda s: haversine_km(cur_lat, cur_lng, s["lat"], s["lng"]),
        )
        order.append(nxt["id"])
        cur_lat, cur_lng = nxt["lat"], nxt["lng"]
        remaining.remove(nxt)
    return order
