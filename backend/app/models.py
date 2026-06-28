from enum import Enum
from typing import Optional
from datetime import datetime
from sqlmodel import Field, SQLModel


class BinCategory(str, Enum):
    small_residential  = "small_residential"
    medium_residential = "medium_residential"
    market_commercial  = "market_commercial"
    large_public       = "large_public"


class IssueType(str, Enum):
    overflow    = "overflow"
    near_full   = "near_full"
    bulky_waste = "bulky_waste"
    bad_smell   = "bad_smell"


class WastePointStatus(str, Enum):
    normal    = "normal"
    near_full = "near_full"
    full      = "full"
    overflow  = "overflow"


class HotspotStatus(str, Enum):
    active   = "active"
    watching = "watching"
    resolved = "resolved"


class TruckStatus(str, Enum):
    available = "available"
    on_route  = "on_route"
    near_full = "near_full"
    full      = "full"
    off_shift = "off_shift"


class TaskStatus(str, Enum):
    assigned    = "assigned"
    done        = "done"
    unreachable = "unreachable"


class WasteEventSource(str, Enum):
    resident  = "resident"
    driver    = "driver"
    business  = "business"
    emergency = "emergency"
    sensor    = "sensor"


class WastePoint(SQLModel, table=True):
    __tablename__ = "waste_points"
    id:                     Optional[int] = Field(default=None, primary_key=True)
    name:                   str
    lat:                    float
    lng:                    float
    h3_cell:                str           = Field(index=True)
    area_type:              str
    category:               BinCategory
    estimated_weight_kg:    float
    normal_collection_time: Optional[str] = None
    status:                 WastePointStatus = WastePointStatus.normal
    created_at:             datetime = Field(default_factory=datetime.utcnow)


class Report(SQLModel, table=True):
    __tablename__ = "reports"
    id:                  Optional[int] = Field(default=None, primary_key=True)
    waste_point_id:      Optional[int] = Field(default=None, foreign_key="waste_points.id")
    hotspot_id:          Optional[int] = Field(default=None, foreign_key="hotspots.id")
    issue_type:          IssueType
    description:         Optional[str] = None
    image_url:           Optional[str] = None
    lat:                 float
    lng:                 float
    status:              str           = "pending"
    source:              WasteEventSource = WasteEventSource.resident
    estimated_volume_kg: Optional[float]  = None
    deadline:            Optional[datetime] = None
    created_at:          datetime = Field(default_factory=datetime.utcnow)


class Hotspot(SQLModel, table=True):
    __tablename__ = "hotspots"
    id:             Optional[int]  = Field(default=None, primary_key=True)
    waste_point_id: Optional[int]  = Field(default=None, foreign_key="waste_points.id")
    report_count:   int            = 1
    severity:       IssueType
    priority_score: int            = 0
    status:         HotspotStatus  = HotspotStatus.active
    created_at:     datetime       = Field(default_factory=datetime.utcnow)
    resolved_at:    Optional[datetime] = None


class Truck(SQLModel, table=True):
    __tablename__ = "trucks"
    id:               Optional[int] = Field(default=None, primary_key=True)
    name:             str
    lat:              float
    lng:              float
    h3_cell:          str         = Field(index=True)
    status:           TruckStatus = TruckStatus.available
    current_route_id: Optional[int] = None
    max_capacity_kg:  float
    current_load_kg:  float    = 0.0
    updated_at:       datetime = Field(default_factory=datetime.utcnow)


class Task(SQLModel, table=True):
    __tablename__ = "tasks"
    id:                  Optional[int] = Field(default=None, primary_key=True)
    hotspot_id:          int           = Field(foreign_key="hotspots.id")
    truck_id:            int           = Field(foreign_key="trucks.id")
    status:              TaskStatus    = TaskStatus.assigned
    scenario_id:         Optional[str] = None
    action:              Optional[str] = None
    assigned_at:         datetime      = Field(default_factory=datetime.utcnow)
    completed_at:        Optional[datetime] = None
    weight_collected_kg: Optional[float]   = None


class RouteSegment(SQLModel, table=True):
    """H3-indexed route segment for spatial candidate retrieval.

    Stores the H3 cells that a truck route segment passes through so the
    routing engine can find trucks whose upcoming route already passes near
    a new hotspot — enabling faster route insertion candidates.
    """
    __tablename__ = "route_segments"
    id:          Optional[int] = Field(default=None, primary_key=True)
    truck_id:    int           = Field(foreign_key="trucks.id", index=True)
    task_id:     Optional[int] = Field(default=None, foreign_key="tasks.id")
    seq_order:   int           = 0
    h3_cells:    str           = "[]"   # JSON-encoded list[str]
    start_lat:   float         = 0.0
    start_lng:   float         = 0.0
    end_lat:     float         = 0.0
    end_lng:     float         = 0.0
    created_at:  datetime      = Field(default_factory=datetime.utcnow)


class Route(SQLModel, table=True):
    """A truck's fixed collection route — an ordered list of waypoints.

    waypoints is a JSON-encoded list of [lat, lng] pairs. A truck may have
    multiple routes (e.g. morning/afternoon loops); `is_active` marks which
    one is currently being driven and rendered on the dispatcher map.
    """
    __tablename__ = "routes"
    id:         Optional[int] = Field(default=None, primary_key=True)
    truck_id:   int           = Field(foreign_key="trucks.id", index=True)
    name:       str
    waypoints:  str           = "[]"   # JSON list[[lat, lng], ...] — stop order
    geometry:   str           = "[]"   # JSON list[[lat, lng], ...] — road-snapped path
    is_active:  bool          = True
    created_at: datetime      = Field(default_factory=datetime.utcnow)


class Zone(SQLModel, table=True):
    """Geographic zone assigned to a truck (zone-based driver assignment).

    h3_cells stores a JSON list of H3 resolution-7 cells (~5 km² each) that
    define the zone boundary. The routing engine uses these to detect which
    zone a hotspot belongs to and prefer the zone's assigned truck (SC-08).
    """
    __tablename__ = "zones"
    id:         Optional[int] = Field(default=None, primary_key=True)
    name:       str
    color:      str           = "#00B14F"
    h3_cells:   str           = "[]"   # JSON list[str] at resolution 7
    truck_id:   Optional[int] = Field(default=None, foreign_key="trucks.id")
    status:     str           = "normal"  # normal | busy | overloaded
    created_at: datetime      = Field(default_factory=datetime.utcnow)


class User(SQLModel, table=True):
    __tablename__ = "users"
    id:              Optional[int] = Field(default=None, primary_key=True)
    username:        str           = Field(unique=True)
    password:        str
    role:            str           # dispatcher | driver | admin | manager
    truck_id:        Optional[int] = None
    waste_point_id:  Optional[int] = Field(default=None, foreign_key="waste_points.id")


class RejectedSuggestion(SQLModel, table=True):
    """Persisted rejection so the routing engine can suppress re-suggesting
    the same hotspot+truck pair until the hotspot is resolved."""
    __tablename__ = "rejected_suggestions"
    id:          Optional[int] = Field(default=None, primary_key=True)
    hotspot_id:  int           = Field(foreign_key="hotspots.id", index=True)
    truck_id:    int           = Field(foreign_key="trucks.id")
    rejected_at: datetime      = Field(default_factory=datetime.utcnow)

