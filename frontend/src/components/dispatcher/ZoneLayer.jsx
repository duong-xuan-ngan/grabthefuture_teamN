import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { cellToBoundary } from 'h3-js';

// Zone status → visual properties
const STATUS_STYLE = {
  normal:     { fillOpacity: 0.06, opacity: 0.4, weight: 1.5, dashArray: '4 4' },
  busy:       { fillOpacity: 0.12, opacity: 0.7, weight: 2,   dashArray: null },
  overloaded: { fillOpacity: 0.22, opacity: 1.0, weight: 2.5, dashArray: null },
};

// Convert H3 cell boundary to Leaflet [lat, lng] ring.
function cellToLatLngs(cell) {
  try {
    // cellToBoundary returns [[lat,lng], ...] — already the right order
    return cellToBoundary(cell);
  } catch { return null; }
}

// Merge all cells of a zone into one MultiPolygon GeoJSON for Leaflet.
function zoneToLayer(zone, selected, map) {
  const style = STATUS_STYLE[zone.status] || STATUS_STYLE.normal;
  const layers = [];

  for (const cell of zone.h3_cells) {
    const latlngs = cellToLatLngs(cell);
    if (!latlngs) continue;

    const poly = L.polygon(latlngs, {
      color:       zone.color,
      fillColor:   zone.color,
      fillOpacity: selected ? style.fillOpacity * 2.5 : style.fillOpacity,
      opacity:     selected ? 1 : style.opacity,
      weight:      selected ? style.weight + 1 : style.weight,
      dashArray:   style.dashArray,
    }).addTo(map);

    layers.push(poly);
  }

  // Pulse animation class for overloaded zones.
  if (zone.status === 'overloaded') {
    layers.forEach((p) => {
      const el = p.getElement?.();
      if (el) el.style.animation = 'zone-pulse 1.6s ease-in-out infinite';
    });
  }

  return layers;
}

export default function ZoneLayer({ zones = [], selectedZoneId, map }) {
  const layerRef = useRef({});

  useEffect(() => {
    if (!map) return;
    // Remove all existing zone layers.
    Object.values(layerRef.current).forEach((polys) =>
      polys.forEach((p) => p.remove()),
    );
    layerRef.current = {};

    // Redraw each zone.
    zones.forEach((zone) => {
      const selected = String(zone.id) === String(selectedZoneId);
      const polys = zoneToLayer(zone, selected, map);
      layerRef.current[zone.id] = polys;
    });

    return () => {
      Object.values(layerRef.current).forEach((polys) =>
        polys.forEach((p) => p.remove()),
      );
      layerRef.current = {};
    };
  }, [zones, selectedZoneId, map]);

  return null; // purely imperative Leaflet layer — no JSX output
}
