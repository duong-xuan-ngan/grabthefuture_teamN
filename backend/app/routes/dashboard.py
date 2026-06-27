from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func

from app.database import get_session
from app.models import Hotspot, HotspotStatus, WastePoint

router = APIRouter()


@router.get("/kpi")
def get_kpi(session: Session = Depends(get_session)):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    opened = session.exec(
        select(func.count(Hotspot.id)).where(Hotspot.created_at >= today)
    ).one()

    resolved = session.exec(
        select(func.count(Hotspot.id)).where(
            Hotspot.status == HotspotStatus.resolved,
            Hotspot.resolved_at >= today,
        )
    ).one()

    open_count = session.exec(
        select(func.count(Hotspot.id)).where(Hotspot.status == HotspotStatus.active)
    ).one()

    return {
        "hotspots_opened_today":   opened,
        "hotspots_resolved_today": resolved,
        "open_count":              open_count,
    }


@router.get("/repeat-offenders")
def get_repeat_offenders(session: Session = Depends(get_session)):
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    stmt = (
        select(Hotspot.waste_point_id, func.count(Hotspot.id).label("hotspot_count"))
        .where(Hotspot.created_at >= thirty_days_ago)
        .group_by(Hotspot.waste_point_id)
        .having(func.count(Hotspot.id) >= 3)
        .order_by(func.count(Hotspot.id).desc())
    )
    rows = session.exec(stmt).all()
    result = []
    for waste_point_id, count in rows:
        wp = session.get(WastePoint, waste_point_id)
        result.append({"waste_point": wp, "hotspot_count": count})
    return {"repeat_offenders": result}
