"""Tests for capacity helpers — F-WEIGHT acceptance.

Covers capacity_pct, remaining_kg, can_accept, and update_truck_status
transitions (available → near_full → full).
"""
import pytest
from sqlmodel import Session

from app.models import Truck, TruckStatus
from app.services.capacity import capacity_pct, remaining_kg, can_accept, update_truck_status


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_truck(
    session: Session,
    *,
    max_kg: float = 3000.0,
    load_kg: float = 0.0,
    status: TruckStatus = TruckStatus.available,
) -> Truck:
    truck = Truck(
        name="Test Truck",
        lat=10.77,
        lng=106.70,
        h3_cell="89283082803ffff",
        max_capacity_kg=max_kg,
        current_load_kg=load_kg,
        status=status,
    )
    session.add(truck)
    session.commit()
    session.refresh(truck)
    return truck


# ── capacity_pct ─────────────────────────────────────────────────────────────

def test_capacity_pct_empty(session):
    truck = _make_truck(session, max_kg=3000, load_kg=0)
    assert capacity_pct(truck) == 0.0


def test_capacity_pct_half(session):
    truck = _make_truck(session, max_kg=3000, load_kg=1500)
    assert capacity_pct(truck) == 50.0


def test_capacity_pct_full(session):
    truck = _make_truck(session, max_kg=3000, load_kg=3000)
    assert capacity_pct(truck) == 100.0


def test_capacity_pct_zero_max(session):
    """Edge case: truck with 0 max capacity shouldn't crash."""
    truck = _make_truck(session, max_kg=0, load_kg=0)
    assert capacity_pct(truck) == 0.0


# ── remaining_kg ─────────────────────────────────────────────────────────────

def test_remaining_kg_empty(session):
    truck = _make_truck(session, max_kg=3000, load_kg=0)
    assert remaining_kg(truck) == 3000.0


def test_remaining_kg_partial(session):
    truck = _make_truck(session, max_kg=3000, load_kg=2400)
    assert remaining_kg(truck) == 600.0


def test_remaining_kg_over(session):
    """If somehow overloaded, remaining should be 0 not negative."""
    truck = _make_truck(session, max_kg=3000, load_kg=3500)
    assert remaining_kg(truck) == 0.0


# ── can_accept ───────────────────────────────────────────────────────────────

def test_can_accept_true_under_threshold(session):
    """Truck <70% with enough remaining capacity → True."""
    truck = _make_truck(session, max_kg=3000, load_kg=1000)  # 33%
    assert can_accept(truck, 150.0) is True


def test_can_accept_false_over_90_pct(session):
    """Truck ≥90% capacity → rejected regardless of remaining weight."""
    truck = _make_truck(session, max_kg=3000, load_kg=2700)  # 90%
    assert can_accept(truck, 10.0) is False


def test_can_accept_false_insufficient_remaining(session):
    """Truck <90% but not enough remaining capacity for the bin → False."""
    truck = _make_truck(session, max_kg=3000, load_kg=2500)  # 83%
    # remaining = 500 kg, but bin needs 600 kg
    assert can_accept(truck, 600.0) is False


def test_can_accept_true_at_boundary(session):
    """Truck at exactly 89.9% with just enough remaining → True."""
    truck = _make_truck(session, max_kg=3000, load_kg=2697)  # 89.9%
    assert can_accept(truck, 150.0) is True


def test_can_accept_false_at_exactly_90(session):
    """Truck at exactly 90% → FULL_PCT threshold → rejected."""
    truck = _make_truck(session, max_kg=3000, load_kg=2700)  # exactly 90%
    assert can_accept(truck, 1.0) is False


# ── update_truck_status transitions ──────────────────────────────────────────

def test_status_available_when_under_70(session):
    truck = _make_truck(session, max_kg=3000, load_kg=1000)  # 33%
    result = update_truck_status(truck, session)
    assert result.status == TruckStatus.available


def test_status_near_full_at_70(session):
    truck = _make_truck(session, max_kg=3000, load_kg=2100)  # 70%
    result = update_truck_status(truck, session)
    assert result.status == TruckStatus.near_full


def test_status_near_full_at_85(session):
    truck = _make_truck(session, max_kg=3000, load_kg=2550)  # 85%
    result = update_truck_status(truck, session)
    assert result.status == TruckStatus.near_full


def test_status_full_at_90(session):
    truck = _make_truck(session, max_kg=3000, load_kg=2700)  # 90%
    result = update_truck_status(truck, session)
    assert result.status == TruckStatus.full


def test_status_full_at_100(session):
    truck = _make_truck(session, max_kg=3000, load_kg=3000)  # 100%
    result = update_truck_status(truck, session)
    assert result.status == TruckStatus.full


def test_status_transitions_back_down(session):
    """If load is reduced (e.g. depot reset), status should drop back."""
    truck = _make_truck(session, max_kg=3000, load_kg=2700, status=TruckStatus.full)
    truck.current_load_kg = 1000  # back to 33%
    result = update_truck_status(truck, session)
    assert result.status == TruckStatus.available
