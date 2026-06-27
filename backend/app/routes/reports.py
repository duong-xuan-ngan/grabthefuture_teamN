from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session

from app.database import get_session
from app.models import Report, IssueType, WastePoint
from app.services.clustering import cluster_report

router = APIRouter()


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

    image_url = None
    if image:
        image_url = await _upload_to_supabase(image)

    report = Report(
        waste_point_id=waste_point_id,
        issue_type=issue_type,
        description=description,
        image_url=image_url,
        lat=waste_point.lat,
        lng=waste_point.lng,
    )
    session.add(report)
    session.flush()

    hotspot = cluster_report(report, session)
    return {"report": report, "hotspot": hotspot}


async def _upload_to_supabase(image: UploadFile) -> Optional[str]:
    # TODO: upload bytes to Supabase Storage bucket "report-photos" and return public URL
    return None
