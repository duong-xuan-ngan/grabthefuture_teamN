from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.models import Task, Hotspot, TaskStatus
from app.services.routing import run_routing_engine

router = APIRouter()


@router.post("/suggest")
def get_suggestions(session: Session = Depends(get_session)):
    suggestions = run_routing_engine(session)
    return {"suggestions": suggestions}


@router.post("/approve/{hotspot_id}")
def approve_suggestion(
    hotspot_id: int, truck_id: int, session: Session = Depends(get_session)
):
    hotspot = session.get(Hotspot, hotspot_id)
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    task = Task(hotspot_id=hotspot_id, truck_id=truck_id, status=TaskStatus.assigned)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.post("/reject/{hotspot_id}")
def reject_suggestion(hotspot_id: int, session: Session = Depends(get_session)):
    if not session.get(Hotspot, hotspot_id):
        raise HTTPException(status_code=404, detail="Hotspot not found")
    return {"status": "rejected", "hotspot_id": hotspot_id}
