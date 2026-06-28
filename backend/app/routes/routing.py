import json
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, delete

from app.database import get_session
from app.models import (
    Task, Hotspot, Truck, WastePoint, TaskStatus, HotspotStatus, RouteSegment,
    RejectedSuggestion,
)
from app.services.routing import run_routing_engine
from app.services.capacity import can_accept, remaining_kg
from app.services.ors import optimize_stop_order
from app.utils.spatial import latlng_to_cell, get_ring_cells

router = APIRouter()


def _materialize_route_segments(
    truck: Truck, ordered_task_ids: list[int], session: Session
) -> None:
    """Store H3-indexed route segments for this truck (Nhóm 3 — route segment index).

    Each segment is the path from one stop to the next. The H3 cells along the
    segment are computed via h3.grid_path_cells so that _find_routes_near() can
    quickly answer "which trucks have a route passing near this hotspot?"
    """
    import h3

    # Clear existing segments for this truck.
    session.exec(delete(RouteSegment).where(RouteSegment.truck_id == truck.id))
    session.commit()

    # Build ordered list: truck start → wp1 → wp2 ...
    wp_positions: list[tuple[float, float]] = [(truck.lat, truck.lng)]
    task_ids_ordered: list[Optional[int]] = [None]  # None = truck start
    for task_id in ordered_task_ids:
        task = session.get(Task, task_id)
        if not task:
            continue
        hotspot = session.get(Hotspot, task.hotspot_id) if task.hotspot_id else None
        wp = session.get(WastePoint, hotspot.waste_point_id) if hotspot else None
        if wp:
            wp_positions.append((wp.lat, wp.lng))
            task_ids_ordered.append(task_id)

    for i in range(len(wp_positions) - 1):
        start_lat, start_lng = wp_positions[i]
        end_lat, end_lng = wp_positions[i + 1]
        start_cell = latlng_to_cell(start_lat, start_lng)
        end_cell = latlng_to_cell(end_lat, end_lng)
        try:
            cells = list(h3.grid_path_cells(start_cell, end_cell))
        except Exception:
            # Fallback: just use the two endpoint cells.
            cells = list({start_cell, end_cell})

        seg = RouteSegment(
            truck_id=truck.id,
            task_id=task_ids_ordered[i + 1],
            seq_order=i,
            h3_cells=json.dumps(cells),
            start_lat=start_lat,
            start_lng=start_lng,
            end_lat=end_lat,
            end_lng=end_lng,
        )
        session.add(seg)
    session.commit()


def _reorder_truck_route(truck: Truck, session: Session) -> list[int]:
    """Recompute the optimal visit order for a truck's open tasks (F-ROUTE)."""
    open_tasks = session.exec(
        select(Task).where(
            Task.truck_id == truck.id,
            Task.status == TaskStatus.assigned,
        )
    ).all()
    if not open_tasks:
        return []

    stops = []
    task_by_id = {}
    for t in open_tasks:
        hotspot = session.get(Hotspot, t.hotspot_id) if t.hotspot_id else None
        wp = session.get(WastePoint, hotspot.waste_point_id) if hotspot else None
        if not wp:
            continue
        stops.append({"id": t.id, "lat": wp.lat, "lng": wp.lng,
                      "weight_kg": wp.estimated_weight_kg})
        task_by_id[t.id] = t

    order = optimize_stop_order(truck.lat, truck.lng, stops, remaining_kg(truck))

    base = min(t.assigned_at for t in open_tasks)
    for i, task_id in enumerate(order):
        task = task_by_id.get(task_id)
        if task:
            task.assigned_at = base + timedelta(seconds=i)
            session.add(task)
    session.commit()
    return order


@router.post("/suggest")
def get_suggestions(session: Session = Depends(get_session)):
    suggestions = run_routing_engine(session)
    return {"suggestions": suggestions}


@router.post("/approve/{hotspot_id}")
def approve_suggestion(
    hotspot_id: int,
    truck_id: int,
    scenario: Optional[str] = None,
    action: Optional[str] = None,
    session: Session = Depends(get_session),
):
    hotspot = session.get(Hotspot, hotspot_id)
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")

    truck = session.get(Truck, truck_id)
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    existing = session.exec(
        select(Task).where(
            Task.hotspot_id == hotspot_id,
            Task.status == TaskStatus.assigned,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Hotspot already has an active task")

    wp = session.get(WastePoint, hotspot.waste_point_id) if hotspot.waste_point_id else None
    if wp and not can_accept(truck, wp.estimated_weight_kg):
        raise HTTPException(
            status_code=409,
            detail="Truck cannot accept this hotspot (over capacity or insufficient remaining weight)",
        )

    task = Task(
        hotspot_id=hotspot_id,
        truck_id=truck_id,
        status=TaskStatus.assigned,
        scenario_id=scenario,
        action=action,
    )
    session.add(task)
    session.commit()
    session.refresh(task)

    order = _reorder_truck_route(truck, session)
    session.refresh(task)
    _materialize_route_segments(truck, order, session)

    return {
        "status":      "approved",
        "task_id":     task.id,
        "hotspot_id":  hotspot_id,
        "truck_id":    truck_id,
        "scenario_id": scenario,
        "action":      action,
        "assigned_at": task.assigned_at,
        "route_order": order,
    }


@router.post("/reject/{hotspot_id}")
def reject_suggestion(
    hotspot_id: int,
    truck_id: Optional[int] = None,
    session: Session = Depends(get_session),
):
    if not session.get(Hotspot, hotspot_id):
        raise HTTPException(status_code=404, detail="Hotspot not found")

    if truck_id is not None:
        rej = RejectedSuggestion(hotspot_id=hotspot_id, truck_id=truck_id)
        session.add(rej)
        session.commit()

    return {"status": "rejected", "hotspot_id": hotspot_id, "truck_id": truck_id}

