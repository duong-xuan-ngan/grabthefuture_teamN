import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { cellToBoundary } from 'h3-js';

function pinTruck(code, selected) {
  return L.divIcon({
    className: 'wh-pin',
    html: selected
      ? `<div class="wh-truck-pin" style="background:#00212F;border-color:#00B14F;border-width:2.5px;color:#fff;box-shadow:0 0 0 3px rgba(0,177,79,0.25),0 2px 8px rgba(0,0,0,0.25)">${code}</div>`
      : `<div class="wh-truck-pin">${code}</div>`,
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

const BIN_STATUS_COLOR = {
  normal:    '#9A9A93',
  near_full: '#D97706',
  full:      '#EA580C',
  overflow:  '#DC2626',
};

function pinWaste(status = 'normal') {
  const color = BIN_STATUS_COLOR[status] || BIN_STATUS_COLOR.normal;
  return L.divIcon({
    className: 'wh-pin',
    html: `<div class="wh-waste-pin" style="border-color:${color};background:${color === '#9A9A93' ? '#fff' : color + '22'}"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

const CENTER = [10.7765, 106.7019];

function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function pointOnRoute(route, p) {
  if (!route || route.length < 2) return route?.[0] || CENTER;
  const segs = route.length - 1;
  const total = p * segs;
  const i = Math.min(Math.floor(total), segs - 1);
  return lerp(route[i], route[i + 1], total - i);
}

const ZONE_STATUS_STYLE = {
  normal:     { fillOpacity: 0.06, opacity: 0.4, weight: 1.5 },
  busy:       { fillOpacity: 0.13, opacity: 0.7, weight: 2   },
  overloaded: { fillOpacity: 0.24, opacity: 1.0, weight: 2.5 },
};

export default function MapPanel({ hotspots, trucks, wastePoints = [], zones = [], routes = [], emergencyTruckIds, selectedZoneId, selectedId, onSelect, suggestion, selectedTruckId: selectedTruckIdProp, onSelectTruck }) {
  const [showWaste, setShowWaste]   = useState(true);
  const [showZones, setShowZones]   = useState(true);
  // Which truck's route to display — null = none. Controlled when the parent
  // passes selectedTruckId/onSelectTruck (so the Fleet list can drive it too),
  // otherwise falls back to internal state (truck-marker clicks only).
  const [selectedTruckIdInternal, setSelectedTruckIdInternal] = useState(null);
  const isControlled   = onSelectTruck != null;
  const selectedTruckId = isControlled ? selectedTruckIdProp : selectedTruckIdInternal;
  const setSelectedTruckId = (next) => {
    // Support functional updates against the current value.
    const value = typeof next === 'function' ? next(selectedTruckId) : next;
    if (isControlled) onSelectTruck(value);
    else setSelectedTruckIdInternal(value);
  };
  // Latest setter, so map/marker click handlers bound once at init don't go
  // stale (they capture this ref, not the closure).
  const setSelectedTruckIdRef = useRef(setSelectedTruckId);
  setSelectedTruckIdRef.current = setSelectedTruckId;

  const containerRef    = useRef(null);
  const mapRef          = useRef(null);
  const layersRef       = useRef({ hotspots: {}, waste: [], route: null, zones: [] });
  const truckAnimRef    = useRef({});
  const suggestLineRef  = useRef(null);
  const rafRef          = useRef(null);
  const onSelectRef     = useRef(onSelect);
  onSelectRef.current   = onSelect;
  const dataRef         = useRef({ hotspots, suggestion, selectedId });
  dataRef.current       = { hotspots, suggestion, selectedId };

  // Keep latest trucks accessible inside callbacks without re-running effects
  const trucksRef = useRef(trucks);
  trucksRef.current = trucks;

  // One-shot map init
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    }).setView(CENTER, 15);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);
    mapRef.current = map;

    // Click on blank map → deselect truck
    map.on('click', () => setSelectedTruckIdRef.current(null));

    setTimeout(() => map.invalidateSize(), 80);

    // Animation loop
    let last = null;
    const tick = (ts) => {
      if (last == null) last = ts;
      const dt = (ts - last) / 1000;
      last = ts;

      const anim = truckAnimRef.current;
      for (const id in anim) {
        const st = anim[id];
        if (st.route && st.route.length >= 2) {
          st.progress = (st.progress + st.speed * dt) % 1;
          st.pos = pointOnRoute(st.route, st.progress);
          st.marker.setLatLng(st.pos);
        }
      }

      // Suggestion line (truck → hotspot)
      const { hotspots: hs, suggestion: sg } = dataRef.current;
      const map2 = mapRef.current;
      if (sg && sg.truck && hs) {
        const hot = hs.find((h) => h.id === sg.hotspot_id);
        const st = anim[sg.truck.id];
        const from = st?.pos || (sg.truck.lat != null ? [sg.truck.lat, sg.truck.lng] : null);
        if (hot && from) {
          const pts = [from, [hot.lat, hot.lng]];
          const isEmergency = (hot.priority_score ?? 0) >= 90;
          if (!suggestLineRef.current) {
            suggestLineRef.current = L.polyline(pts, {
              className: 'wh-suggest-line',
              color: '#DC2626',
              weight: isEmergency ? 4 : 3,
              opacity: isEmergency ? 1 : 0.9,
              dashArray: '2 8',
              lineCap: 'round',
            }).addTo(map2);
          } else {
            suggestLineRef.current.setLatLngs(pts);
            suggestLineRef.current.setStyle({ weight: isEmergency ? 4 : 3, opacity: isEmergency ? 1 : 0.9 });
          }
        } else if (suggestLineRef.current) {
          suggestLineRef.current.remove();
          suggestLineRef.current = null;
        }
      } else if (suggestLineRef.current) {
        suggestLineRef.current.remove();
        suggestLineRef.current = null;
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw/update selected truck's route — only ONE route visible at a time
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous route line
    if (layersRef.current.route) {
      layersRef.current.route.remove();
      layersRef.current.route = null;
    }

    if (!selectedTruckId) return;

    // Find waypoints — prefer explicit routes prop, fall back to truck.route
    let waypoints = null;
    const explicitRoute = (routes || []).find((r) => String(r.truck_id) === String(selectedTruckId));
    if (explicitRoute) {
      waypoints = explicitRoute.geometry?.length ? explicitRoute.geometry : explicitRoute.waypoints;
    } else {
      const truck = trucks.find((t) => String(t.id) === String(selectedTruckId));
      waypoints = truck?.route || null;
    }

    if (!waypoints || waypoints.length < 2) return;

    const emergencySet = emergencyTruckIds instanceof Set
      ? emergencyTruckIds : new Set(emergencyTruckIds || []);
    const isEmergency = emergencySet.has(selectedTruckId);

    const line = L.polyline(waypoints, {
      color:   isEmergency ? '#DC2626' : '#00B14F',
      weight:  3,
      opacity: 0.85,
      dashArray: isEmergency ? '10 6' : null,
    }).addTo(map);
    layersRef.current.route = line;

    // Zoom map to fit the route
    map.fitBounds(line.getBounds(), { padding: [40, 40], maxZoom: 16 });

  }, [selectedTruckId, routes, trucks, emergencyTruckIds]);

  // Truck markers — clickable, highlight selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const anim = truckAnimRef.current;
    const seen = new Set();

    trucks.forEach((t, idx) => {
      seen.add(t.id);
      const isSelected = String(t.id) === String(selectedTruckId);
      const start = t.route ? t.route[0] : [t.lat, t.lng];

      if (!anim[t.id]) {
        const marker = L.marker(start, { icon: pinTruck(t.code, isSelected), zIndexOffset: isSelected ? 1000 : 0 })
          .addTo(map)
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setSelectedTruckIdRef.current((cur) => String(cur) === String(t.id) ? null : t.id);
          });
        anim[t.id] = { marker, route: t.route || null, progress: (idx * 0.17) % 1, speed: t.route ? 0.012 + (idx % 3) * 0.004 : 0, pos: start };
      } else {
        anim[t.id].route = t.route || null;
        anim[t.id].marker.setIcon(pinTruck(t.code, isSelected));
        anim[t.id].marker.setZIndexOffset(isSelected ? 1000 : 0);
        if (!t.route) {
          anim[t.id].pos = [t.lat, t.lng];
          anim[t.id].marker.setLatLng([t.lat, t.lng]);
        }
      }
    });

    for (const id in anim) {
      if (!seen.has(id)) { anim[id].marker.remove(); delete anim[id]; }
    }
  }, [trucks, selectedTruckId]);

  // Waste-point dots
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.waste.forEach((m) => m.remove());
    layersRef.current.waste = [];
    wastePoints.forEach((wp) => {
      if (wp.lat == null || wp.lng == null) return;
      const m = L.marker([wp.lat, wp.lng], { icon: pinWaste(wp.status) })
        .addTo(map)
        .bindTooltip(wp.name, { direction: 'top', offset: [0, -4] });
      layersRef.current.waste.push(m);
    });
  }, [wastePoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.waste.forEach((m) => { showWaste ? m.addTo(map) : m.remove(); });
  }, [showWaste]);

  // Zone polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.zones.forEach((p) => p.remove());
    layersRef.current.zones = [];
    if (!showZones) return;
    zones.forEach((zone) => {
      const selected = String(zone.id) === String(selectedZoneId);
      const style = ZONE_STATUS_STYLE[zone.status] || ZONE_STATUS_STYLE.normal;
      (zone.h3_cells || []).forEach((cell) => {
        let boundary;
        try { boundary = cellToBoundary(cell); } catch { return; }
        const poly = L.polygon(boundary, {
          color: zone.color, fillColor: zone.color,
          fillOpacity: selected ? Math.min(style.fillOpacity * 3, 0.45) : style.fillOpacity,
          opacity: selected ? 1 : style.opacity,
          weight: selected ? style.weight + 1 : style.weight,
        }).addTo(map);
        poly.bindTooltip(`${zone.name} · ${zone.status}`, { sticky: true, opacity: 0.85 });
        layersRef.current.zones.push(poly);
      });
    });
  }, [zones, selectedZoneId, showZones]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.zones.forEach((p) => { showZones ? p.addTo(map) : p.remove(); });
  }, [showZones]);

  // Hotspot markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(layersRef.current.hotspots).forEach((m) => m.remove());
    layersRef.current.hotspots = {};
    hotspots.forEach((h) => {
      if (h.lat == null || h.lng == null) return;
      const m = L.marker([h.lat, h.lng], {
        icon: pinHotspot(h.priority_score, h.severity, h.id === selectedId),
      })
        .addTo(map)
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedTruckIdRef.current(null); // deselect truck when picking hotspot
          onSelectRef.current && onSelectRef.current(h.id);
        });
      layersRef.current.hotspots[h.id] = m;
    });
  }, [hotspots, selectedId]);

  // Selected truck info — find from trucks list
  const selectedTruck = selectedTruckId
    ? trucks.find((t) => String(t.id) === String(selectedTruckId))
    : null;

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Filter chips */}
      <div className="absolute top-3.5 left-3.5 z-[500] flex gap-1.5">
        <Chip dotColor="#DC2626" label="Hotspots" active />
        <Chip label="Bins" active={showWaste} onClick={() => setShowWaste((v) => !v)} />
        <Chip label="Zones" active={showZones} onClick={() => setShowZones((v) => !v)} />
      </div>

      {/* Truck route tooltip — appears when a truck is selected */}
      {selectedTruck && (
        <div className="absolute top-3.5 right-3.5 z-[500] bg-white/97 backdrop-blur border shadow-dropdown rounded-card px-4 py-3 min-w-[200px]" style={{ borderColor: '#00B14F' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-ink text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                {selectedTruck.code}
              </div>
              <div>
                <div className="text-[13px] font-bold text-ink leading-tight">{selectedTruck.name}</div>
                <div className="text-[11px] text-ink-2">{selectedTruck.driver || '—'}</div>
              </div>
            </div>
            <button
              onClick={() => setSelectedTruckId(null)}
              className="w-5 h-5 rounded-full bg-surface flex items-center justify-center text-ink-2 hover:text-ink hover:bg-hairline transition-colors text-xs"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <InfoCell label="Stops left" value={selectedTruck.stops_left ?? '—'} />
            <InfoCell label="Load" value={`${selectedTruck.capacity_pct ?? 0}%`} color={
              (selectedTruck.capacity_pct ?? 0) >= 90 ? '#DC2626'
              : (selectedTruck.capacity_pct ?? 0) >= 70 ? '#D97706'
              : '#00B14F'
            } />
          </div>
          {/* Capacity bar */}
          <div className="mt-2 h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${selectedTruck.capacity_pct ?? 0}%`,
                background: (selectedTruck.capacity_pct ?? 0) >= 90 ? '#DC2626' : (selectedTruck.capacity_pct ?? 0) >= 70 ? '#D97706' : '#00B14F',
              }}
            />
          </div>
          <div className="text-[10px] text-ink-2 num mt-1">
            Route shown in <span className="font-semibold" style={{ color: '#00B14F' }}>green</span> · click map to dismiss
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3.5 left-3.5 z-[500] bg-white/95 backdrop-blur border border-line rounded-md px-3 py-2 shadow-sm">
        <div className="text-[9px] font-semibold tracking-widest uppercase text-ink-3 mb-1.5">
          Hotspot priority
        </div>
        <div className="flex gap-2.5 mb-2">
          <Leg color="#DC2626" range="70–100" />
          <Leg color="#D97706" range="40–69" />
          <Leg color="#00B14F" range="0–39" />
        </div>
        <div className="text-[9px] font-semibold tracking-widest uppercase text-ink-3 mb-1.5">
          Bin status
        </div>
        <div className="flex gap-2.5">
          <Leg color="#DC2626" range="Overflow" />
          <Leg color="#EA580C" range="Full" />
          <Leg color="#D97706" range="Near full" />
          <Leg color="#9A9A93" range="Normal" />
        </div>
      </div>
    </>
  );
}

function InfoCell({ label, value, color }) {
  return (
    <div className="bg-surface rounded-btn px-2.5 py-1.5">
      <div className="text-[9px] font-semibold tracking-widest uppercase text-ink-3">{label}</div>
      <div className="text-[14px] font-bold num" style={color ? { color } : { color: '#333' }}>{value}</div>
    </div>
  );
}

function Chip({ label, dotColor, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white/95 backdrop-blur border rounded-btn px-2.5 py-1 text-[11px] font-semibold shadow-card flex items-center gap-1.5 transition-colors duration-200 ${
        active ? 'text-ink' : 'border-line text-ink-2 hover:text-ink'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={active ? { borderColor: '#00B14F' } : {}}
    >
      {dotColor && <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />}
      {label}
    </button>
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
