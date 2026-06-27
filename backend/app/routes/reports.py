import os
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    Report, IssueType, WastePoint, WasteEventSource,
    Hotspot, HotspotStatus, Task, TaskStatus, Truck,
)
from app.services.clustering import cluster_report
from app.utils.spatial import latlng_to_cell, get_ring_cells

router = APIRouter()

REPORT_PHOTO_BUCKET = "report-photos"


def _build_report(
    *,
    waste_point_id: Optional[int],
    issue_type: IssueType,
    lat: float,
    lng: float,
    description: Optional[str],
    image_url: Optional[str],
    source: WasteEventSource,
    estimated_volume_kg: Optional[float],
    deadline: Optional[datetime],
) -> Report:
    return Report(
        waste_point_id=waste_point_id,
        issue_type=issue_type,
        lat=lat,
        lng=lng,
        description=description,
        image_url=image_url,
        source=source,
        estimated_volume_kg=estimated_volume_kg,
        deadline=deadline,
    )


def _resolve_waste_point(
    waste_point_id: Optional[int],
    lat: float,
    lng: float,
    session: Session,
) -> Optional[WastePoint]:
    """Return the waste point for the report.

    If waste_point_id is provided, return it directly.
    Otherwise find the nearest waste point within 1 H3 ring (~150m) so
    ad-hoc reports (driver, business) can still cluster with registered bins.
    """
    if waste_point_id:
        return session.get(WastePoint, waste_point_id)
    # Find closest registered waste point within ring-1.
    center = latlng_to_cell(lat, lng)
    cells = get_ring_cells(center, 1)
    for row in session.exec(
        select(WastePoint).where(WastePoint.h3_cell.in_(cells))
    ).all():
        return row   # return first match (nearest by H3)
    return None


# ── Public resident endpoint (original, unchanged behaviour) ─────────────────

@router.post("")
async def create_report(
    waste_point_id: int = Form(...),
    issue_type: IssueType = Form(...),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
):
    waste_point = session.get(WastePoint, waste_point_id)
    if not waste_point:
        raise HTTPException(status_code=404, detail="Waste point not found")

    image_url = await _upload_to_supabase(image) if image else None

    report = _build_report(
        waste_point_id=waste_point.id,
        issue_type=issue_type,
        lat=waste_point.lat,
        lng=waste_point.lng,
        description=description,
        image_url=image_url,
        source=WasteEventSource.resident,
        estimated_volume_kg=None,
        deadline=None,
    )
    session.add(report)
    session.flush()
    hotspot = cluster_report(report, session)
    return {"report": report, "hotspot": hotspot}


# ── Driver report (authenticated — driver can report from any location) ───────

@router.post("/driver")
async def create_driver_report(
    issue_type: IssueType = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    waste_point_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    estimated_volume_kg: Optional[float] = Form(None),
    image: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
):
    """Driver-originated report. waste_point_id is optional — driver may report
    an ad-hoc location without a registered bin. Priority score gets +5 driver bonus."""
    wp = _resolve_waste_point(waste_point_id, lat, lng, session)
    image_url = await _upload_to_supabase(image) if image else None

    report = _build_report(
        waste_point_id=wp.id if wp else None,
        issue_type=issue_type,
        lat=wp.lat if wp else lat,
        lng=wp.lng if wp else lng,
        description=description,
        image_url=image_url,
        source=WasteEventSource.driver,
        estimated_volume_kg=estimated_volume_kg,
        deadline=None,
    )
    session.add(report)
    session.flush()
    hotspot = cluster_report(report, session)
    return {"report": report, "hotspot": hotspot}


# ── Emergency pickup (high priority, no clustering window) ────────────────────

@router.post("/emergency")
async def create_emergency_pickup(
    issue_type: IssueType = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    waste_point_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    estimated_volume_kg: Optional[float] = Form(None),
    deadline: Optional[str] = Form(None),   # ISO string from frontend
    image: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
):
    """Emergency / business pickup. Bypasses the 30-min clustering window and
    applies +30 priority bonus — hotspot is created immediately."""
    wp = _resolve_waste_point(waste_point_id, lat, lng, session)
    image_url = await _upload_to_supabase(image) if image else None
    deadline_dt = datetime.fromisoformat(deadline) if deadline else None

    report = _build_report(
        waste_point_id=wp.id if wp else None,
        issue_type=issue_type,
        lat=wp.lat if wp else lat,
        lng=wp.lng if wp else lng,
        description=description,
        image_url=image_url,
        source=WasteEventSource.emergency,
        estimated_volume_kg=estimated_volume_kg,
        deadline=deadline_dt,
    )
    session.add(report)
    session.flush()
    hotspot = cluster_report(report, session)
    return {"report": report, "hotspot": hotspot}


# ── Business pickup request ───────────────────────────────────────────────────

@router.post("/business")
async def create_business_pickup(
    issue_type: IssueType = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    waste_point_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    estimated_volume_kg: Optional[float] = Form(None),
    deadline: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
):
    """Business-originated pickup (restaurant, market, etc.). +10 priority bonus."""
    wp = _resolve_waste_point(waste_point_id, lat, lng, session)
    image_url = await _upload_to_supabase(image) if image else None
    deadline_dt = datetime.fromisoformat(deadline) if deadline else None

    report = _build_report(
        waste_point_id=wp.id if wp else None,
        issue_type=issue_type,
        lat=wp.lat if wp else lat,
        lng=wp.lng if wp else lng,
        description=description,
        image_url=image_url,
        source=WasteEventSource.business,
        estimated_volume_kg=estimated_volume_kg,
        deadline=deadline_dt,
    )
    session.add(report)
    session.flush()
    hotspot = cluster_report(report, session)
    return {"report": report, "hotspot": hotspot}


# ── Report status lookup ──────────────────────────────────────────────────────

@router.get("/{report_id}")
def get_report_status(report_id: int, session: Session = Depends(get_session)):
    report = session.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    wp = session.get(WastePoint, report.waste_point_id) if report.waste_point_id else None
    hotspot = session.get(Hotspot, report.hotspot_id) if report.hotspot_id else None

    photo_urls = []
    if report.image_url:
        photo_urls.append(report.image_url)
    if hotspot:
        for r in session.exec(select(Report).where(Report.hotspot_id == hotspot.id)).all():
            if r.image_url and r.image_url not in photo_urls:
                photo_urls.append(r.image_url)

    task = None
    truck = None
    if hotspot:
        task = session.exec(select(Task).where(Task.hotspot_id == hotspot.id)).first()
        if task:
            truck = session.get(Truck, task.truck_id)

    timeline = [{"step": "received", "label": "Report received", "at": report.created_at}]
    status = "received"
    if hotspot:
        timeline.append({"step": "clustered", "label": f"Clustered with {hotspot.report_count} report(s)", "at": hotspot.created_at})
        timeline.append({"step": "scored", "label": f"Priority score {hotspot.priority_score}", "at": hotspot.created_at})
        status = "scored"
    if task:
        timeline.append({"step": "assigned", "label": f"Assigned to {truck.name if truck else 'a truck'}", "at": task.assigned_at})
        status = "assigned"
        if task.status == TaskStatus.done:
            timeline.append({"step": "resolved", "label": "Collected and resolved", "at": task.completed_at})
            status = "resolved"

    return {
        "id":                  report.id,
        "bin_name":            wp.name if wp else "Ad-hoc location",
        "address":             wp.area_type if wp else None,
        "issue_type":          report.issue_type,
        "source":              report.source,
        "description":         report.description,
        "estimated_volume_kg": report.estimated_volume_kg,
        "deadline":            report.deadline,
        "created_at":          report.created_at,
        "status":              status,
        "assigned_truck":      truck.name if truck else None,
        "timeline":            timeline,
        "photo_urls":          photo_urls,
    }


async def _upload_to_supabase(image: UploadFile) -> Optional[str]:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        data = await image.read()
        ext = (image.filename or "").rsplit(".", 1)[-1].lower() if image.filename and "." in image.filename else "jpg"
        path = f"{uuid.uuid4().hex}.{ext}"
        client = create_client(url, key)
        client.storage.from_(REPORT_PHOTO_BUCKET).upload(
            path, data, {"content-type": image.content_type or "image/jpeg", "upsert": "true"},
        )
        return client.storage.from_(REPORT_PHOTO_BUCKET).get_public_url(path)
    except Exception:
        return None
