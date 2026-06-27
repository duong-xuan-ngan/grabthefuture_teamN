from datetime import datetime, timedelta
from sqlmodel import Session, select

from app.models import (
    Report, Hotspot, WastePoint, IssueType, HotspotStatus,
    WastePointStatus, WasteEventSource,
)
from app.utils.constants import CLUSTER_WINDOW_MIN
from app.services.priority_score import compute_priority_score

_SEVERITY_RANK = {
    IssueType.overflow:    0,
    IssueType.near_full:   1,
    IssueType.bulky_waste: 2,
    IssueType.bad_smell:   3,
}

# Map IssueType severity → WastePointStatus
_SEVERITY_TO_STATUS = {
    IssueType.overflow:    WastePointStatus.overflow,
    IssueType.near_full:   WastePointStatus.near_full,
    IssueType.bulky_waste: WastePointStatus.full,
    IssueType.bad_smell:   WastePointStatus.near_full,
}


def cluster_report(report: Report, session: Session) -> Hotspot:
    # Emergency events bypass the clustering window and get an instant hotspot.
    is_emergency = getattr(report, "source", None) == WasteEventSource.emergency

    if not is_emergency and report.waste_point_id:
        window_start = datetime.utcnow() - timedelta(minutes=CLUSTER_WINDOW_MIN)
        existing = _find_active_hotspot(report.waste_point_id, window_start, session)
        if existing:
            existing.report_count += 1
            existing.severity = _escalate(existing.severity, report.issue_type)
            existing.priority_score = compute_priority_score(existing, session)
            report.hotspot_id = existing.id
            session.add(existing)
            session.add(report)
            session.commit()
            session.refresh(existing)
            _sync_waste_point_status(existing, session)
            return existing

    hotspot = Hotspot(
        waste_point_id=report.waste_point_id,   # may be None for ad-hoc
        report_count=1,
        severity=report.issue_type,
        priority_score=0,
        status=HotspotStatus.active,
    )
    session.add(hotspot)
    session.flush()
    hotspot.priority_score = compute_priority_score(hotspot, session)
    report.hotspot_id = hotspot.id
    session.add(hotspot)
    session.add(report)
    session.commit()
    session.refresh(hotspot)
    _sync_waste_point_status(hotspot, session)
    return hotspot


def _sync_waste_point_status(hotspot: Hotspot, session: Session) -> None:
    """Keep WastePoint.status in sync with the active hotspot's severity."""
    if not hotspot.waste_point_id:
        return
    wp = session.get(WastePoint, hotspot.waste_point_id)
    if not wp:
        return
    wp.status = _SEVERITY_TO_STATUS.get(hotspot.severity, WastePointStatus.near_full)
    session.add(wp)
    session.commit()


def reset_waste_point_status(waste_point_id: int | None, session: Session) -> None:
    """Called when a task is marked Done — reset the bin to normal."""
    if not waste_point_id:
        return
    wp = session.get(WastePoint, waste_point_id)
    if not wp:
        return
    wp.status = WastePointStatus.normal
    session.add(wp)
    session.commit()


def _find_active_hotspot(waste_point_id: int, since: datetime, session: Session):
    stmt = select(Hotspot).where(
        Hotspot.waste_point_id == waste_point_id,
        Hotspot.status == HotspotStatus.active,
        Hotspot.created_at >= since,
    )
    return session.exec(stmt).first()


def _escalate(current: IssueType, incoming: IssueType) -> IssueType:
    return incoming if _SEVERITY_RANK[incoming] < _SEVERITY_RANK[current] else current
