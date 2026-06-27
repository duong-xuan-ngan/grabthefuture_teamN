# src/routes/reports.py
# BE Dev 1 owns this file.

from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi import status as http_status

from src.middleware.auth import require_role
from src.models.schemas import ReportCreate, ReportOut, ReportStatus, ReportStatusUpdate

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/", response_model=ReportOut, status_code=201)
async def submit_report(body: ReportCreate):
    """Submit a new waste report. No auth required (public QR/web form)."""
    # TODO: call report_service.create_report(body)
    # After saving, trigger optimizer: await run_clustering(); await update_routes()
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/", response_model=list[ReportOut])
async def list_reports(
    status: ReportStatus | None = None,
    severity: str | None = None,
    _user: dict = Depends(require_role("manager")),
):
    """List all reports. Filterable by status and severity. Manager only."""
    # TODO: call report_service.get_reports(status=status, severity=severity)
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{report_id}", response_model=ReportOut)
async def get_report(
    report_id: UUID,
    _user: dict = Depends(require_role("manager")),
):
    """Get a single report by ID. Manager only."""
    # TODO: call report_service.get_report(report_id)
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.patch("/{report_id}/status", response_model=ReportOut)
async def update_report_status(
    report_id: UUID,
    body: ReportStatusUpdate,
    _user: dict = Depends(require_role("manager", "crew")),
):
    """Update report status. Crew or manager."""
    # TODO: call report_service.update_status(report_id, body.status)
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/{report_id}/photo", status_code=200)
async def upload_photo(
    report_id: UUID,
    file: UploadFile = File(...),
):
    """Upload a photo for a report. No auth (submitted alongside report form)."""
    # TODO: validate file type (jpg/png), save to storage, update report.photo_url
    raise HTTPException(status_code=501, detail="Not implemented yet")
