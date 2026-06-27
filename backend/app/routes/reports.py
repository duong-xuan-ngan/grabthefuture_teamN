from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session

from app.database import get_session
from app.models import Report, IssueType, WastePoint
from app.services.clustering import cluster_report

router = APIRouter()


@router.get("/{report_id}")
def get_report(report_id: int, session: Session = Depends(get_session)):
    report = session.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    waste_point = session.get(WastePoint, report.waste_point_id)
    return {
        "id": report.id,
        "waste_point_id": report.waste_point_id,
        "bin_id": f"M-{report.waste_point_id:03d}",
        "bin_name": waste_point.name if waste_point else f"Bin {report.waste_point_id}",
        "address": waste_point.name if waste_point else "",
        "issue_type": report.issue_type,
        "description": report.description,
        "image_url": report.image_url,
        "status": report.status,
        "created_at": report.created_at,
        "timeline": [
            {
                "step": "received",
                "label": "Report received",
                "at": report.created_at,
            }
        ],
    }


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
