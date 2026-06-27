import csv
import io
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, func

from app.database import get_session
from app.models import Hotspot, HotspotStatus, WastePoint, Truck, Report, Task, TaskStatus
from app.services.capacity import capacity_pct
from app.utils.serialize import severity_label

router = APIRouter()


def _suggestion_breakdown(today: datetime, session: Session) -> dict:
    breakdown = {}
    for action in ["keep_route", "reorder", "reassign", "assign_greedy", "manual_alert", "watching"]:
        count = session.exec(
            select(func.count(Task.id)).where(
                Task.action == action,
                Task.assigned_at >= today,
            )
        ).one()
        if count:
            breakdown[action] = count
    return breakdown


def _compute_kpis(session: Session) -> dict:
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

    # Average response time (first report → resolved), in minutes, for today's
    # resolved hotspots. Computed in Python to stay DB-agnostic.
    resolved_hotspots = session.exec(
        select(Hotspot).where(
            Hotspot.status == HotspotStatus.resolved,
            Hotspot.resolved_at >= today,
        )
    ).all()
    deltas = [
        (h.resolved_at - h.created_at).total_seconds() / 60
        for h in resolved_hotspots
        if h.resolved_at and h.created_at
    ]
    avg_response = round(sum(deltas) / len(deltas)) if deltas else 0

    # Open hotspots bucketed into the UI's green/amber/red severity bands.
    open_hotspots = session.exec(
        select(Hotspot).where(Hotspot.status == HotspotStatus.active)
    ).all()
    sev = {"high": 0, "mid": 0, "low": 0}
    for h in open_hotspots:
        sev[severity_label(h.priority_score)] += 1

    # Fleet load across all trucks.
    trucks = session.exec(select(Truck)).all()
    total_load = sum(t.current_load_kg for t in trucks)
    total_cap = sum(t.max_capacity_kg for t in trucks)
    fleet_pct = round((total_load / total_cap) * 100) if total_cap else 0

    return {
        "opened_today":         opened,
        "resolved":             resolved,
        "resolved_pct":         round((resolved / opened) * 100) if opened else 0,
        "avg_response_minutes": avg_response,
        "open_by_severity":     sev,
        "fleet_load_pct":       fleet_pct,
        "fleet_load_kg":        round(total_load),
        # legacy keys kept for any existing consumers
        "hotspots_opened_today":   opened,
        "hotspots_resolved_today": resolved,
        "open_count":              len(open_hotspots),
        # Suggestion action breakdown (Proposal §9.8)
        "suggestion_breakdown":    _suggestion_breakdown(today, session),
    }


@router.get("/kpis")
def get_kpis(session: Session = Depends(get_session)):
    return _compute_kpis(session)


# Backward-compatible alias (original endpoint name).
@router.get("/kpi")
def get_kpi(session: Session = Depends(get_session)):
    return _compute_kpis(session)


@router.get("/export")
def export_csv(
    start: Optional[str] = None,
    end: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """F-DASH-03: export hotspot data as CSV for a chosen date range.

    Columns: location, severity, priority_score, response time (min),
    truck assigned, weight collected. `start`/`end` are ISO dates (YYYY-MM-DD);
    omit for all-time.
    """
    stmt = select(Hotspot)
    if start:
        try:
            stmt = stmt.where(Hotspot.created_at >= datetime.fromisoformat(start))
        except ValueError:
            pass
    if end:
        try:
            # inclusive end-of-day
            end_dt = datetime.fromisoformat(end) + timedelta(days=1)
            stmt = stmt.where(Hotspot.created_at < end_dt)
        except ValueError:
            pass

    hotspots = session.exec(stmt.order_by(Hotspot.created_at)).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "hotspot_id", "location", "area_type", "severity", "priority_score",
        "issue_type", "status", "created_at", "resolved_at",
        "response_minutes", "truck_assigned", "weight_collected_kg",
    ])

    for h in hotspots:
        wp = session.get(WastePoint, h.waste_point_id)
        task = session.exec(select(Task).where(Task.hotspot_id == h.id)).first()
        truck = session.get(Truck, task.truck_id) if task else None

        response_min = ""
        if h.resolved_at and h.created_at:
            response_min = round((h.resolved_at - h.created_at).total_seconds() / 60)

        writer.writerow([
            h.id,
            wp.name if wp else "",
            wp.area_type if wp else "",
            severity_label(h.priority_score),
            h.priority_score,
            h.severity.value if hasattr(h.severity, "value") else h.severity,
            h.status.value if hasattr(h.status, "value") else h.status,
            h.created_at.isoformat() if h.created_at else "",
            h.resolved_at.isoformat() if h.resolved_at else "",
            response_min,
            truck.name if truck else "",
            task.weight_collected_kg if task and task.weight_collected_kg is not None else "",
        ])

    buf.seek(0)
    filename = f"hotspots_{start or 'all'}_{end or 'all'}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/hotspot-areas")
def get_hotspot_areas(session: Session = Depends(get_session)):
    """Proposal §9.8: aggregate hotspot frequency by area_type (last 30 days).

    Returns [{area_type, hotspot_count, resolved_count, avg_response_minutes}]
    sorted by hotspot_count descending — helps identify problem zones.
    """
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    hotspots = session.exec(
        select(Hotspot).where(Hotspot.created_at >= thirty_days_ago)
    ).all()

    area_stats: dict[str, dict] = {}
    for h in hotspots:
        wp = session.get(WastePoint, h.waste_point_id) if h.waste_point_id else None
        area = wp.area_type if wp else "unknown"
        if area not in area_stats:
            area_stats[area] = {"hotspot_count": 0, "resolved_count": 0, "response_times": []}
        area_stats[area]["hotspot_count"] += 1
        if h.status == HotspotStatus.resolved:
            area_stats[area]["resolved_count"] += 1
            if h.resolved_at and h.created_at:
                area_stats[area]["response_times"].append(
                    (h.resolved_at - h.created_at).total_seconds() / 60
                )

    result = []
    for area, s in area_stats.items():
        rt = s["response_times"]
        avg_rt = round(sum(rt) / len(rt)) if rt else 0
        result.append({
            "area_type":          area,
            "hotspot_count":      s["hotspot_count"],
            "resolved_count":     s["resolved_count"],
            "avg_response_minutes": avg_rt,
        })
    result.sort(key=lambda x: -x["hotspot_count"])
    return {"areas": result}


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
