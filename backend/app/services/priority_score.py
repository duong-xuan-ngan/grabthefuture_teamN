from datetime import datetime, timedelta
from sqlmodel import Session, select, func

from app.models import Hotspot, WastePoint, Report, WasteEventSource
from app.utils.constants import (
    SEVERITY_BASE_SCORE, AREA_BONUS_TYPES, SCHEDULED_TRUCK_FAR_HOURS,
)

_SOURCE_BONUS = {
    WasteEventSource.emergency: 30,
    WasteEventSource.business:  10,
    WasteEventSource.driver:     5,
    WasteEventSource.resident:   0,
    WasteEventSource.sensor:     5,
}


def compute_priority_score(hotspot: Hotspot, session: Session) -> int:
    waste_point = session.get(WastePoint, hotspot.waste_point_id) if hotspot.waste_point_id else None
    # Ad-hoc hotspots (no registered waste_point) skip area/truck/repeat bonuses.

    score = SEVERITY_BASE_SCORE.get(hotspot.severity.value, 20)
    score += min((hotspot.report_count - 1) * 5, 20)

    if waste_point and waste_point.area_type in AREA_BONUS_TYPES:
        score += 15

    if waste_point and _is_truck_far(waste_point, session):
        score += 20

    if waste_point and _is_repeat_offender(waste_point.id, session):
        score += 10

    # Source bonus: emergency/business/driver events get extra confidence weight.
    latest_report = session.exec(
        select(Report).where(Report.hotspot_id == hotspot.id).order_by(Report.created_at.desc())
    ).first()
    if latest_report and hasattr(latest_report, "source"):
        score += _SOURCE_BONUS.get(latest_report.source, 0)

    return min(score, 100)


def _is_truck_far(waste_point: WastePoint, session: Session) -> bool:
    """F-SCORE-01: +20 when the next scheduled collection is > N hours away.

    The MVP has no live route ETA, so we use the bin's `normal_collection_time`
    (HH:MM) as the scheduled visit. If now is more than SCHEDULED_TRUCK_FAR_HOURS
    before that time (today), the truck is considered "far". A bin with no
    schedule is treated as far (worst case → higher priority).
    """
    sched = waste_point.normal_collection_time
    if not sched:
        return True
    try:
        hh, mm = (int(x) for x in sched.split(":")[:2])
    except (ValueError, AttributeError):
        return True

    now = datetime.utcnow()
    scheduled_today = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
    # If the scheduled time has already passed today, the next visit is tomorrow.
    if scheduled_today <= now:
        scheduled_today += timedelta(days=1)

    hours_until = (scheduled_today - now).total_seconds() / 3600
    return hours_until > SCHEDULED_TRUCK_FAR_HOURS


def _is_repeat_offender(waste_point_id: int, session: Session) -> bool:
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    stmt = select(func.count(Hotspot.id)).where(
        Hotspot.waste_point_id == waste_point_id,
        Hotspot.created_at >= thirty_days_ago,
    )
    count = session.exec(stmt).one()
    return count >= 3
