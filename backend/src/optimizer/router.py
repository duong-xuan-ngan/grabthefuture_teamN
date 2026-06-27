# src/optimizer/router.py
# BE Dev 2 owns this file.
#
# Responsibilities:
#   1. Filter clusters with priority_score >= HIGH_PRIORITY_THRESHOLD and status='open'
#   2. For each qualifying cluster:
#        a. Find nearest active route by centroid ↔ stop distance
#        b. Test inserting cluster between every consecutive stop pair
#        c. Pick insertion with minimum added distance (nearest-neighbor heuristic)
#        d. Update route.stops JSONB: insert stop, renumber seq
#        e. Recalculate route.distance_km
#   3. Persist updated routes; mark cluster.status='assigned', set cluster.route_id

from src.config import settings
from src.db.pool import get_pool


async def update_routes(route_id: str | None = None) -> None:
    """
    Insert high-priority clusters into active routes.
    If route_id is given, only update that route; otherwise update all active routes.
    """
    # TODO: implement
    raise NotImplementedError
