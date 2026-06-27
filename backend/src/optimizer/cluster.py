# src/optimizer/cluster.py
# BE Dev 2 owns this file.
#
# Responsibilities:
#   1. Fetch all pending reports from DB
#   2. Group by ST_DWithin(location, <radius>) + 4-hour time window
#   3. Compute cluster centroid via ST_Centroid(ST_Collect(...))
#   4. Score: priority = sum(severity_weight) × time_decay_factor
#      severity_weight: high=3, medium=2, low=1
#      time_decay_factor: hours_since_oldest / 4, capped at 3
#   5. Upsert clusters table; update report.cluster_id FK

from src.config import settings
from src.db.pool import get_pool


async def run_clustering() -> None:
    """Cluster pending reports by proximity and time, then score each cluster."""
    # TODO: implement
    raise NotImplementedError
