from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select, func

from app.database import get_session
from app.models import Task, TaskStatus, Truck, Hotspot, HotspotStatus, WastePoint, Report
from app.services.capacity import update_truck_status
from app.services.clustering import reset_waste_point_status
from app.utils.serialize import task_view
from app.routes.routing import _reorder_truck_route, _materialize_route_segments
from app.services.routing import run_routing_engine

router = APIRouter()


class TaskUpdateBody(BaseModel):
    status: TaskStatus
    weight_collected_kg: Optional[float] = None


# UI uses active/pending/done/unreachable; the DB enum is assigned/done/unreachable.
# The first assigned task is shown as the "active" one, the rest as "pending".
def _ui_status(db_status: TaskStatus, is_first_assigned: bool) -> str:
    if db_status == TaskStatus.assigned:
        return "active" if is_first_assigned else "pending"
    return db_status.value


def _photo_count(hotspot_id: Optional[int], session: Session) -> int:
    if hotspot_id is None:
        return 0
    return session.exec(
        select(func.count(Report.id)).where(
            Report.hotspot_id == hotspot_id,
            Report.image_url.is_not(None),
        )
    ).one()


def _resolve_wp(hotspot: Optional[Hotspot], session: Session) -> Optional[WastePoint]:
    if not hotspot:
        return None
    return session.get(WastePoint, hotspot.waste_point_id)


@router.get("/driver/{truck_id}")
def get_driver_tasks(truck_id: int, session: Session = Depends(get_session)):
    tasks = session.exec(
        select(Task)
        .where(Task.truck_id == truck_id, Task.status != TaskStatus.done)
        .order_by(Task.assigned_at)
    ).all()
    truck = session.get(Truck, truck_id)

    out = []
    first_assigned_seen = False
    for i, t in enumerate(tasks):
        hotspot = session.get(Hotspot, t.hotspot_id) if t.hotspot_id else None
        wp = _resolve_wp(hotspot, session)
        is_first = t.status == TaskStatus.assigned and not first_assigned_seen
        if is_first:
            first_assigned_seen = True
        out.append(task_view(
            t, hotspot, wp, truck,
            _photo_count(t.hotspot_id, session),
            sequence=i + 1,
            ui_status=_ui_status(t.status, is_first),
        ))
    return {"tasks": out}


@router.get("/driver/{truck_id}/shift")
def get_shift_summary(truck_id: int, session: Session = Depends(get_session)):
    """Real shift metrics for the driver's Shift tab (replaces hardcoded demo).

    Computed from this truck's tasks: stops done/total, weight collected, time
    on shift (first assignment → now), average minutes per completed stop, and
    the most recent completed stops.
    """
    truck = session.get(Truck, truck_id)
    all_tasks = session.exec(
        select(Task).where(Task.truck_id == truck_id).order_by(Task.assigned_at)
    ).all()

    done = [t for t in all_tasks if t.status == TaskStatus.done]
    total = len(all_tasks)

    # Time on shift = from first assignment to now (minutes).
    shift_minutes = 0
    if all_tasks:
        first = all_tasks[0].assigned_at
        if first:
            shift_minutes = max(0, round((datetime.utcnow() - first).total_seconds() / 60))

    # Average minutes per completed stop (assigned → completed).
    per_stop = [
        (t.completed_at - t.assigned_at).total_seconds() / 60
        for t in done
        if t.completed_at and t.assigned_at
    ]
    avg_per_stop = round(sum(per_stop) / len(per_stop)) if per_stop else 0

    recent = []
    for t in done[-3:]:
        hotspot = session.get(Hotspot, t.hotspot_id) if t.hotspot_id else None
        wp = session.get(WastePoint, hotspot.waste_point_id) if hotspot else None
        recent.append({
            "id":   t.id,
            "name": wp.name if wp else None,
            "weight_collected_kg": t.weight_collected_kg,
        })

    weight_collected = sum(t.weight_collected_kg or 0 for t in done)

    return {
        "stops_done":       len(done),
        "stops_total":      total,
        "weight_collected_kg": round(weight_collected),
        "shift_minutes":    shift_minutes,
        "avg_per_stop_minutes": avg_per_stop,
        "current_load_kg":  truck.current_load_kg if truck else 0,
        "max_capacity_kg":  truck.max_capacity_kg if truck else 0,
        "recent_stops":     recent,
    }


@router.get("/{task_id}")
def get_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}")
def update_task(task_id: int, body: TaskUpdateBody, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = body.status

    # Get related truck, hotspot, and waste point
    truck = session.get(Truck, task.truck_id)
    hotspot = session.get(Hotspot, task.hotspot_id)
    wp = session.get(WastePoint, hotspot.waste_point_id) if hotspot and hotspot.waste_point_id else None

    # Task 2: If task is completed (done) or unreachable, update truck location to the waste point
    if body.status in (TaskStatus.done, TaskStatus.unreachable):
        if truck and wp:
            truck.lat = wp.lat
            truck.lng = wp.lng
            truck.h3_cell = wp.h3_cell
            session.add(truck)
            session.commit()
            session.refresh(truck)

    if body.status == TaskStatus.done:
        task.completed_at = datetime.utcnow()
        if body.weight_collected_kg is not None:
            task.weight_collected_kg = body.weight_collected_kg
            if truck:
                truck.current_load_kg += body.weight_collected_kg
                # update_truck_status will commit & refresh truck internally
                update_truck_status(truck, session)

        if hotspot:
            hotspot.status = HotspotStatus.resolved
            hotspot.resolved_at = datetime.utcnow()
            session.add(hotspot)
            reset_waste_point_status(hotspot.waste_point_id, session)

    session.add(task)
    session.commit()
    session.refresh(task)

    # Task 3: Reorder remaining stops and materialize route segments for the truck
    if truck:
        try:
            order = _reorder_truck_route(truck, session)
            _materialize_route_segments(truck, order, session)
        except Exception as e:
            # Prevent failures from breaking the main response
            print(f"Error reordering truck route: {e}")

    # Task 3: Trigger routing engine re-run after DB commit
    try:
        run_routing_engine(session)
    except Exception as e:
        print(f"Error running routing engine: {e}")

    return task
