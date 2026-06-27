// Priority Score Engine — Member A
// Formula per F-SCORE-01. All weights live in constants.js.

const { SCORE } = require('../utils/constants');

const BASE = {
  overflow:    SCORE.OVERFLOW_BASE,
  near_full:   SCORE.FULL_BASE,
  bulky_waste: SCORE.NEAR_FULL_BASE,
  bad_smell:   SCORE.NEAR_FULL_BASE,
};

const SENSITIVE_TYPES = ['market', 'school', 'apartment'];

/**
 * Compute priority score (0–100) for a hotspot.
 *
 * @param {object} hotspot    — includes severity, report_count, waste_point, created_at
 * @param {object} wastePoint — includes area_type, category, lat, lng, normal_collection_time
 * @param {number} recentHotspotCount — # hotspots at this point in last 30 days
 * @returns {number}  clamped 0–100
 */
function computePriorityScore(hotspot, wastePoint, recentHotspotCount = 0) {
  let score = BASE[hotspot.severity] || 0;

  // +5 per extra report beyond the first, capped at +20
  const reportBonus = Math.min(
    (hotspot.report_count - 1) * SCORE.PER_EXTRA_REPORT,
    SCORE.MAX_REPORT_BONUS
  );
  score += reportBonus;

  // +15 if within sensitive area type
  if (SENSITIVE_TYPES.includes(wastePoint.area_type)) {
    score += SCORE.SENSITIVE_AREA;
  }

  // +20 if scheduled truck is > 3 hours away (approximated by normal_collection_time)
  if (isTruckFarAway(wastePoint.normal_collection_time)) {
    score += SCORE.TRUCK_FAR_BONUS;
  }

  // +10 if repeat offender (≥ 3 hotspots in 30 days)
  if (recentHotspotCount >= 3) {
    score += SCORE.REPEAT_OFFENDER;
  }

  return Math.min(score, 100);
}

/**
 * Returns true if the next scheduled collection is > 3 hours away.
 * normal_collection_time is a string "HH:MM".
 */
function isTruckFarAway(normalCollectionTime) {
  if (!normalCollectionTime) return false;
  const [h, m] = normalCollectionTime.split(':').map(Number);
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(h, m, 0, 0);
  if (scheduled <= now) scheduled.setDate(scheduled.getDate() + 1);
  return (scheduled - now) / 60000 > 180; // > 3 hours in minutes
}

module.exports = { computePriorityScore };
