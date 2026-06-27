from datetime import datetime, timedelta
from sqlmodel import Session, select, func

from app.models import Hotspot, WastePoint
from app.utils.constants import SEVERITY_BASE_SCORE, AREA_BONUS_TYPES


def compute_priority_score(hotspot: Hotspot, session: Session) -> int:
    waste_point = session.get(WastePoint, hotspot.waste_point_id)
    if not waste_point:
        return 0

    score = SEVERITY_BASE_SCORE.get(hotspot.severity.value, 20)
    score += min((hotspot.report_count - 1) * 5, 20)

    if waste_point.area_type in AREA_BONUS_TYPES:
        score += 15

    if _is_truck_far(waste_point, session):
        score += 20

    if _is_repeat_offender(waste_point.id, session):
        score += 10

    return min(score, 100)


def _is_truck_far(waste_point: WastePoint, session: Session) -> bool:
    # TODO: compare against scheduled truck ETA once route data is available
    return False


def _is_repeat_offender(waste_point_id: int, session: Session) -> bool:
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    stmt = select(func.count(Hotspot.id)).where(
        Hotspot.waste_point_id == waste_point_id,
        Hotspot.created_at >= thirty_days_ago,
    )
    count = session.exec(stmt).one()
    return count >= 3
