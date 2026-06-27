// Routing Engine — Member 1
// Implements SC-01 through SC-07 scenario matching with H3 spatial lookup.

const { getCandidateCells } = require('../utils/h3Utils');
const { computeTruckCapacity, canAccept, haversineKm, detourMinutes } = require('../utils/weightUtils');
const {
  CAPACITY_WARN_PCT,
  CAPACITY_FULL_PCT,
  DETOUR_CHEAP_MIN,
  DETOUR_MAX_MIN,
  SCORE_RERUN_THRESHOLD,
  SC07_WATCH_MIN,
  SC07_WEIGHT_THRESHOLD_KG,
} = require('../utils/constants');

// Lazily imported to avoid circular deps — pass prisma in where needed
let _prisma;
function getPrisma() {
  if (!_prisma) _prisma = require('../../prisma/client'); // singleton
  return _prisma;
}

/**
 * Run the routing engine against all active hotspots.
 * Returns an array of suggestion objects (one per hotspot, first matching scenario).
 */
async function runRoutingEngine() {
  const prisma = getPrisma();

  const hotspots = await prisma.hotspot.findMany({
    where: { status: 'active' },
    include: { waste_point: true },
    orderBy: [{ priority_score: 'desc' }, { created_at: 'asc' }], // tie-break: oldest first
  });

  const trucks = await prisma.truck.findMany({
    where: { status: { not: 'off_shift' } },
  });

  // Attach computed capacity fields to each truck
  const enrichedTrucks = trucks.map(t => ({
    ...t,
    ...computeTruckCapacity(t),
  }));

  const suggestions = [];

  for (const hotspot of hotspots) {
    const suggestion = evaluateHotspot(hotspot, enrichedTrucks);
    if (suggestion) suggestions.push(suggestion);
  }

  return suggestions;
}

/**
 * Evaluate a single hotspot against SC-01 → SC-07 and return first match.
 */
function evaluateHotspot(hotspot, trucks) {
  const bin = hotspot.waste_point;
  const { initial: ring2, fallback: ring3 } = getCandidateCells(bin.h3_cell);

  // Trucks in ring-2 and ring-3
  const trucksInRing2 = trucks.filter(t => ring2.includes(t.h3_cell));
  const trucksInRing3 = trucks.filter(t => ring3.includes(t.h3_cell));

  // Feasible trucks (weight check + not full)
  const feasible2 = trucksInRing2.filter(t =>
    t.capacity_pct < CAPACITY_FULL_PCT && canAccept(t, bin)
  );
  const feasible3 = trucksInRing3.filter(t =>
    t.capacity_pct < CAPACITY_FULL_PCT && canAccept(t, bin)
  );

  // Attach detour cost to each feasible truck
  const withDetour = (truckList) =>
    truckList.map(t => ({
      ...t,
      detour_min: Math.round(detourMinutes(haversineKm(t.lat, t.lng, bin.lat, bin.lng))),
    }));

  const candidates2 = withDetour(feasible2);
  const candidates3 = withDetour(feasible3);

  // ── SC-07: single unverified report ──────────────────────────────────────
  if (
    hotspot.report_count === 1 &&
    !hotspotHasPhoto(hotspot) &&
    bin.estimated_weight_kg < SC07_WEIGHT_THRESHOLD_KG
  ) {
    return { scenario: 'SC-07', hotspot_id: hotspot.id, action: 'watching' };
  }

  // ── SC-01: low priority, truck arriving soon ──────────────────────────────
  if (hotspot.priority_score <= 40 && trucksInRing2.some(t => t.capacity_pct < CAPACITY_WARN_PCT)) {
    return { scenario: 'SC-01', hotspot_id: hotspot.id, action: 'keep_route' };
  }

  // ── SC-02: high priority, cheap detour ───────────────────────────────────
  if (hotspot.priority_score >= SCORE_RERUN_THRESHOLD) {
    const cheap = candidates2.filter(t => t.detour_min <= DETOUR_CHEAP_MIN);
    if (cheap.length > 0) {
      const best = pickBestTruck(cheap);
      return {
        scenario: 'SC-02',
        hotspot_id: hotspot.id,
        truck_id: best.id,
        detour_min: best.detour_min,
        capacity_pct: best.capacity_pct,
        action: 'reorder',
      };
    }

    // ── SC-03: high priority, current truck too far/heavy — try second truck ─
    const otherCheap = candidates2
      .filter(t => t.detour_min <= DETOUR_CHEAP_MIN && t.capacity_pct < CAPACITY_WARN_PCT);
    if (otherCheap.length > 0) {
      const best = pickBestTruck(otherCheap);
      return {
        scenario: 'SC-03',
        hotspot_id: hotspot.id,
        truck_id: best.id,
        detour_min: best.detour_min,
        capacity_pct: best.capacity_pct,
        action: 'reassign',
      };
    }
  }

  // ── SC-04: critical, no feasible truck in range ───────────────────────────
  if (hotspot.priority_score >= 90 && candidates3.length === 0) {
    return {
      scenario: 'SC-04',
      hotspot_id: hotspot.id,
      action: 'manual_alert',
      all_trucks: trucks.map(t => ({ id: t.id, name: t.name, capacity_pct: t.capacity_pct })),
    };
  }

  // ── SC-05: multiple simultaneous hotspots handled by caller (greedy ranking)
  // ── SC-06: weight-triggered mid-route warning — handled separately in trucks route

  return null;
}

/** Prefer lowest detour; tie-break on most remaining capacity */
function pickBestTruck(trucks) {
  return trucks.sort((a, b) =>
    a.detour_min !== b.detour_min
      ? a.detour_min - b.detour_min
      : b.remaining_capacity_kg - a.remaining_capacity_kg
  )[0];
}

function hotspotHasPhoto(hotspot) {
  // placeholder — check reports for image_url
  return false;
}

module.exports = { runRoutingEngine };
