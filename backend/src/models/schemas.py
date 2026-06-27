# src/models/schemas.py
# BE Dev 2 owns this file.
# All Pydantic request/response models live here.

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────────────

class IssueType(str, Enum):
    overflow      = "overflow"
    bulky         = "bulky"
    contamination = "contamination"
    odor          = "odor"
    illegal_dump  = "illegal_dump"


class Severity(str, Enum):
    low    = "low"
    medium = "medium"
    high   = "high"


class ReportStatus(str, Enum):
    pending     = "pending"
    assigned    = "assigned"
    in_progress = "in_progress"
    completed   = "completed"


class ClusterStatus(str, Enum):
    open     = "open"
    assigned = "assigned"
    resolved = "resolved"


class RouteStatus(str, Enum):
    planned   = "planned"
    active    = "active"
    completed = "completed"


class UserRole(str, Enum):
    manager = "manager"
    crew    = "crew"


# ── Shared sub-models ─────────────────────────────────────────────────────────

class LocationIn(BaseModel):
    lat: float = Field(..., ge=-90,  le=90)
    lng: float = Field(..., ge=-180, le=180)


class CO2Estimate(BaseModel):
    saved_km:    float
    co2_saved_kg: float
    co2_label:   str = "estimated"


# ── Report ────────────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    issue_type:   IssueType
    severity:     Severity
    location:     LocationIn
    description:  Optional[str] = Field(None, max_length=300)
    contact_info: Optional[str] = None


class ReportStatusUpdate(BaseModel):
    status: ReportStatus


class ReportOut(BaseModel):
    id:           UUID
    issue_type:   IssueType
    severity:     Severity
    status:       ReportStatus
    photo_url:    Optional[str]
    description:  Optional[str]
    cluster_id:   Optional[UUID]
    submitted_at: datetime

    model_config = {"from_attributes": True}


# ── Cluster ───────────────────────────────────────────────────────────────────

class ClusterOut(BaseModel):
    id:             UUID
    lat:            float
    lng:            float
    priority_score: float
    report_count:   int
    status:         ClusterStatus
    route_id:       Optional[UUID]
    created_at:     datetime

    model_config = {"from_attributes": True}


# ── Route / Stop ──────────────────────────────────────────────────────────────

class StopOut(BaseModel):
    cluster_id:    UUID
    seq:           int
    status:        ReportStatus
    checked_in_at: Optional[datetime]


class RouteOut(BaseModel):
    id:          UUID
    crew_id:     UUID
    shift_date:  str
    stops:       list[StopOut]
    distance_km: float
    baseline_km: float
    status:      RouteStatus
    co2:         Optional[CO2Estimate]

    model_config = {"from_attributes": True}


class CheckInCreate(BaseModel):
    lat: float = Field(..., ge=-90,  le=90)
    lng: float = Field(..., ge=-180, le=180)


# ── Dashboard ─────────────────────────────────────────────────────────────────

class MetricsOut(BaseModel):
    reports_processed: int
    distance_saved_km: float
    time_saved_minutes: float
    co2: CO2Estimate
    overflow_incidents: int
    overflow_pct: float


class MapPinOut(BaseModel):
    cluster_id:     UUID
    lat:            float
    lng:            float
    priority_score: float
    report_count:   int
    status:         ClusterStatus


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email:    str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    role:         UserRole
    name:         Optional[str]
