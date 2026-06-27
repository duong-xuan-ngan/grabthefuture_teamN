// src/utils/co2.js
// Shared utility — both BE devs can use this.

const CO2_FACTOR = parseFloat(process.env.CO2_FACTOR_KG_PER_KM || '0.21');

/**
 * Calculate estimated CO₂ reduction from route optimization.
 * @param {number} baselineKm  - Original route distance before optimization
 * @param {number} optimizedKm - Route distance after inserting clustered stops
 * @returns {{ savedKm: number, co2SavedKg: number, label: string }}
 */
function calcCO2Savings(baselineKm, optimizedKm) {
  const savedKm = Math.max(0, baselineKm - optimizedKm);
  const co2SavedKg = parseFloat((savedKm * CO2_FACTOR).toFixed(2));
  return {
    savedKm: parseFloat(savedKm.toFixed(2)),
    co2SavedKg,
    label: 'estimated', // Always surface this label in API responses
  };
}

/**
 * Estimate time saved based on average crew speed.
 * @param {number} savedKm
 * @param {number} avgSpeedKmh  - Default: 20 km/h for urban waste truck
 * @returns {number} Estimated minutes saved
 */
function calcTimeSavingsMinutes(savedKm, avgSpeedKmh = 20) {
  return parseFloat(((savedKm / avgSpeedKmh) * 60).toFixed(1));
}

module.exports = { calcCO2Savings, calcTimeSavingsMinutes };
