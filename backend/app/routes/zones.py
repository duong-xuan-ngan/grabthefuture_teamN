import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select, func

from app.database import get_session
from app.models import Zone, Truck, Hotspot, HotspotStatus, WastePoint
from app.utils.spatial import latlng_to_cell, get_ring_cells
from app.utils.constants import CAPACITY_WARN_PCT, CAPACITY_FULL_PCT
from app.services.capacity import capacity_pct

router = APIRouter()


def _zone_status(zone: Zone, hotspot_count: int, truck_pct: float) -> str:
    if truck_pct >= CAPACITY_FULL_PCT or hotspot_count >= 4:
        return "overloaded"
    if truck_pct >= CAPACITY_WARN_PCT or hotspot_count >= 2:
        return "busy"
    return "normal"


def _hotspot_cell(lat: float, lng: float) -> str:
    return latlng_to_cell(lat, lng)


def detect_zone(lat: float, lng: float, session: Session) -> Optional[Zone]:
    """Find which zone a lat/lng belongs to (by H3 cell membership)."""
    cell = _hotspot_cell(lat, lng)
    zones = session.exec(select(Zone)).all()
    for zone in zones:
        try:
            cells = json.loads(zone.h3_cells)
        except (ValueError, TypeError):
            continue
        if cell in cells:
            return zone
        # Also check ring-1 of the cell for boundary hotspots.
        if any(c in cells for c in get_ring_cells(cell, 1)):
            return zone
    return None


@router.get("")
def list_zones(session: Session = Depends(get_session)):
    zones = session.exec(select(Zone)).all()
    result = []
    for zone in zones:
        truck = session.get(Truck, zone.truck_id) if zone.truck_id else None
        pct = round(capacity_pct(truck), 1) if truck else 0

        # Count active hotspots in this zone.
        try:
            zone_cells = set(json.loads(zone.h3_cells))
        except (ValueError, TypeError):
            zone_cells = set()

        active_hotspots = session.exec(
            select(Hotspot).where(Hotspot.status == HotspotStatus.active)
        ).all()
        hotspot_count = 0
        for h in active_hotspots:
            wp = session.get(WastePoint, h.waste_point_id) if h.waste_point_id else None
            if not wp:
                continue
            cell = _hotspot_cell(wp.lat, wp.lng)
            if cell in zone_cells or any(c in zone_cells for c in get_ring_cells(cell, 1)):
                hotspot_count += 1

        status = _zone_status(zone, hotspot_count, pct)

        # Update zone status in DB if changed.
        if zone.status != status:
            zone.status = status
            session.add(zone)
        session.commit()

        result.append({
            "id":             zone.id,
            "name":           zone.name,
            "color":          zone.color,
            "h3_cells":       json.loads(zone.h3_cells),
            "truck_id":       zone.truck_id,
            "truck_name":     truck.name if truck else None,
            "capacity_pct":   pct,
            "hotspot_count":  hotspot_count,
            "status":         status,
        })
    return {"zones": result}


class ZoneTruckUpdate(BaseModel):
    truck_id: Optional[int] = None


@router.patch("/{zone_id}/truck")
def assign_truck(
    zone_id: int,
    body: ZoneTruckUpdate,
    session: Session = Depends(get_session),
):
    zone = session.get(Zone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    if body.truck_id is not None and not session.get(Truck, body.truck_id):
        raise HTTPException(status_code=404, detail="Truck not found")
    zone.truck_id = body.truck_id
    session.add(zone)
    session.commit()
    session.refresh(zone)
    return {"id": zone.id, "name": zone.name, "truck_id": zone.truck_id}
