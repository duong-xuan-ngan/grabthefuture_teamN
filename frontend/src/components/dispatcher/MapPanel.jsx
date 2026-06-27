import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Default marker icons in Leaflet rely on relative URLs that break under
// bundlers; we use divIcon for our pins instead.

function pinTruck(code) {
  return L.divIcon({
    className: 'wh-pin',
    html: `<div class="wh-truck-pin">${code}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function pinHotspot(score, severity, selected) {
  return L.divIcon({
    className: 'wh-pin',
    html: `<div class="wh-hot-pin wh-hot-pin--${severity}${selected ? ' wh-hot-pin--selected' : ''}">${score}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function pinWaste() {
  return L.divIcon({
    className: 'wh-pin',
    html: `<div class="wh-waste-pin"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

const CENTER = [10.7765, 106.7019];

export default function MapPanel({ hotspots, trucks, selectedId, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ trucks: [], hotspots: {}, waste: [], routes: [] });
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // One-shot init.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    }).setView(CENTER, 15);

    const tiles = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
        crossOrigin: true,
      },
    );
    tiles.on('tileerror', () => {});
    tiles.addTo(map);
    mapRef.current = map;

    // Seed waste-point markers (visual layer, derived from initial fetch)
    const wastePts = [
      [10.779, 106.6995], [10.7775, 106.7012], [10.7762, 106.7028],
      [10.7748, 106.7042], [10.7755, 106.6985], [10.7768, 106.7045],
      [10.7785, 106.7045], [10.774, 106.7008],
    ];
    wastePts.forEach((p) => {
      const m = L.marker(p, { icon: pinWaste() }).addTo(map);
      layersRef.current.waste.push(m);
    });

    setTimeout(() => map.invalidateSize(), 80);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Routes (drawn once we have trucks)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.routes.forEach((p) => p.remove());
    layersRef.current.routes = [];
    trucks.forEach((t) => {
      if (!t.route) return;
      const line = L.polyline(t.route, {
        color: '#0B0B0A',
        weight: 2,
        opacity: 0.45,
        dashArray: '4 5',
      }).addTo(map);
      layersRef.current.routes.push(line);
    });
  }, [trucks]);

  // Truck markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.trucks.forEach((m) => m.remove());
    layersRef.current.trucks = [];
    trucks.forEach((t) => {
      const m = L.marker([t.lat, t.lng], { icon: pinTruck(t.code) }).addTo(map);
      layersRef.current.trucks.push(m);
    });
  }, [trucks]);

  // Hotspot markers (rebuilt when set or selection changes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(layersRef.current.hotspots).forEach((m) => m.remove());
    layersRef.current.hotspots = {};
    hotspots.forEach((h) => {
      const m = L.marker([h.lat, h.lng], {
        icon: pinHotspot(h.priority_score, h.severity, h.id === selectedId),
      })
        .addTo(map)
        .on('click', () => onSelectRef.current && onSelectRef.current(h.id));
      layersRef.current.hotspots[h.id] = m;
    });
  }, [hotspots, selectedId]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Filter chips */}
      <div className="absolute top-3.5 left-3.5 z-[500] flex gap-1.5">
        <Chip dotColor="#B91C1C" label="Hotspots" active />
        <Chip label="Trucks" />
        <Chip label="Routes" />
        <Chip label="Waste pts" muted />
      </div>

      {/* Legend */}
      <div className="absolute bottom-3.5 left-3.5 z-[500] bg-white/95 backdrop-blur border border-line rounded-md px-3 py-2 shadow-sm">
        <div className="text-[9px] font-medium tracking-wider uppercase text-ink-3 mb-1.5">
          Priority
        </div>
        <div className="flex gap-2.5">
          <Leg color="#B91C1C" range="70–100" />
          <Leg color="#B45309" range="40–69" />
          <Leg color="#306D29" range="0–39" />
        </div>
      </div>
    </>
  );
}

function Chip({ label, dotColor, active, muted }) {
  return (
    <div
      className={`bg-white/95 backdrop-blur border border-line rounded-md px-2.5 py-1 text-[11px] font-medium shadow-sm flex items-center gap-1.5 ${
        active ? 'text-ink' : muted ? 'text-ink-3' : 'text-ink-2'
      }`}
    >
      {dotColor && (
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
      )}
      {label}
    </div>
  );
}

function Leg({ color, range }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="num">{range}</span>
    </div>
  );
}
