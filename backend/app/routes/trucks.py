from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import Truck
from app.services.capacity import capacity_pct, remaining_kg, update_truck_status
from app.utils.spatial import latlng_to_cell

router = APIRouter()


@router.get("")
def list_trucks(session: Session = Depends(get_session)):
    trucks = session.exec(select(Truck)).all()
    return {
        "trucks": [
            {
                **t.model_dump(),
                "capacity_pct":        round(capacity_pct(t), 1),
                "remaining_capacity_kg": remaining_kg(t),
            }
            for t in trucks
        ]
    }


@router.patch("/{truck_id}/load")
def add_load(truck_id: int, weight_kg: float, session: Session = Depends(get_session)):
    truck = session.get(Truck, truck_id)
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    truck.current_load_kg += weight_kg
    truck = update_truck_status(truck, session)
    return {
        **truck.model_dump(),
        "capacity_pct":        round(capacity_pct(truck), 1),
        "remaining_capacity_kg": remaining_kg(truck),
    }


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
    return truck


@router.post("/{truck_id}/reset-load")
def reset_load(truck_id: int, session: Session = Depends(get_session)):
    truck = session.get(Truck, truck_id)
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    truck.current_load_kg = 0.0
    truck = update_truck_status(truck, session)
    return truck
