"""Tests for the routing engine — Milestone 2 acceptance.

Tests the individual scenario functions (_sc01–_sc07) directly with synthetic
truck/hotspot data, and tests the approve/reject endpoints via FastAPI's
TestClient with an in-memory SQLite DB.
"""
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from sqlmodel import Session

from app.models import (
    Hotspot, WastePoint, Truck, Task, Report, RejectedSuggestion,
    HotspotStatus, BinCategory, IssueType, TruckStatus, TaskStatus,
    WasteEventSource,
)
from app.services.routing import (
    _sc01, _sc02, _sc03, _sc04, _sc07, _sc06_warnings, _mk,
    run_routing_engine,
)
from app.services.capacity import capacity_pct, remaining_kg


# ── Helpers ──────────────────────────────────────────────────────────────────

def _wp(session, *, weight_kg=30.0, area_type="street") -> WastePoint:
    wp = WastePoint(
        name="Test Bin", lat=10.77, lng=106.70, h3_cell="89283082803ffff",
        area_type=area_type, category=BinCategory.small_residential,
        estimated_weight_kg=weight_kg,
    )
    session.add(wp)
    session.commit()
    session.refresh(wp)
    return wp


def _hotspot(session, wp, *, score=80, count=2) -> Hotspot:
    hs = Hotspot(
        waste_point_id=wp.id, severity=IssueType.overflow,
        report_count=count, priority_score=score,
        status=HotspotStatus.active,
    )
    session.add(hs)
    session.commit()
    session.refresh(hs)
    return hs


def _truck(session, *, load_kg=0.0, max_kg=3000.0, lat=10.77, lng=106.70,
           status=TruckStatus.available) -> Truck:
    truck = Truck(
        name="Test Truck", lat=lat, lng=lng,
        h3_cell="89283082803ffff", status=status,
        max_capacity_kg=max_kg, current_load_kg=load_kg,
    )
    session.add(truck)
    session.commit()
    session.refresh(truck)
    return truck


def _report(session, hotspot) -> Report:
    rpt = Report(
        waste_point_id=hotspot.waste_point_id, hotspot_id=hotspot.id,
        issue_type=IssueType.overflow, lat=10.77, lng=106.70,
        source=WasteEventSource.resident,
    )
    session.add(rpt)
    session.commit()
    session.refresh(rpt)
    return rpt


def _truck_entry(truck, *, detour=5.0, feasible=True):
    """Simulate the enriched candidate dict returned by _candidate_trucks."""
    return {
        "truck": truck,
        "pct": capacity_pct(truck),
        "feasible": feasible,
        "detour": detour,
    }


# ── SC-01: Low priority, keep route ─────────────────────────────────────────

def test_sc01_low_priority_keep_route(session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=30, count=1)
    truck = _truck(session, load_kg=500)  # 16.7%, <70%
    candidates = [_truck_entry(truck, detour=10.0)]

    result = _sc01(hs, candidates)
    assert result is not None
    assert result["scenario"] == "SC-01"
    assert result["action"] == "keep_route"


def test_sc01_skips_high_priority(session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=75)
    truck = _truck(session, load_kg=500)
    candidates = [_truck_entry(truck, detour=10.0)]

    result = _sc01(hs, candidates)
    assert result is None


# ── SC-02: High priority, cheap detour ───────────────────────────────────────

def test_sc02_high_priority_cheap_detour(session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    truck = _truck(session, load_kg=500)
    candidates = [_truck_entry(truck, detour=10.0, feasible=True)]

    result = _sc02(hs, candidates)
    assert result is not None
    assert result["scenario"] == "SC-02"
    assert result["action"] == "reorder"
    assert result["truck_id"] == truck.id


def test_sc02_skips_infeasible(session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    truck = _truck(session, load_kg=2800)  # 93%, infeasible
    candidates = [_truck_entry(truck, detour=10.0, feasible=False)]

    result = _sc02(hs, candidates)
    assert result is None


def test_sc02_skips_expensive_detour(session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    truck = _truck(session, load_kg=500)
    candidates = [_truck_entry(truck, detour=20.0, feasible=True)]  # >15 min

    result = _sc02(hs, candidates)
    assert result is None


# ── SC-03: Reassign to lighter/closer truck ──────────────────────────────────

def test_sc03_reassign_when_nearest_too_heavy(session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    heavy_truck = _truck(session, load_kg=2200, max_kg=3000)  # 73%, near_full
    light_truck = _truck(session, load_kg=500, max_kg=3000)

    candidates = [
        _truck_entry(heavy_truck, detour=5.0, feasible=True),   # nearest but heavy
        _truck_entry(light_truck, detour=10.0, feasible=True),  # lighter alternative
    ]

    result = _sc03(hs, candidates)
    assert result is not None
    assert result["scenario"] == "SC-03"
    assert result["action"] == "reassign"
    assert result["truck_id"] == light_truck.id


def test_sc03_skips_when_nearest_is_fine(session):
    """If the nearest truck is feasible, cheap, and <70%, SC-02 handles it."""
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    truck = _truck(session, load_kg=500)
    candidates = [_truck_entry(truck, detour=5.0, feasible=True)]

    result = _sc03(hs, candidates)
    assert result is None  # SC-02 should fire, not SC-03


def test_sc03_no_alt_truck(session):
    """Nearest is disqualified but no alternative exists → None (fall to SC-04)."""
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    heavy_truck = _truck(session, load_kg=2200, max_kg=3000)  # 73%
    candidates = [_truck_entry(heavy_truck, detour=5.0, feasible=True)]

    result = _sc03(hs, candidates)
    assert result is None


# ── SC-04: No feasible truck — manual alert ──────────────────────────────────

def test_sc04_no_feasible_truck(session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    truck = _truck(session, load_kg=2800)  # 93%
    candidates = [_truck_entry(truck, detour=10.0, feasible=False)]

    result = _sc04(hs, candidates)
    assert result is not None
    assert result["scenario"] == "SC-04"
    assert result["action"] == "manual_alert"
    assert result["truck_id"] is None


def test_sc04_skips_when_feasible_exists(session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    truck = _truck(session, load_kg=500)
    candidates = [_truck_entry(truck, detour=10.0, feasible=True)]

    result = _sc04(hs, candidates)
    assert result is None


def test_sc04_skips_low_priority(session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=40)
    truck = _truck(session, load_kg=2800)
    candidates = [_truck_entry(truck, detour=10.0, feasible=False)]

    result = _sc04(hs, candidates)
    assert result is None


# ── SC-05: Greedy assignment — no double booking ─────────────────────────────

def test_sc05_greedy_no_double_book(session):
    """Two hotspots, two trucks → each should be assigned to a different truck."""
    wp1 = _wp(session)
    wp2 = _wp(session)
    hs1 = _hotspot(session, wp1, score=85)
    hs2 = _hotspot(session, wp2, score=80)
    truck_a = _truck(session, load_kg=500)
    truck_b = _truck(session, load_kg=600)

    cands1 = [
        _truck_entry(truck_a, detour=5.0, feasible=True),
        _truck_entry(truck_b, detour=8.0, feasible=True),
    ]
    cands2 = [
        _truck_entry(truck_a, detour=6.0, feasible=True),
        _truck_entry(truck_b, detour=4.0, feasible=True),
    ]

    # Process hs1 first (higher score).
    r1 = _sc02(hs1, cands1, multi=True)
    assert r1 is not None
    assert r1["scenario"] == "SC-05"
    committed = r1["truck_id"]

    # Remove committed truck from candidates for hs2.
    cands2_filtered = [c for c in cands2 if c["truck"].id != committed]
    r2 = _sc02(hs2, cands2_filtered, multi=True)
    assert r2 is not None
    assert r2["truck_id"] != committed  # no double booking


# ── SC-06: Projected overload warning ────────────────────────────────────────

def test_sc06_projected_overload(session):
    wp_heavy = _wp(session, weight_kg=150.0)
    truck = _truck(session, load_kg=2300, max_kg=3000)  # 76.7%

    # Create 2 assigned tasks with heavy waste points.
    for _ in range(2):
        hs = _hotspot(session, wp_heavy, score=80)
        task = Task(
            hotspot_id=hs.id, truck_id=truck.id,
            status=TaskStatus.assigned,
        )
        session.add(task)
    session.commit()

    # projected: 2300 + 2*150 = 2600 → 86.7%... not quite 90%.
    # Let's push it: load_kg=2500, two 150kg stops → 2800/3000 = 93.3%
    truck.current_load_kg = 2500
    session.add(truck)
    session.commit()

    warnings = _sc06_warnings(session)
    assert len(warnings) >= 1
    w = [w for w in warnings if w["truck_id"] == truck.id]
    assert len(w) == 1
    assert w[0]["scenario"] == "SC-06"
    assert w[0]["action"] == "warn_offload"
    assert w[0]["projected_pct"] >= 90.0


# ── SC-07: Unverified single report ──────────────────────────────────────────

def test_sc07_single_report_light_bin(session):
    wp = _wp(session, weight_kg=30.0)  # <40 kg
    hs = _hotspot(session, wp, score=20, count=1)

    result = _sc07(hs, wp)
    assert result is not None
    assert result["scenario"] == "SC-07"
    assert result["action"] == "watching"


def test_sc07_skips_heavy_bin(session):
    wp = _wp(session, weight_kg=150.0)  # ≥40 kg
    hs = _hotspot(session, wp, score=20, count=1)

    result = _sc07(hs, wp)
    assert result is None


def test_sc07_skips_multiple_reports(session):
    wp = _wp(session, weight_kg=30.0)
    hs = _hotspot(session, wp, score=30, count=2)  # >1 report

    result = _sc07(hs, wp)
    assert result is None


# ── SC-08 & SC-09: Zones ───────────────────────────────────────────────────────

@patch("app.services.routing._get_zone_truck")
def test_sc08_zone_preferred(mock_get_zone, session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    truck_zone = _truck(session, load_kg=500)
    truck_other = _truck(session, load_kg=400)

    # Mock the zone truck lookup to return our zone truck
    mock_get_zone.return_value = truck_zone

    candidates = [
        _truck_entry(truck_zone, detour=10.0, feasible=True),
        _truck_entry(truck_other, detour=5.0, feasible=True),  # Closer, but not in zone
    ]

    # SC-08 should fire and pick the zone truck despite the other truck being closer
    from app.services.routing import _sc08_zone
    result = _sc08_zone(hs, candidates, truck_zone, excluded=set())
    assert result is not None
    assert result["scenario"] == "SC-08"
    assert result["truck_id"] == truck_zone.id


@patch("app.services.routing._get_zone_truck")
def test_sc09_zone_overflow(mock_get_zone, session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    truck_zone = _truck(session, load_kg=2800)  # Over capacity
    truck_adj = _truck(session, load_kg=500)    # Adjacent zone, feasible

    mock_get_zone.return_value = truck_zone

    candidates = [
        _truck_entry(truck_zone, detour=10.0, feasible=False),
        _truck_entry(truck_adj, detour=8.0, feasible=True),
    ]

    from app.services.routing import _sc09_zone_overflow
    result = _sc09_zone_overflow(hs, candidates, truck_zone)
    assert result is not None
    assert result["scenario"] == "SC-09"
    assert result["truck_id"] == truck_adj.id


@patch("app.services.routing._get_zone_truck")
def test_sc09_skips_when_zone_truck_fine(mock_get_zone, session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    truck_zone = _truck(session, load_kg=500)
    truck_adj = _truck(session, load_kg=400)

    mock_get_zone.return_value = truck_zone

    candidates = [
        _truck_entry(truck_zone, detour=10.0, feasible=True),
        _truck_entry(truck_adj, detour=8.0, feasible=True),
    ]

    from app.services.routing import _sc09_zone_overflow
    # Should be None because the zone truck is perfectly capable (SC-08 will handle it)
    result = _sc09_zone_overflow(hs, candidates, truck_zone)
    assert result is None


# ── Approve / Reject endpoint tests ──────────────────────────────────────────

@pytest.fixture()
def client(session):
    """FastAPI TestClient wired to the in-memory SQLite session."""
    from fastapi.testclient import TestClient
    from app.database import get_session
    import main

    def _override():
        yield session

    main.app.dependency_overrides[get_session] = _override
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def test_approve_creates_task(client, session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    _report(session, hs)
    truck = _truck(session, load_kg=500)

    resp = client.post(
        f"/api/routing/approve/{hs.id}",
        params={"truck_id": truck.id, "scenario": "SC-02", "action": "reorder"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "approved"
    assert body["task_id"] is not None
    assert body["hotspot_id"] == hs.id
    assert body["truck_id"] == truck.id

    # Verify task exists in DB.
    task = session.get(Task, body["task_id"])
    assert task is not None
    assert task.status == TaskStatus.assigned


def test_approve_rejects_over_capacity(client, session):
    wp = _wp(session, weight_kg=150.0)
    hs = _hotspot(session, wp, score=80)
    _report(session, hs)
    truck = _truck(session, load_kg=2800, max_kg=3000)  # 93%, can't accept

    resp = client.post(
        f"/api/routing/approve/{hs.id}",
        params={"truck_id": truck.id},
    )
    assert resp.status_code == 409
    assert "capacity" in resp.json()["detail"].lower()


def test_approve_rejects_duplicate(client, session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    _report(session, hs)
    truck = _truck(session, load_kg=500)

    # First approval succeeds.
    resp1 = client.post(
        f"/api/routing/approve/{hs.id}",
        params={"truck_id": truck.id},
    )
    assert resp1.status_code == 200

    # Second approval for same hotspot fails.
    resp2 = client.post(
        f"/api/routing/approve/{hs.id}",
        params={"truck_id": truck.id},
    )
    assert resp2.status_code == 409
    assert "already" in resp2.json()["detail"].lower()


def test_reject_persists_record(client, session):
    wp = _wp(session)
    hs = _hotspot(session, wp, score=80)
    _report(session, hs)
    truck = _truck(session, load_kg=500)

    resp = client.post(
        f"/api/routing/reject/{hs.id}",
        params={"truck_id": truck.id},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"

    # Verify record exists.
    from sqlmodel import select
    rejs = session.exec(
        select(RejectedSuggestion).where(
            RejectedSuggestion.hotspot_id == hs.id,
            RejectedSuggestion.truck_id == truck.id,
        )
    ).all()
    assert len(rejs) == 1
