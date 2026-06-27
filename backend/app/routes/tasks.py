from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import Task, TaskStatus, Truck, Hotspot, HotspotStatus
from app.services.capacity import update_truck_status

router = APIRouter()


class TaskUpdateBody(BaseModel):
    status: TaskStatus
    weight_collected_kg: Optional[float] = None


@router.get("/driver/{truck_id}")
def get_driver_tasks(truck_id: int, session: Session = Depends(get_session)):
    tasks = session.exec(
        select(Task).where(Task.truck_id == truck_id, Task.status == TaskStatus.assigned)
    ).all()
    return {"tasks": tasks}


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

    if body.status == TaskStatus.done:
        task.completed_at = datetime.utcnow()
        if body.weight_collected_kg is not None:
            task.weight_collected_kg = body.weight_collected_kg
            truck = session.get(Truck, task.truck_id)
            if truck:
                truck.current_load_kg += body.weight_collected_kg
                update_truck_status(truck, session)

        hotspot = session.get(Hotspot, task.hotspot_id)
        if hotspot:
            hotspot.status = HotspotStatus.resolved
            hotspot.resolved_at = datetime.utcnow()
            session.add(hotspot)

    session.add(task)
    session.commit()
    session.refresh(task)
    return task
