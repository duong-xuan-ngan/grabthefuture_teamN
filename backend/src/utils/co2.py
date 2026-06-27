# src/utils/co2.py
# Shared utility — both BE devs can import from here.

from src.config import settings


def calc_co2_savings(baseline_km: float, optimized_km: float) -> dict:
    """
    Calculate estimated CO₂ reduction from route optimization.

    Args:
        baseline_km:  Original route distance before optimization.
        optimized_km: Route distance after inserting clustered stops.

    Returns:
        dict with saved_km, co2_saved_kg, and co2_label="estimated".
    """
    saved_km = max(0.0, baseline_km - optimized_km)
    co2_saved_kg = round(saved_km * settings.co2_factor_kg_per_km, 2)
    return {
        "saved_km":    round(saved_km, 2),
        "co2_saved_kg": co2_saved_kg,
        "co2_label":   "estimated",   # always surface this label in API responses
    }


def calc_time_savings_minutes(saved_km: float, avg_speed_kmh: float = 20.0) -> float:
    """
    Estimate time saved based on average crew vehicle speed.

    Args:
        saved_km:       Distance saved in km.
        avg_speed_kmh:  Default 20 km/h for urban waste truck.

    Returns:
        Estimated minutes saved (float, 1 decimal place).
    """
    return round((saved_km / avg_speed_kmh) * 60, 1)
