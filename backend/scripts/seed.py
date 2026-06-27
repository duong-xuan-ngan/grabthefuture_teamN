#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

import bcrypt
from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models import WastePoint, Truck, Hotspot, Report, User, BinCategory, IssueType, TruckStatus
from app.utils.constants import BIN_WEIGHT_DEFAULTS
from app.utils.spatial import latlng_to_cell


WASTE_POINTS = [
    {"name": "Bến Thành Market Bin A", "lat": 10.7726, "lng": 106.6981, "area_type": "market",    "category": BinCategory.market_commercial},
    {"name": "Bến Thành Market Bin B", "lat": 10.7729, "lng": 106.6985, "area_type": "market",    "category": BinCategory.market_commercial},
    {"name": "Nguyễn Huệ Street Bin",  "lat": 10.7741, "lng": 106.7030, "area_type": "street",    "category": BinCategory.small_residential},
    {"name": "Lê Lợi Blvd Bin",        "lat": 10.7735, "lng": 106.6985, "area_type": "street",    "category": BinCategory.small_residential},
    {"name": "Chợ Tân Bình Bin A",     "lat": 10.7975, "lng": 106.6521, "area_type": "market",    "category": BinCategory.market_commercial},
    {"name": "Chợ Tân Bình Bin B",     "lat": 10.7980, "lng": 106.6525, "area_type": "market",    "category": BinCategory.market_commercial},
    {"name": "Tao Đàn Park Bin A",     "lat": 10.7766, "lng": 106.6904, "area_type": "park",      "category": BinCategory.large_public},
    {"name": "Tao Đàn Park Bin B",     "lat": 10.7760, "lng": 106.6910, "area_type": "park",      "category": BinCategory.large_public},
    {"name": "RMIT University Bin",    "lat": 10.7290, "lng": 106.7221, "area_type": "school",    "category": BinCategory.large_public},
    {"name": "Phú Mỹ Hưng Apt Bin A", "lat": 10.7297, "lng": 106.7009, "area_type": "apartment", "category": BinCategory.medium_residential},
    {"name": "Phú Mỹ Hưng Apt Bin B", "lat": 10.7302, "lng": 106.7013, "area_type": "apartment", "category": BinCategory.medium_residential},
    {"name": "Dist 1 Alley Bin 01",   "lat": 10.7791, "lng": 106.7004, "area_type": "street",    "category": BinCategory.small_residential},
    {"name": "Dist 1 Alley Bin 02",   "lat": 10.7793, "lng": 106.7008, "area_type": "street",    "category": BinCategory.small_residential},
    {"name": "Dist 3 Residential A",  "lat": 10.7860, "lng": 106.6870, "area_type": "street",    "category": BinCategory.small_residential},
    {"name": "Dist 3 Residential B",  "lat": 10.7863, "lng": 106.6873, "area_type": "street",    "category": BinCategory.small_residential},
    {"name": "Dist 10 Market Bin",    "lat": 10.7762, "lng": 106.6685, "area_type": "market",    "category": BinCategory.market_commercial},
    {"name": "Dist 10 School Bin",    "lat": 10.7770, "lng": 106.6690, "area_type": "school",    "category": BinCategory.large_public},
    {"name": "Bình Thạnh Apt A",      "lat": 10.8121, "lng": 106.7082, "area_type": "apartment", "category": BinCategory.medium_residential},
    {"name": "Bình Thạnh Apt B",      "lat": 10.8124, "lng": 106.7085, "area_type": "apartment", "category": BinCategory.medium_residential},
    {"name": "Gò Vấp Market Bin",     "lat": 10.8384, "lng": 106.6652, "area_type": "market",    "category": BinCategory.market_commercial},
    {"name": "Gò Vấp Street Bin",     "lat": 10.8387, "lng": 106.6655, "area_type": "street",    "category": BinCategory.small_residential},
    {"name": "Phú Nhuận Bin A",       "lat": 10.7981, "lng": 106.6810, "area_type": "street",    "category": BinCategory.small_residential},
    {"name": "Phú Nhuận Bin B",       "lat": 10.7984, "lng": 106.6813, "area_type": "street",    "category": BinCategory.small_residential},
    {"name": "Tân Phú Market Bin",    "lat": 10.7949, "lng": 106.6277, "area_type": "market",    "category": BinCategory.market_commercial},
    {"name": "Củ Chi Event Venue",    "lat": 11.0026, "lng": 106.4750, "area_type": "park",      "category": BinCategory.large_public},
]


def main():
    print("Seeding WasteHotspot demo data…")
    create_db_and_tables()

    with Session(engine) as session:
        # Waste points
        for wp_data in WASTE_POINTS:
            if not session.exec(select(WastePoint).where(WastePoint.name == wp_data["name"])).first():
                session.add(WastePoint(
                    **wp_data,
                    h3_cell=latlng_to_cell(wp_data["lat"], wp_data["lng"]),
                    estimated_weight_kg=BIN_WEIGHT_DEFAULTS[wp_data["category"].value],
                    normal_collection_time="06:30",
                ))
        session.commit()
        print(f"  ✓ {len(WASTE_POINTS)} waste points")

        # Trucks
        for t in [
            {"id": 1, "name": "Truck Alpha", "lat": 10.7750, "lng": 106.6990, "max_capacity_kg": 3000.0},
            {"id": 2, "name": "Truck Beta",  "lat": 10.7980, "lng": 106.6530, "max_capacity_kg": 2500.0},
        ]:
            if not session.get(Truck, t["id"]):
                session.add(Truck(
                    **t,
                    h3_cell=latlng_to_cell(t["lat"], t["lng"]),
                    current_load_kg=0.0,
                    status=TruckStatus.available,
                ))
        session.commit()
        print("  ✓ 2 trucks")

        # Demo hotspot — Bến Thành Market Bin A overflowing, 3 reports, score 85
        bin_a = session.exec(select(WastePoint).where(WastePoint.name == "Bến Thành Market Bin A")).first()
        if bin_a:
            hotspot = Hotspot(
                waste_point_id=bin_a.id,
                report_count=3,
                severity=IssueType.overflow,
                priority_score=85,
            )
            session.add(hotspot)
            session.flush()
            for i in range(3):
                session.add(Report(
                    waste_point_id=bin_a.id,
                    hotspot_id=hotspot.id,
                    issue_type=IssueType.overflow,
                    description=f"Demo report {i + 1}",
                    lat=bin_a.lat,
                    lng=bin_a.lng,
                ))
            session.commit()
            print("  ✓ Demo hotspot (score 85, overflow, 3 reports)")

        # Demo users — password: demo123
        demo_hash = bcrypt.hashpw(b"demo123", bcrypt.gensalt()).decode()
        for u in [
            {"username": "dispatcher", "role": "dispatcher", "truck_id": None},
            {"username": "driver1",    "role": "driver",     "truck_id": 1},
            {"username": "driver2",    "role": "driver",     "truck_id": 2},
        ]:
            if not session.exec(select(User).where(User.username == u["username"])).first():
                session.add(User(password=demo_hash, **u))
        session.commit()
        print("  ✓ Demo users: dispatcher / driver1 / driver2  (password: demo123)")

    print("\nSeed complete.")


if __name__ == "__main__":
    main()
