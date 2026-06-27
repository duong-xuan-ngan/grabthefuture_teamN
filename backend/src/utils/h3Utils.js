// H3 geospatial utilities
const h3 = require('h3-js');
const { H3_RESOLUTION, H3_INITIAL_RING, H3_FALLBACK_RING } = require('./constants');

/**
 * Encode a (lat, lng) pair into an H3 cell string.
 */
function latLngToCell(lat, lng, resolution = H3_RESOLUTION) {
  return h3.latLngToCell(lat, lng, resolution);
}

/**
 * Return a flat array of H3 cell strings within `k` rings of the given cell.
 * Includes the center cell itself.
 */
function getCellsInRing(cell, k = H3_INITIAL_RING) {
  return h3.gridDisk(cell, k);
}

/**
 * Given a hotspot H3 cell, return arrays of cells for initial and fallback rings.
 * Used by the routing engine to query candidate trucks.
 */
function getCandidateCells(hotspotCell) {
  return {
    initial:  getCellsInRing(hotspotCell, H3_INITIAL_RING),
    fallback: getCellsInRing(hotspotCell, H3_FALLBACK_RING),
  };
}

module.exports = { latLngToCell, getCellsInRing, getCandidateCells };
