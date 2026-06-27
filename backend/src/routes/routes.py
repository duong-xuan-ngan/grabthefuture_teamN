# src/routes/routes.py
# BE Dev 1 owns this file.
# Handles /clusters and /routes endpoints.

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from src.middleware.auth import require_role
from src.models.schemas import ClusterOut, RouteOut, CheckInCreate

router = APIRouter(tags=["routes"])


@router.get("/clusters", response_model=list[ClusterOut])
async def list_clusters(
    _user: dict = Depends(require_role("manager")),
):
    """Return all active clusters with priority scores and status. Manager only."""
    # TODO: call cluster_service.get_active_clusters()
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/routes/{route_id}", response_model=RouteOut)
async def get_route(
    route_id: UUID,
    _user: dict = Depends(require_role("manager", "crew")),
):
    """Return full route with ordered stops. Crew sees own route; manager sees any."""
    # TODO: call route_service.get_route(route_id)
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/routes/{route_id}/optimize", status_code=200)
async def optimize_route(
    route_id: UUID,
    _user: dict = Depends(require_role("manager")),
):
    """Manually trigger re-optimization for a specific route. Manager only."""
    # TODO: await run_clustering(); await update_routes(route_id=route_id)
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/routes/{route_id}/stops/{stop_id}/checkin", status_code=200)
async def checkin_stop(
    route_id: UUID,
    stop_id: UUID,
    body: CheckInCreate,
    _user: dict = Depends(require_role("crew")),
):
    """Record a crew check-in for a route stop. Crew only."""
    # TODO: call route_service.checkin(route_id, stop_id, body.lat, body.lng, user_id)
    raise HTTPException(status_code=501, detail="Not implemented yet")
