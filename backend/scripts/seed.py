#!/usr/bin/env python3
"""Full demo seed — inserts realistic sample data so every screen has content.

Safe to re-run: uses upsert-style guards on unique fields. Run after
`alembic upgrade head` on a fresh or truncated database.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

import bcrypt
from datetime import datetime, timedelta
from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models import (
    WastePoint, Truck, Hotspot, Report, Task, User, Zone, Route,
    BinCategory, IssueType, HotspotStatus, TaskStatus, TruckStatus,
    WastePointStatus, WasteEventSource,
)
import json
from app.utils.constants import BIN_WEIGHT_DEFAULTS
from app.utils.spatial import latlng_to_cell
from app.services.ors import get_road_geometry

# ── Helpers ───────────────────────────────────────────────────────────────────

def ago(minutes): return datetime.utcnow() - timedelta(minutes=minutes)

# ── Static fixtures ────────────────────────────────────────────────────────────

WASTE_POINTS = [
    # District 1 — market cluster
    {"name": "Bến Thành Market Bin A",  "lat": 10.7726, "lng": 106.6981, "area_type": "market",      "category": BinCategory.market_commercial,  "time": "06:00"},
    {"name": "Bến Thành Market Bin B",  "lat": 10.7729, "lng": 106.6985, "area_type": "market",      "category": BinCategory.market_commercial,  "time": "06:00"},
    # District 1 — central streets
    {"name": "Nguyễn Huệ Street Bin",  "lat": 10.7782, "lng": 106.7045, "area_type": "street",      "category": BinCategory.small_residential,  "time": "07:00"},
    {"name": "Lê Lợi Blvd Bin",        "lat": 10.7735, "lng": 106.6985, "area_type": "street",      "category": BinCategory.small_residential,  "time": "07:00"},
    {"name": "Đồng Khởi Bin",          "lat": 10.7775, "lng": 106.7012, "area_type": "street",      "category": BinCategory.small_residential,  "time": "07:30"},
    # District 1 — nightlife / food street
    {"name": "Bùi Viện Food Street A", "lat": 10.7665, "lng": 106.6932, "area_type": "market",      "category": BinCategory.market_commercial,  "time": "08:00"},
    {"name": "Bùi Viện Food Street B", "lat": 10.7668, "lng": 106.6936, "area_type": "market",      "category": BinCategory.market_commercial,  "time": "08:00"},
    # District 1 — parks
    {"name": "Tao Đàn Park Bin A",     "lat": 10.7766, "lng": 106.6904, "area_type": "park",        "category": BinCategory.large_public,       "time": "06:30"},
    {"name": "Tao Đàn Park Bin B",     "lat": 10.7760, "lng": 106.6910, "area_type": "park",        "category": BinCategory.large_public,       "time": "06:30"},
    {"name": "Tôn Đức Thắng Riverside","lat": 10.7768, "lng": 106.7045, "area_type": "park",        "category": BinCategory.large_public,       "time": "07:00"},
    # District 1 — apartments
    {"name": "Lý Tự Trọng Apt Bin",    "lat": 10.7798, "lng": 106.7022, "area_type": "apartment",   "category": BinCategory.medium_residential, "time": "06:30"},
    {"name": "Dist 1 Alley Bin 01",    "lat": 10.7791, "lng": 106.7004, "area_type": "street",      "category": BinCategory.small_residential,  "time": "07:00"},
    {"name": "Dist 1 Alley Bin 02",    "lat": 10.7793, "lng": 106.7008, "area_type": "street",      "category": BinCategory.small_residential,  "time": "07:00"},
    # Broader HCMC
    {"name": "Chợ Tân Bình Bin A",     "lat": 10.7975, "lng": 106.6521, "area_type": "market",      "category": BinCategory.market_commercial,  "time": "06:00"},
    {"name": "Chợ Tân Bình Bin B",     "lat": 10.7980, "lng": 106.6525, "area_type": "market",      "category": BinCategory.market_commercial,  "time": "06:00"},
    {"name": "RMIT University Bin",    "lat": 10.7290, "lng": 106.7221, "area_type": "school",      "category": BinCategory.large_public,       "time": "07:30"},
    {"name": "Phú Mỹ Hưng Apt A",     "lat": 10.7297, "lng": 106.7009, "area_type": "apartment",   "category": BinCategory.medium_residential, "time": "06:30"},
    {"name": "Phú Mỹ Hưng Apt B",     "lat": 10.7302, "lng": 106.7013, "area_type": "apartment",   "category": BinCategory.medium_residential, "time": "06:30"},
    {"name": "Bình Thạnh Apt A",       "lat": 10.8121, "lng": 106.7082, "area_type": "apartment",   "category": BinCategory.medium_residential, "time": "06:30"},
    {"name": "Bình Thạnh Apt B",       "lat": 10.8124, "lng": 106.7085, "area_type": "apartment",   "category": BinCategory.medium_residential, "time": "06:30"},
    {"name": "Gò Vấp Market Bin",      "lat": 10.8384, "lng": 106.6652, "area_type": "market",      "category": BinCategory.market_commercial,  "time": "06:00"},
    {"name": "Gò Vấp Street Bin",      "lat": 10.8387, "lng": 106.6655, "area_type": "street",      "category": BinCategory.small_residential,  "time": "07:00"},
    {"name": "Phú Nhuận Bin A",        "lat": 10.7981, "lng": 106.6810, "area_type": "street",      "category": BinCategory.small_residential,  "time": "07:00"},
    {"name": "Phú Nhuận Bin B",        "lat": 10.7984, "lng": 106.6813, "area_type": "street",      "category": BinCategory.small_residential,  "time": "07:00"},
    {"name": "Tân Phú Market Bin",     "lat": 10.7949, "lng": 106.6277, "area_type": "market",      "category": BinCategory.market_commercial,  "time": "06:00"},
]

TRUCKS = [
    {"id": 1, "name": "Truck Alpha · Hino 500", "lat": 10.7750, "lng": 106.6990, "max_capacity_kg": 3000.0, "current_load_kg": 840.0},
    {"id": 2, "name": "Truck Beta · Hino 300",  "lat": 10.7760, "lng": 106.6530, "max_capacity_kg": 2500.0, "current_load_kg": 1950.0},
]

# Zone centers covering the HCMC districts where waste points live. Each is a
# named district with a center coord + colour + (optional) assigned truck.
# Cells are assigned by Voronoi (nearest-center) so zones NEVER overlap.
ZONE_CENTERS = [
    {"name": "Quận 1 — Bến Thành",  "color": "#00B14F", "truck_id": 1,    "lat": 10.7726, "lng": 106.6981},
    {"name": "Quận 1 — Bùi Viện",   "color": "#10B981", "truck_id": None, "lat": 10.7665, "lng": 106.6932},
    {"name": "Quận 1 — Nguyễn Huệ", "color": "#6366F1", "truck_id": None, "lat": 10.7782, "lng": 106.7045},
    {"name": "Quận 3 — Tao Đàn",    "color": "#F59E0B", "truck_id": None, "lat": 10.7766, "lng": 106.6904},
    {"name": "Tân Bình",            "color": "#EF4444", "truck_id": 2,    "lat": 10.7977, "lng": 106.6523},
    {"name": "Tân Phú",             "color": "#EC4899", "truck_id": None, "lat": 10.7949, "lng": 106.6277},
    {"name": "Phú Nhuận",           "color": "#8B5CF6", "truck_id": None, "lat": 10.7982, "lng": 106.6811},
    {"name": "Bình Thạnh",          "color": "#0EA5E9", "truck_id": None, "lat": 10.8122, "lng": 106.7083},
    {"name": "Gò Vấp",              "color": "#F97316", "truck_id": None, "lat": 10.8385, "lng": 106.6653},
    {"name": "Quận 7 — Phú Mỹ Hưng","color": "#14B8A6", "truck_id": None, "lat": 10.7299, "lng": 106.7011},
]


def _haversine_km(lat1, lng1, lat2, lng2):
    import math
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def build_voronoi_zones(waste_points, resolution):
    """Assign every H3 cell covering the waste points (+ their neighbourhood)
    to the nearest zone center. Returns list of zone dicts with non-overlapping
    h3_cells. A cell belongs to exactly one zone (Voronoi partition)."""
    import h3, json as _json

    # Collect candidate cells: each waste point's cell + its ring-1 neighbours,
    # so zones have some area around the actual bins.
    candidate_cells = set()
    for wp in waste_points:
        c = h3.latlng_to_cell(wp["lat"], wp["lng"], resolution)
        candidate_cells.add(c)
        candidate_cells.update(h3.grid_disk(c, 1))

    # Assign each cell to nearest zone center (Voronoi).
    buckets = {z["name"]: [] for z in ZONE_CENTERS}
    for cell in candidate_cells:
        clat, clng = h3.cell_to_latlng(cell)
        nearest = min(ZONE_CENTERS,
                      key=lambda z: _haversine_km(clat, clng, z["lat"], z["lng"]))
        buckets[nearest["name"]].append(cell)

    zones = []
    for z in ZONE_CENTERS:
        cells = buckets[z["name"]]
        if not cells:
            continue
        zones.append({
            "name": z["name"], "color": z["color"], "truck_id": z["truck_id"],
            "h3_cells": _json.dumps(cells),
        })
    return zones

USERS = [
    {"username": "admin",      "role": "admin",      "truck_id": None, "waste_point_name": None},
    {"username": "dispatcher", "role": "dispatcher", "truck_id": None, "waste_point_name": None},
    {"username": "driver1",    "role": "driver",     "truck_id": 1,    "waste_point_name": None},
    {"username": "driver2",    "role": "driver",     "truck_id": 2,    "waste_point_name": None},
]

# Manager accounts — one per managed waste point (fixed bins with on-site staff)
MANAGERS = [
    {"username": "manager.benthanh",  "waste_point_name": "Bến Thành Market Bin A"},
    {"username": "manager.buivien",   "waste_point_name": "Bùi Viện Food Street A"},
    {"username": "manager.taodан",    "waste_point_name": "Tao Đàn Park Bin A"},
    {"username": "manager.tanbinh",   "waste_point_name": "Chợ Tân Bình Bin A"},
]

# Fixed routes — ordered [lat, lng] waypoints looping through each truck's zone.
ROUTES = [
    {
        "truck_id": 1, "name": "Alpha — District 1 loop", "is_active": True,
        "waypoints": [
            [10.7750, 106.6990], [10.7726, 106.6981], [10.7735, 106.6985],
            [10.7766, 106.6904], [10.7782, 106.7045], [10.7775, 106.7012],
            [10.7798, 106.7022], [10.7768, 106.7045], [10.7750, 106.6990],
        ],
    },
    {
        "truck_id": 1, "name": "Alpha — afternoon backup", "is_active": False,
        "waypoints": [
            [10.7750, 106.6990], [10.7665, 106.6932], [10.7668, 106.6936],
            [10.7760, 106.6910], [10.7750, 106.6990],
        ],
    },
    {
        "truck_id": 2, "name": "Beta — Tan Binh / Phu Nhuan loop", "is_active": True,
        "waypoints": [
            [10.7760, 106.6530], [10.7975, 106.6521], [10.7980, 106.6525],
            [10.7949, 106.6277], [10.7981, 106.6810], [10.7984, 106.6813],
            [10.7762, 106.6685], [10.7760, 106.6530],
        ],
    },
]

# ── Hotspot scenarios for demo ─────────────────────────────────────────────────
# Each entry: (waste_point_name, severity, score, reports_data, wp_status)
HOTSPOT_SCENARIOS = [
    # High priority — overflow at market, 4 reports, 18 min ago
    (
        "Bến Thành Market Bin A",
        IssueType.overflow, 92, WastePointStatus.overflow,
        [
            {"issue": IssueType.overflow,   "desc": "Bin overflowing onto the sidewalk",    "mins_ago": 18, "source": WasteEventSource.resident},
            {"issue": IssueType.overflow,   "desc": "Garbage spilling, bad smell",          "mins_ago": 15, "source": WasteEventSource.resident},
            {"issue": IssueType.overflow,   "desc": "Need urgent collection",               "mins_ago": 12, "source": WasteEventSource.resident},
            {"issue": IssueType.overflow,   "desc": "Driver noticed while passing",         "mins_ago":  8, "source": WasteEventSource.driver},
        ],
    ),
    # Medium priority — bulky waste at food street, 2 reports, 34 min ago
    (
        "Bùi Viện Food Street A",
        IssueType.bulky_waste, 62, WastePointStatus.full,
        [
            {"issue": IssueType.bulky_waste, "desc": "Large furniture dumped next to bin",  "mins_ago": 34, "source": WasteEventSource.resident},
            {"issue": IssueType.bulky_waste, "desc": "Old sofa blocking the pavement",      "mins_ago": 28, "source": WasteEventSource.resident},
        ],
    ),
    # Low priority — near full at apartment, 1 report, 6 min ago
    (
        "Lý Tự Trọng Apt Bin",
        IssueType.near_full, 34, WastePointStatus.near_full,
        [
            {"issue": IssueType.near_full, "desc": "Bin is almost full, please collect soon", "mins_ago": 6, "source": WasteEventSource.resident},
        ],
    ),
    # High priority — overflow at park, 3 reports, 11 min ago (emergency)
    (
        "Tao Đàn Park Bin A",
        IssueType.overflow, 88, WastePointStatus.overflow,
        [
            {"issue": IssueType.overflow, "desc": "Emergency — event just ended, huge volume", "mins_ago": 11, "source": WasteEventSource.emergency},
            {"issue": IssueType.overflow, "desc": "Overflow everywhere around the bin",        "mins_ago":  9, "source": WasteEventSource.resident},
            {"issue": IssueType.overflow, "desc": "Confirmed by park staff",                   "mins_ago":  7, "source": WasteEventSource.driver},
        ],
    ),
    # Medium — bad smell at market, 2 reports, 42 min ago
    (
        "Chợ Tân Bình Bin A",
        IssueType.bad_smell, 52, WastePointStatus.near_full,
        [
            {"issue": IssueType.bad_smell, "desc": "Very strong odour near market entrance",  "mins_ago": 42, "source": WasteEventSource.resident},
            {"issue": IssueType.bad_smell, "desc": "Smells like decomposing food waste",      "mins_ago": 35, "source": WasteEventSource.resident},
        ],
    ),
    # Already resolved — overflow at Gò Vấp, resolved 20 min ago
    (
        "Gò Vấp Market Bin",
        IssueType.overflow, 78, WastePointStatus.normal,
        [
            {"issue": IssueType.overflow, "desc": "Bin overflowing after weekend market", "mins_ago": 90, "source": WasteEventSource.resident},
            {"issue": IssueType.overflow, "desc": "Still not collected",                 "mins_ago": 75, "source": WasteEventSource.resident},
        ],
        # mark as resolved
    ),
]


def main():
    print("Seeding WasteHotspot demo data…")
    create_db_and_tables()

    with Session(engine) as s:

        # ── Waste points ──────────────────────────────────────────────────────
        wp_map = {}  # name → WastePoint
        for d in WASTE_POINTS:
            wp = s.exec(select(WastePoint).where(WastePoint.name == d["name"])).first()
            if not wp:
                wp = WastePoint(
                    name=d["name"], lat=d["lat"], lng=d["lng"],
                    area_type=d["area_type"], category=d["category"],
                    h3_cell=latlng_to_cell(d["lat"], d["lng"]),
                    estimated_weight_kg=BIN_WEIGHT_DEFAULTS[d["category"].value],
                    normal_collection_time=d["time"],
                    status=WastePointStatus.normal,
                )
                s.add(wp)
            wp_map[d["name"]] = wp
        s.commit()
        # Refresh to get IDs
        for name in wp_map:
            wp_map[name] = s.exec(select(WastePoint).where(WastePoint.name == name)).first()
        print(f"  ✓ {len(WASTE_POINTS)} waste points")

        # ── Trucks ────────────────────────────────────────────────────────────
        for td in TRUCKS:
            if not s.get(Truck, td["id"]):
                s.add(Truck(
                    id=td["id"], name=td["name"], lat=td["lat"], lng=td["lng"],
                    h3_cell=latlng_to_cell(td["lat"], td["lng"]),
                    max_capacity_kg=td["max_capacity_kg"],
                    current_load_kg=td["current_load_kg"],
                    status=TruckStatus.on_route,
                ))
        s.commit()
        print(f"  ✓ {len(TRUCKS)} trucks (with realistic load)")

        # ── Hotspots + Reports ─────────────────────────────────────────────────
        hotspot_map = {}  # wp_name → Hotspot
        hs_count = 0
        rp_count = 0

        for scenario in HOTSPOT_SCENARIOS:
            # Unpack — last element may be absent (means active, not resolved)
            wp_name, severity, score, wp_status, reports_data, *rest = (*scenario, None)
            resolve_it = (len(scenario) > 5)  # 6th element present = resolved

            wp = wp_map.get(wp_name)
            if not wp:
                continue

            # Guard duplicate
            if s.exec(select(Hotspot).where(Hotspot.waste_point_id == wp.id)).first():
                continue

            created_at = ago(reports_data[0]["mins_ago"])
            hs = Hotspot(
                waste_point_id=wp.id,
                report_count=len(reports_data),
                severity=severity,
                priority_score=score,
                status=HotspotStatus.resolved if resolve_it else HotspotStatus.active,
                created_at=created_at,
                resolved_at=ago(20) if resolve_it else None,
            )
            s.add(hs)
            s.flush()

            for rd in reports_data:
                s.add(Report(
                    waste_point_id=wp.id,
                    hotspot_id=hs.id,
                    issue_type=rd["issue"],
                    description=rd["desc"],
                    lat=wp.lat, lng=wp.lng,
                    source=rd["source"],
                    created_at=ago(rd["mins_ago"]),
                ))
                rp_count += 1

            # Update waste_point status
            wp.status = wp_status
            s.add(wp)

            hotspot_map[wp_name] = hs
            hs_count += 1

        s.commit()
        print(f"  ✓ {hs_count} hotspots + {rp_count} reports")

        # ── Tasks (assigned hotspot → truck) ──────────────────────────────────
        # Truck 1 (Alpha) has 2 active tasks
        active_assignments = [
            ("Bến Thành Market Bin A", 1, "SC-08", "zone_preferred"),
            ("Tao Đàn Park Bin A",     1, "SC-02", "reorder"),
        ]
        task_count = 0
        for wp_name, truck_id, scenario_id, action in active_assignments:
            hs = hotspot_map.get(wp_name)
            if not hs or hs.status == HotspotStatus.resolved:
                continue
            if s.exec(select(Task).where(Task.hotspot_id == hs.id, Task.status == TaskStatus.assigned)).first():
                continue
            s.add(Task(
                hotspot_id=hs.id,
                truck_id=truck_id,
                status=TaskStatus.assigned,
                scenario_id=scenario_id,
                action=action,
                assigned_at=ago(5),
            ))
            task_count += 1

        # Truck 2 (Beta) has 1 active task
        hs_bv = hotspot_map.get("Bùi Viện Food Street A")
        if hs_bv and hs_bv.status != HotspotStatus.resolved:
            if not s.exec(select(Task).where(Task.hotspot_id == hs_bv.id, Task.status == TaskStatus.assigned)).first():
                s.add(Task(
                    hotspot_id=hs_bv.id, truck_id=2,
                    status=TaskStatus.assigned,
                    scenario_id="SC-03", action="reassign",
                    assigned_at=ago(8),
                ))
                task_count += 1

        # 2 completed tasks (to show history in KPIs + shift summary)
        hs_resolved = hotspot_map.get("Gò Vấp Market Bin")
        if hs_resolved:
            if not s.exec(select(Task).where(Task.hotspot_id == hs_resolved.id)).first():
                s.add(Task(
                    hotspot_id=hs_resolved.id, truck_id=1,
                    status=TaskStatus.done,
                    scenario_id="SC-02", action="reorder",
                    assigned_at=ago(80),
                    completed_at=ago(20),
                    weight_collected_kg=150.0,
                ))
                task_count += 1

        s.commit()
        print(f"  ✓ {task_count} tasks (active + completed)")

        # ── Users ─────────────────────────────────────────────────────────────
        demo_hash = bcrypt.hashpw(b"demo123", bcrypt.gensalt()).decode()
        for u in USERS:
            if not s.exec(select(User).where(User.username == u["username"])).first():
                s.add(User(
                    username=u["username"], password=demo_hash,
                    role=u["role"], truck_id=u["truck_id"],
                    waste_point_id=None,
                ))
        s.commit()

        # Manager accounts — bound to specific waste points
        mgr_count = 0
        for m in MANAGERS:
            if s.exec(select(User).where(User.username == m["username"])).first():
                continue
            wp = wp_map.get(m["waste_point_name"])
            if not wp:
                continue
            s.add(User(
                username=m["username"], password=demo_hash,
                role="manager", truck_id=None,
                waste_point_id=wp.id,
            ))
            mgr_count += 1
        s.commit()
        print(f"  ✓ Users: admin / dispatcher / driver1 / driver2  (password: demo123)")
        print(f"  ✓ {mgr_count} manager accounts: " + " / ".join(m["username"] for m in MANAGERS) + "  (password: demo123)")

        # ── Zones (Voronoi — non-overlapping, covers all waste points) ─────────
        from app.utils.constants import H3_RESOLUTION
        zone_defs = build_voronoi_zones(WASTE_POINTS, H3_RESOLUTION)
        seeded_zones = 0
        for zd in zone_defs:
            if not s.exec(select(Zone).where(Zone.name == zd["name"])).first():
                s.add(Zone(**zd))
                seeded_zones += 1
        s.commit()
        if seeded_zones:
            print(f"  ✓ {seeded_zones} zones (Voronoi, city-wide, non-overlapping)")

        # ── Fixed routes ──────────────────────────────────────────────────────
        seeded_routes = 0
        for rd in ROUTES:
            exists = s.exec(
                select(Route).where(Route.truck_id == rd["truck_id"], Route.name == rd["name"])
            ).first()
            if not exists:
                geometry = get_road_geometry(rd["waypoints"])
                route = Route(
                    truck_id=rd["truck_id"],
                    name=rd["name"],
                    is_active=rd["is_active"],
                    waypoints=json.dumps(rd["waypoints"]),
                    geometry=json.dumps(geometry),
                )
                s.add(route)
                s.flush()
                # Link active route to truck.current_route_id
                if rd["is_active"]:
                    truck = s.get(Truck, rd["truck_id"])
                    if truck:
                        truck.current_route_id = route.id
                        s.add(truck)
                seeded_routes += 1
        s.commit()
        if seeded_routes:
            print(f"  ✓ {seeded_routes} fixed routes (road-snapped via ORS)")

    print("\n✅ Seed complete — all screens have live data.")
    print("   Login: dispatcher / driver1 / driver2 / admin  (password: demo123)")


if __name__ == "__main__":
    main()
