from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import Hotspot, Report, WastePoint

router = APIRouter()


@router.get("")
def list_hotspots(session: Session = Depends(get_session)):
    hotspots = session.exec(select(Hotspot)).all()
    return {"hotspots": hotspots}


@router.get("/{hotspot_id}")
def get_hotspot(hotspot_id: int, session: Session = Depends(get_session)):
    hotspot = session.get(Hotspot, hotspot_id)
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    reports = session.exec(select(Report).where(Report.hotspot_id == hotspot_id)).all()
    waste_point = session.get(WastePoint, hotspot.waste_point_id)
    return {"hotspot": hotspot, "reports": reports, "waste_point": waste_point}
