from datetime import datetime, timedelta
from typing import Optional
from sqlmodel import Session, select

from app.models import (
    Report, Hotspot, WastePoint, IssueType, HotspotStatus,
    WastePointStatus, WasteEventSource,
)
from app.utils.constants import CLUSTER_WINDOW_MIN, CLUSTER_RADIUS_M
from app.utils.spatial import haversine_km
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

    if not is_emergency:
        window_start = datetime.utcnow() - timedelta(minutes=CLUSTER_WINDOW_MIN)

        if report.waste_point_id:
            # Same-bin clustering: merge into any active hotspot for this waste point.
            existing = _find_active_hotspot(report.waste_point_id, window_start, session)
        else:
            # Ad-hoc 50 m clustering (F-CLUSTER-01): find the nearest active
            # hotspot within CLUSTER_RADIUS_M of the report's GPS position.
            existing = _find_nearby_hotspot(report.lat, report.lng, window_start, session)

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


def _find_nearby_hotspot(
    lat: float, lng: float, since: datetime, session: Session
) -> Optional[Hotspot]:
    """Find the nearest active hotspot within CLUSTER_RADIUS_M of (lat, lng).

    Used for ad-hoc reports that arrive without a waste_point_id.  We check the
    hotspot's associated waste point first; if the hotspot is itself ad-hoc
    (no waste_point_id), we fall back to the lat/lng of its most recent report.
    """
    radius_km = CLUSTER_RADIUS_M / 1000.0
    candidates = session.exec(
        select(Hotspot).where(
            Hotspot.status == HotspotStatus.active,
            Hotspot.created_at >= since,
        )
    ).all()

    best: Optional[Hotspot] = None
    best_dist = float("inf")
    for hs in candidates:
        hs_lat, hs_lng = _hotspot_coords(hs, session)
        if hs_lat is None:
            continue
        dist = haversine_km(lat, lng, hs_lat, hs_lng)
        if dist <= radius_km and dist < best_dist:
            best = hs
            best_dist = dist
    return best


def _hotspot_coords(
    hotspot: Hotspot, session: Session
) -> tuple[Optional[float], Optional[float]]:
    """Resolve the representative lat/lng of a hotspot."""
    if hotspot.waste_point_id:
        wp = session.get(WastePoint, hotspot.waste_point_id)
        if wp:
            return wp.lat, wp.lng
    # Ad-hoc hotspot — use its latest report's GPS.
    report = session.exec(
        select(Report)
        .where(Report.hotspot_id == hotspot.id)
        .order_by(Report.created_at.desc())
    ).first()
    if report:
        return report.lat, report.lng
    return None, None


def _escalate(current: IssueType, incoming: IssueType) -> IssueType:
    return incoming if _SEVERITY_RANK[incoming] < _SEVERITY_RANK[current] else current
