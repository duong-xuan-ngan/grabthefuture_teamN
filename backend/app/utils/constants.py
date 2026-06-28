import os

BIN_WEIGHT_DEFAULTS: dict = {
    "small_residential":  30.0,
    "medium_residential": 75.0,
    "market_commercial":  150.0,
    "large_public":       115.0,
}

SEVERITY_BASE_SCORE: dict = {
    "overflow":    60,
    "near_full":   40,
    "bulky_waste": 20,
    "bad_smell":   20,
}

AREA_BONUS_TYPES: set = {"market", "school", "apartment"}

CAPACITY_WARN_PCT:     float = float(os.getenv("CAPACITY_WARN_PCT", 70))
CAPACITY_FULL_PCT:     float = float(os.getenv("CAPACITY_FULL_PCT", 90))
DETOUR_CHEAP_MIN:      float = float(os.getenv("DETOUR_CHEAP_MIN", 15))
DETOUR_MAX_MIN:        float = float(os.getenv("DETOUR_MAX_MIN", 30))
CLUSTER_RADIUS_M:      float = float(os.getenv("CLUSTER_RADIUS_M", 50))
CLUSTER_WINDOW_MIN:    int   = int(os.getenv("CLUSTER_WINDOW_MIN", 30))
SCORE_RERUN_THRESHOLD: int   = int(os.getenv("SCORE_RERUN_THRESHOLD", 70))
# TRD v1.1: H3 resolution 9 with ring-2 as primary candidate lookup
# and ring-3 as fallback before manual dispatcher escalation.
H3_RESOLUTION:         int   = int(os.getenv("H3_RESOLUTION", 9))
TRUCK_NEARBY_RING:     int   = int(os.getenv("TRUCK_NEARBY_RING", 2))
TRUCK_FALLBACK_RING:   int   = int(os.getenv("TRUCK_FALLBACK_RING", 3))
AVG_SPEED_KMH:         float = 25.0
TRAFFIC_FACTOR:        float = 1.3

# F-SCORE-01: +20 if the scheduled truck is more than this many hours away.
SCHEDULED_TRUCK_FAR_HOURS: float = float(os.getenv("SCHEDULED_TRUCK_FAR_HOURS", 3))
# SC-06: a "heavy" stop for projected-overload purposes (kg).
HEAVY_STOP_KG: float = float(os.getenv("HEAVY_STOP_KG", 100))
