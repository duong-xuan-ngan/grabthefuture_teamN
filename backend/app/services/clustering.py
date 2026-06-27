from datetime import datetime, timedelta
from sqlmodel import Session, select

from app.models import Report, Hotspot, IssueType, HotspotStatus
from app.utils.constants import CLUSTER_WINDOW_MIN
from app.services.priority_score import compute_priority_score

_SEVERITY_RANK = {
    IssueType.overflow:    0,
    IssueType.near_full:   1,
    IssueType.bulky_waste: 2,
    IssueType.bad_smell:   3,
}


def cluster_report(report: Report, session: Session) -> Hotspot:
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
        return existing

    hotspot = Hotspot(
        waste_point_id=report.waste_point_id,
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
    return hotspot


def _find_active_hotspot(waste_point_id: int, since: datetime, session: Session):
    stmt = select(Hotspot).where(
        Hotspot.waste_point_id == waste_point_id,
        Hotspot.status == HotspotStatus.active,
        Hotspot.created_at >= since,
    )
    return session.exec(stmt).first()


def _escalate(current: IssueType, incoming: IssueType) -> IssueType:
    return incoming if _SEVERITY_RANK[incoming] < _SEVERITY_RANK[current] else current
