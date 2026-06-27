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
    created_at:             datetime = Field(default_factory=datetime.utcnow)


class Report(SQLModel, table=True):
    __tablename__ = "reports"
    id:             Optional[int] = Field(default=None, primary_key=True)
    waste_point_id: int           = Field(foreign_key="waste_points.id")
    hotspot_id:     Optional[int] = Field(default=None, foreign_key="hotspots.id")
    issue_type:     IssueType
    description:    Optional[str] = None
    image_url:      Optional[str] = None
    lat:            float
    lng:            float
    status:         str      = "pending"
    created_at:     datetime = Field(default_factory=datetime.utcnow)


class Hotspot(SQLModel, table=True):
    __tablename__ = "hotspots"
    id:             Optional[int]  = Field(default=None, primary_key=True)
    waste_point_id: int            = Field(foreign_key="waste_points.id")
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
    id:                 Optional[int] = Field(default=None, primary_key=True)
    hotspot_id:         int           = Field(foreign_key="hotspots.id")
    truck_id:           int           = Field(foreign_key="trucks.id")
    status:             TaskStatus    = TaskStatus.assigned
    assigned_at:        datetime      = Field(default_factory=datetime.utcnow)
    completed_at:       Optional[datetime] = None
    weight_collected_kg: Optional[float]  = None


class User(SQLModel, table=True):
    __tablename__ = "users"
    id:       Optional[int] = Field(default=None, primary_key=True)
    username: str           = Field(unique=True)
    password: str
    role:     str
    truck_id: Optional[int] = None
