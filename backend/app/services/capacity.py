from sqlmodel import Session

from app.models import Truck, TruckStatus
from app.utils.constants import CAPACITY_WARN_PCT, CAPACITY_FULL_PCT


def capacity_pct(truck: Truck) -> float:
    if truck.max_capacity_kg == 0:
        return 0.0
    return (truck.current_load_kg / truck.max_capacity_kg) * 100


def remaining_kg(truck: Truck) -> float:
    return max(truck.max_capacity_kg - truck.current_load_kg, 0.0)


def can_accept(truck: Truck, estimated_weight_kg: float) -> bool:
    pct = capacity_pct(truck)
    return pct < CAPACITY_FULL_PCT and remaining_kg(truck) >= estimated_weight_kg


def update_truck_status(truck: Truck, session: Session) -> Truck:
    old_status = truck.status
    pct = capacity_pct(truck)
    if pct >= CAPACITY_FULL_PCT:
        truck.status = TruckStatus.full
    elif pct >= CAPACITY_WARN_PCT:
        truck.status = TruckStatus.near_full
    else:
        truck.status = TruckStatus.available
    session.add(truck)
    session.commit()
    session.refresh(truck)

    # Task 4: Trigger routing engine re-run if capacity status changes
    if old_status != truck.status:
        try:
            from app.services.routing import run_routing_engine
            run_routing_engine(session)
        except Exception as e:
            print(f"Error running routing engine on capacity threshold: {e}")

    return truck
