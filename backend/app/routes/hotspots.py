from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from app.database import get_session
from app.models import Hotspot, Report, WastePoint, HotspotStatus, IssueType
from app.utils.serialize import hotspot_view

router = APIRouter()


def _photo_count(hotspot_id: int, session: Session) -> int:
    return session.exec(
        select(func.count(Report.id)).where(
            Report.hotspot_id == hotspot_id,
            Report.image_url.is_not(None),
        )
    ).one()


@router.get("")
def list_hotspots(
    status: Optional[HotspotStatus] = None,
    severity: Optional[IssueType] = None,
    session: Session = Depends(get_session)
):
    stmt = select(Hotspot)
    if status:
        stmt = stmt.where(Hotspot.status == status)
    if severity:
        stmt = stmt.where(Hotspot.severity == severity)
        
    hotspots = session.exec(stmt).all()
    out = []
    for h in hotspots:
        wp = session.get(WastePoint, h.waste_point_id)
        out.append(hotspot_view(h, wp, _photo_count(h.id, session)))
    return {"hotspots": out}



@router.get("/{hotspot_id}")
def get_hotspot(hotspot_id: int, session: Session = Depends(get_session)):
    hotspot = session.get(Hotspot, hotspot_id)
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    reports = session.exec(select(Report).where(Report.hotspot_id == hotspot_id)).all()
    waste_point = session.get(WastePoint, hotspot.waste_point_id)
    view = hotspot_view(hotspot, waste_point, _photo_count(hotspot_id, session))
    photo_urls = [r.image_url for r in reports if r.image_url]
    report_timestamps = [r.created_at for r in reports]
    return {
        **view,
        "reports": reports,
        "waste_point": waste_point,
        "photo_urls": photo_urls,
        "report_timestamps": report_timestamps,
    }
