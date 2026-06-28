"""Tests for compute_priority_score — F-SCORE-01 acceptance.

Each test isolates a single scoring factor by seeding the minimal DB state
needed for that factor, then asserts the returned score matches expectations.
"""
from datetime import datetime, timedelta

import pytest
from sqlmodel import Session

from app.models import (
    Hotspot, WastePoint, Report, HotspotStatus, BinCategory, IssueType,
    WasteEventSource,
)
from app.services.priority_score import compute_priority_score


# ── Helpers ──────────────────────────────────────────────────────────────────

def _soon_time() -> str:
    """Return a collection time ~1 hour from now (HH:MM) so truck is NOT far."""
    t = datetime.utcnow() + timedelta(hours=1)
    return f"{t.hour:02d}:{t.minute:02d}"


def _make_wp(
    session: Session,
    *,
    area_type: str = "street",
    category: BinCategory = BinCategory.small_residential,
    collection_time: str | None = None,
) -> WastePoint:
    wp = WastePoint(
        name="Test Bin",
        lat=10.77,
        lng=106.70,
        h3_cell="89283082803ffff",
        area_type=area_type,
        category=category,
        estimated_weight_kg=30.0,
        normal_collection_time=collection_time,
    )
    session.add(wp)
    session.commit()
    session.refresh(wp)
    return wp


def _make_hotspot(
    session: Session,
    wp: WastePoint | None,
    *,
    severity: IssueType = IssueType.overflow,
    report_count: int = 1,
) -> Hotspot:
    hs = Hotspot(
        waste_point_id=wp.id if wp else None,
        severity=severity,
        report_count=report_count,
        status=HotspotStatus.active,
    )
    session.add(hs)
    session.commit()
    session.refresh(hs)
    return hs


def _make_report(
    session: Session,
    hotspot: Hotspot,
    *,
    source: WasteEventSource = WasteEventSource.resident,
) -> Report:
    rpt = Report(
        waste_point_id=hotspot.waste_point_id,
        hotspot_id=hotspot.id,
        issue_type=hotspot.severity,
        lat=10.77,
        lng=106.70,
        source=source,
    )
    session.add(rpt)
    session.commit()
    session.refresh(rpt)
    return rpt


# ── F1: Severity base score ─────────────────────────────────────────────────

@pytest.mark.parametrize("issue,expected_base", [
    (IssueType.overflow,    60),
    (IssueType.near_full,   40),
    (IssueType.bulky_waste, 20),
    (IssueType.bad_smell,   20),
])
def test_severity_base_score(session, issue, expected_base):
    wp = _make_wp(session, collection_time=_soon_time())  # truck not far
    hs = _make_hotspot(session, wp, severity=issue, report_count=1)
    _make_report(session, hs)

    score = compute_priority_score(hs, session)
    # With report_count=1, non-sensitive area, truck NOT far, not repeat offender:
    # score should equal the severity base.
    assert score == expected_base, f"Expected {expected_base} for {issue}, got {score}"


# ── F2: Report count bonus (cap +20) ────────────────────────────────────────

def test_report_count_bonus_incremental(session):
    wp = _make_wp(session, collection_time=_soon_time())
    hs = _make_hotspot(session, wp, severity=IssueType.overflow, report_count=3)
    _make_report(session, hs)

    score = compute_priority_score(hs, session)
    # base=60, rc_bonus=(3-1)*5=10 → 70
    assert score == 70


def test_report_count_bonus_capped(session):
    wp = _make_wp(session, collection_time=_soon_time())
    hs = _make_hotspot(session, wp, severity=IssueType.overflow, report_count=10)
    _make_report(session, hs)

    score = compute_priority_score(hs, session)
    # base=60, rc_bonus=min(9*5,20)=20 → 80
    assert score == 80


# ── F3: Sensitive area bonus (+15) ───────────────────────────────────────────

@pytest.mark.parametrize("area,bonus", [
    ("market",    15),
    ("school",    15),
    ("apartment", 15),
    ("street",     0),
    ("park",       0),
])
def test_area_bonus(session, area, bonus):
    wp = _make_wp(session, area_type=area, collection_time=_soon_time())
    hs = _make_hotspot(session, wp, severity=IssueType.near_full, report_count=1)
    _make_report(session, hs)

    score = compute_priority_score(hs, session)
    # near_full base=40, no rc bonus, no truck-far, no repeat
    assert score == 40 + bonus


# ── F4: Truck far bonus (+20) ───────────────────────────────────────────────

def test_truck_far_bonus_when_no_schedule(session):
    """No schedule → treated as far → +20."""
    wp = _make_wp(session, collection_time=None)
    hs = _make_hotspot(session, wp, severity=IssueType.near_full, report_count=1)
    _make_report(session, hs)

    score = compute_priority_score(hs, session)
    # base=40 + truck_far=20 = 60
    assert score == 60


def test_truck_far_bonus_when_collection_imminent(session):
    """Collection time is very soon (within 3h) → NOT far → no bonus."""
    wp = _make_wp(session, collection_time=_soon_time())
    hs = _make_hotspot(session, wp, severity=IssueType.near_full, report_count=1)
    _make_report(session, hs)

    score = compute_priority_score(hs, session)
    # base=40, truck NOT far → no bonus
    assert score == 40


# ── F5: Repeat offender bonus (+10) ─────────────────────────────────────────

def test_repeat_offender_bonus(session):
    """≥3 hotspots in 30 days → +10."""
    wp = _make_wp(session, collection_time=_soon_time())
    # Create 3 prior hotspots at the same waste point
    for _ in range(3):
        prior = Hotspot(
            waste_point_id=wp.id,
            severity=IssueType.overflow,
            report_count=1,
            status=HotspotStatus.resolved,
        )
        session.add(prior)
    session.commit()

    hs = _make_hotspot(session, wp, severity=IssueType.near_full, report_count=1)
    _make_report(session, hs)

    score = compute_priority_score(hs, session)
    # base=40, repeat_offender=10 → 50
    # Note: ≥3 means the 3 resolved + 1 active = 4, which is ≥3
    assert score == 50


def test_not_repeat_offender(session):
    """Fewer than 3 hotspots in 30 days → no bonus."""
    wp = _make_wp(session, collection_time=_soon_time())
    # Only 1 prior hotspot
    prior = Hotspot(
        waste_point_id=wp.id,
        severity=IssueType.overflow,
        report_count=1,
        status=HotspotStatus.resolved,
    )
    session.add(prior)
    session.commit()

    hs = _make_hotspot(session, wp, severity=IssueType.near_full, report_count=1)
    _make_report(session, hs)

    score = compute_priority_score(hs, session)
    # base=40, only 2 total hotspots (1 resolved + 1 active) < 3
    assert score == 40


# ── Cap at 100 ───────────────────────────────────────────────────────────────

def test_score_capped_at_100(session):
    """Even with all bonuses, score must not exceed 100."""
    wp = _make_wp(session, area_type="market", collection_time=None)
    # Create 3 prior hotspots for repeat offender
    for _ in range(3):
        prior = Hotspot(
            waste_point_id=wp.id,
            severity=IssueType.overflow,
            report_count=1,
            status=HotspotStatus.resolved,
        )
        session.add(prior)
    session.commit()

    # overflow(60) + rc_bonus(20) + area(15) + truck_far(20) + repeat(10) = 125 → cap at 100
    hs = _make_hotspot(session, wp, severity=IssueType.overflow, report_count=5)
    _make_report(session, hs)

    score = compute_priority_score(hs, session)
    assert score == 100
