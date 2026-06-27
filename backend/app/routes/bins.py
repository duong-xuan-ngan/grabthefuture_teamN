from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.models import WastePoint

router = APIRouter()


@router.get("/{bin_id}")
def get_bin(bin_id: str, session: Session = Depends(get_session)):
    normalized = bin_id.strip()
    numeric = "".join(ch for ch in normalized if ch.isdigit())
    waste_point_id = int(numeric) if numeric else None
    waste_point = session.get(WastePoint, waste_point_id) if waste_point_id else None

    if not waste_point:
        raise HTTPException(status_code=404, detail="Bin not found")

    return {
        "bin_id": f"M-{waste_point.id:03d}",
        "waste_point_id": waste_point.id,
        "name": waste_point.name,
        "address": waste_point.name,
        "lat": waste_point.lat,
        "lng": waste_point.lng,
    }
