# src/routes/dashboard.py
# BE Dev 1 owns this file.

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from src.middleware.auth import require_role
from src.models.schemas import MetricsOut, MapPinOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/metrics", response_model=MetricsOut)
async def get_metrics(
    date_from: str | None = None,
    date_to:   str | None = None,
    _user: dict = Depends(require_role("manager")),
):
    """Return KPI aggregates for the given date range. Manager only."""
    # TODO: call dashboard_service.get_metrics(date_from, date_to)
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/map", response_model=list[MapPinOut])
async def get_map_data(
    _user: dict = Depends(require_role("manager")),
):
    """Return all active cluster pins for the live map. Manager only."""
    # TODO: call dashboard_service.get_map_pins()
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/export")
async def export_csv(
    date_from: str | None = None,
    date_to:   str | None = None,
    _user: dict = Depends(require_role("manager")),
):
    """Stream a CSV of all reports for the given date range. Manager only."""
    # TODO: call dashboard_service.build_csv_stream(date_from, date_to)
    # Return StreamingResponse(csv_generator, media_type="text/csv",
    #     headers={"Content-Disposition": "attachment; filename=reports.csv"})
    raise HTTPException(status_code=501, detail="Not implemented yet")
