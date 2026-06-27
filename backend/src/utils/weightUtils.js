// Weight feasibility utilities — shared by routing engine and route handlers

/**
 * Compute derived weight fields for a truck object.
 * @param {{ max_capacity_kg: number, current_load_kg: number }} truck
 */
function computeTruckCapacity(truck) {
  const remaining = truck.max_capacity_kg - truck.current_load_kg;
  const pct = (truck.current_load_kg / truck.max_capacity_kg) * 100;
  return {
    remaining_capacity_kg: remaining,
    capacity_pct: Math.round(pct * 10) / 10,
  };
}

/**
 * Return true if the truck can physically accept this bin's waste weight.
 * @param {{ remaining_capacity_kg: number }} truck  (use computeTruckCapacity first)
 * @param {{ estimated_weight_kg: number }} bin
 */
function canAccept(truck, bin) {
  return truck.remaining_capacity_kg >= bin.estimated_weight_kg;
}

/**
 * Haversine distance in km between two lat/lng points.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return (deg * Math.PI) / 180; }

/**
 * Estimate detour time in minutes using straight-line × traffic factor.
 * @param {number} distKm
 * @param {number} avgSpeedKmh  default 25 km/h urban
 * @param {number} trafficFactor default 1.3
 */
function detourMinutes(distKm, avgSpeedKmh = 25, trafficFactor = 1.3) {
  return (distKm / avgSpeedKmh) * 60 * trafficFactor;
}

module.exports = { computeTruckCapacity, canAccept, haversineKm, detourMinutes };
