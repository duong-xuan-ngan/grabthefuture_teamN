import json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from app.database import get_session
from app.models import Truck, Task, TaskStatus, User, Route
from app.services.capacity import capacity_pct, remaining_kg, update_truck_status
from app.utils.spatial import latlng_to_cell
from app.utils.serialize import truck_view

router = APIRouter()


def _driver_name(truck_id: int, session: Session) -> str | None:
    user = session.exec(
        select(User).where(User.truck_id == truck_id, User.role == "driver")
    ).first()
    return user.username if user else None


def _stops_left(truck_id: int, session: Session) -> int:
    return session.exec(
        select(func.count(Task.id)).where(
            Task.truck_id == truck_id,
            Task.status == TaskStatus.assigned,
        )
    ).one()


def _active_route(truck: Truck, session: Session) -> list | None:
    """Waypoints of the truck's active fixed route, if any."""
    route = None
    if truck.current_route_id:
        route = session.get(Route, truck.current_route_id)
    if not route:
        route = session.exec(
            select(Route).where(Route.truck_id == truck.id, Route.is_active == True)  # noqa: E712
        ).first()
    if not route:
        return None
    # Prefer road-snapped geometry; fall back to raw waypoints.
    for field in (route.geometry, route.waypoints):
        try:
            pts = json.loads(field)
            if pts:
                return pts
        except (ValueError, TypeError):
            continue
    return None


def _enrich(truck: Truck, session: Session) -> dict:
    return truck_view(
        truck,
        _driver_name(truck.id, session),
        _stops_left(truck.id, session),
        _active_route(truck, session),
    )


@router.get("")
def list_trucks(session: Session = Depends(get_session)):
    trucks = session.exec(select(Truck)).all()
    return {"trucks": [_enrich(t, session) for t in trucks]}


@router.patch("/{truck_id}/load")
def add_load(truck_id: int, weight_kg: float, session: Session = Depends(get_session)):
    truck = session.get(Truck, truck_id)
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    truck.current_load_kg += weight_kg
    truck = update_truck_status(truck, session)
    return _enrich(truck, session)


@router.patch("/{truck_id}/location")
def update_location(
    truck_id: int, lat: float, lng: float, session: Session = Depends(get_session)
):
    truck = session.get(Truck, truck_id)
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    truck.lat = lat
    truck.lng = lng
    truck.h3_cell = latlng_to_cell(lat, lng)
    session.add(truck)
    session.commit()
    session.refresh(truck)
    return _enrich(truck, session)


@router.post("/{truck_id}/reset-load")
def reset_load(truck_id: int, session: Session = Depends(get_session)):
    truck = session.get(Truck, truck_id)
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    truck.current_load_kg = 0.0
    truck = update_truck_status(truck, session)
    return _enrich(truck, session)
