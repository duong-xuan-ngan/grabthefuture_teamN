import math
import h3
from sqlalchemy import text
from sqlmodel import Session

from app.utils.constants import AVG_SPEED_KMH, TRAFFIC_FACTOR, H3_RESOLUTION


def latlng_to_cell(lat: float, lng: float) -> str:
    return h3.latlng_to_cell(lat, lng, H3_RESOLUTION)


def get_ring_cells(cell: str, k: int) -> list[str]:
    return list(h3.grid_disk(cell, k))


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def detour_minutes(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    return (haversine_km(lat1, lng1, lat2, lng2) / AVG_SPEED_KMH) * 60 * TRAFFIC_FACTOR


def find_trucks_near(session: Session, lat: float, lng: float, k: int) -> list[dict]:
    """Find trucks whose h3_cell is within ring-k of the given lat/lng."""
    center = latlng_to_cell(lat, lng)
    cells = get_ring_cells(center, k)
    if not cells:
        return []
    sql = text("""
        SELECT id, name, lat, lng, h3_cell, status, max_capacity_kg, current_load_kg
        FROM trucks
        WHERE h3_cell = ANY(:cells)
        AND status NOT IN ('off_shift', 'full')
    """)
    rows = session.execute(sql, {"cells": cells}).mappings().all()
    return [dict(r) for r in rows]
