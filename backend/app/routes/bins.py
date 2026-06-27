from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import WastePoint, WastePointStatus

router = APIRouter()


@router.get("")
def list_bins(session: Session = Depends(get_session)):
    """All waste points — used by the dispatcher map to draw bin dots."""
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
            }
            for wp in points
        ]
    }


class BinStatusUpdate(BaseModel):
    status: WastePointStatus


@router.patch("/{bin_id}/status")
def update_bin_status(
    bin_id: str,
    body: BinStatusUpdate,
    session: Session = Depends(get_session),
):
    """Manual override for a waste point's status (dispatcher or driver)."""
    digits = "".join(ch for ch in bin_id if ch.isdigit())
    if not digits:
        raise HTTPException(status_code=400, detail="Invalid bin id")
    wp = session.get(WastePoint, int(digits))
    if not wp:
        raise HTTPException(status_code=404, detail="Bin not found")
    wp.status = body.status
    session.add(wp)
    session.commit()
    session.refresh(wp)
    return {"id": wp.id, "status": wp.status}


@router.get("/{bin_id}")
def get_bin(bin_id: str, session: Session = Depends(get_session)):
    """Resolve a QR-scanned bin to its waste point.

    The QR encodes the waste_point integer id. We accept it as a string so
    short/padded codes (e.g. "042") also resolve, falling back to the first
    waste point only if nothing matches (keeps the demo form openable).
    """
    wp = None
    digits = "".join(ch for ch in bin_id if ch.isdigit())
    if digits:
        wp = session.get(WastePoint, int(digits))
    if not wp:
        raise HTTPException(status_code=404, detail="Bin not found")

    return {
        "bin_id":         str(wp.id),
        "waste_point_id": wp.id,
        "name":           wp.name,
        "address":        wp.area_type,
        "lat":            wp.lat,
        "lng":            wp.lng,
        "category":       wp.category,
    }
