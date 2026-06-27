"""Admin endpoints: QR data management + emergency escalation + manager accounts."""
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
import bcrypt

from app.database import get_session
from app.models import WastePoint, Hotspot, HotspotStatus, IssueType, WastePointStatus, User
from app.services.priority_score import compute_priority_score
from app.services.clustering import _sync_waste_point_status

router = APIRouter()

APP_URL = os.getenv("APP_URL", "http://localhost:5173")


# ── Manager account management ──────────────────────────────────────────────

class CreateManagerBody(BaseModel):
    username: str
    password: str
    waste_point_id: int


@router.post("/managers", status_code=201)
def create_manager(body: CreateManagerBody, session: Session = Depends(get_session)):
    """Create a manager account bound to a specific waste point."""
    wp = session.get(WastePoint, body.waste_point_id)
    if not wp:
        raise HTTPException(status_code=404, detail="Waste point not found")
    existing = session.exec(select(User).where(User.username == body.username)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = User(
        username=body.username,
        password=hashed,
        role="manager",
        waste_point_id=body.waste_point_id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"id": user.id, "username": user.username, "role": user.role, "waste_point_id": user.waste_point_id}


@router.get("/managers")
def list_managers(session: Session = Depends(get_session)):
    """List all manager accounts with their assigned waste point."""
    managers = session.exec(select(User).where(User.role == "manager")).all()
    out = []
    for m in managers:
        wp = session.get(WastePoint, m.waste_point_id) if m.waste_point_id else None
        out.append({
            "id":              m.id,
            "username":        m.username,
            "role":            m.role,
            "waste_point_id":  m.waste_point_id,
            "waste_point_name": wp.name if wp else None,
        })
    return {"managers": out}


@router.delete("/managers/{user_id}", status_code=204)
def delete_manager(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user or user.role != "manager":
        raise HTTPException(status_code=404, detail="Manager not found")
    session.delete(user)
    session.commit()


@router.get("/waste-points")
def list_waste_points_for_qr(session: Session = Depends(get_session)):
    """Return all waste points with their QR URL so the admin can generate codes."""
    points = session.exec(select(WastePoint)).all()
    return {
        "waste_points": [
            {
                "id":                  wp.id,
                "name":                wp.name,
                "lat":                 wp.lat,
                "lng":                 wp.lng,
                "area_type":           wp.area_type,
                "category":            wp.category,
                "estimated_weight_kg": wp.estimated_weight_kg,
                "status":              wp.status,
                "qr_url":              f"{APP_URL}/r?b={wp.id}",
            }
            for wp in points
        ]
    }


@router.post("/hotspots/{hotspot_id}/escalate")
def escalate_to_emergency(
    hotspot_id: int,
    reason: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """Admin/manager escalates a hotspot to Emergency priority.

    Forces priority_score to 100, sets severity to overflow (worst case),
    and re-syncs the waste point status so the map pin turns red immediately.
    The routing engine will pick this up on the next /suggest call.
    """
    hotspot = session.get(Hotspot, hotspot_id)
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    if hotspot.status == HotspotStatus.resolved:
        raise HTTPException(status_code=409, detail="Cannot escalate a resolved hotspot")

    hotspot.severity = IssueType.overflow
    hotspot.priority_score = 100
    hotspot.status = HotspotStatus.active
    session.add(hotspot)
    session.commit()
    session.refresh(hotspot)

    # Push waste point status to overflow on the map.
    _sync_waste_point_status(hotspot, session)

    return {
        "hotspot_id":    hotspot.id,
        "priority_score": hotspot.priority_score,
        "severity":      hotspot.severity,
        "escalated":     True,
        "reason":        reason,
    }


@router.post("/hotspots/new-emergency")
def create_emergency_hotspot(
    waste_point_id: int,
    reason: Optional[str] = None,
    issue_type: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """Create a brand-new emergency hotspot on a waste point that has no
    active hotspot yet — e.g. admin spots a problem before residents report."""
    wp = session.get(WastePoint, waste_point_id)
    if not wp:
        raise HTTPException(status_code=404, detail="Waste point not found")

    existing = session.exec(
        select(Hotspot).where(
            Hotspot.waste_point_id == waste_point_id,
            Hotspot.status == HotspotStatus.active,
        )
    ).first()
    if existing:
        # Just escalate the existing one instead.
        existing.severity = IssueType.overflow
        existing.priority_score = 100
        session.add(existing)
        session.commit()
        _sync_waste_point_status(existing, session)
        return {"hotspot_id": existing.id, "priority_score": 100, "escalated": True, "reason": reason}

    # Map UI issue key → DB enum; default to overflow for emergency
    _issue_map = {
        'overflow': IssueType.overflow,
        'near_full': IssueType.near_full,
        'bulky': IssueType.bulky_waste,
        'smell': IssueType.bad_smell,
    }
    severity = _issue_map.get(issue_type, IssueType.overflow)

    hotspot = Hotspot(
        waste_point_id=waste_point_id,
        severity=severity,
        priority_score=100,
        report_count=1,
        status=HotspotStatus.active,
    )
    session.add(hotspot)
    session.commit()
    session.refresh(hotspot)
    wp.status = WastePointStatus.overflow
    session.add(wp)
    session.commit()

    return {
        "hotspot_id":    hotspot.id,
        "priority_score": 100,
        "severity":      severity,
        "issue_type":    issue_type or "overflow",
        "created":       True,
        "reason":        reason,
    }
