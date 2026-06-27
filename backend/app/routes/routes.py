"""Fixed-route endpoints — the dispatcher map draws these as the baseline
collection routes."""
import json
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import Route

router = APIRouter()


@router.get("")
def list_routes(session: Session = Depends(get_session)):
    """All fixed routes with decoded waypoints, for the dispatcher map."""
    routes = session.exec(select(Route)).all()
    out = []
    for r in routes:
        try:
            waypoints = json.loads(r.waypoints)
        except (ValueError, TypeError):
            waypoints = []
        try:
            geometry = json.loads(r.geometry)
        except (ValueError, TypeError):
            geometry = []
        out.append({
            "id":        r.id,
            "truck_id":  r.truck_id,
            "name":      r.name,
            "is_active": r.is_active,
            "waypoints": waypoints,   # [[lat, lng], ...] — stop order
            # Road-snapped path for drawing; fall back to waypoints if empty.
            "geometry":  geometry if geometry else waypoints,
        })
    return {"routes": out}
