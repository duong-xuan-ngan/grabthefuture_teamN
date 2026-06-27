import { useEffect, useRef } from 'react';
import L from 'leaflet';

const DEFAULT_CENTER = [10.7765, 106.7019];

function pinActive(score) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:#DC2626;border:2.5px solid #fff;
      box-shadow:0 2px 10px rgba(220,38,38,0.45);
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:700;color:#fff;
      font-family:'Helvetica Neue',Arial,sans-serif;
    ">${score ?? '!'}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function pinPending(seq) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:#fff;border:2px solid #767676;
      box-shadow:0 1px 4px rgba(0,0,0,0.18);
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:600;color:#767676;
      font-family:'Helvetica Neue',Arial,sans-serif;
    ">${seq}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function pinDone() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:#E6F7EE;border:2px solid #00B14F;
      box-shadow:0 1px 3px rgba(0,0,0,0.12);
      display:flex;align-items:center;justify-content:center;
    ">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="#00B14F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function pinTruck(code) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      background:#00212F;border:2.5px solid #00B14F;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:700;color:#fff;
      font-family:'Helvetica Neue',Arial,sans-serif;
    ">${code ?? 'T'}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export default function MapPreview({ tasks = [], activeTask, truck }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);

  // Initial map creation
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
      preferCanvas: true,
    }).setView(DEFAULT_CENTER, 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 60);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw all layers whenever tasks / truck changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous layers
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];

    const add = (layer) => { layer.addTo(map); layersRef.current.push(layer); return layer; };

    // Filter tasks that have coords
    const withCoords = tasks.filter((t) => t.lat != null && t.lng != null);
    if (!withCoords.length && !truck) return;

    // Build ordered waypoints for the route polyline:
    // truck current position → all non-done tasks in sequence order
    const routePoints = [];
    if (truck?.lat != null) routePoints.push([truck.lat, truck.lng]);

    const doneTasks    = withCoords.filter((t) => t.status === 'done' || t.status === 'unreachable');
    const activeTasks  = withCoords.filter((t) => t.status === 'active');
    const pendingTasks = withCoords.filter((t) => t.status === 'pending');

    // Done route (green, faded)
    const donePoints = doneTasks.map((t) => [t.lat, t.lng]);
    if (truck?.lat != null && donePoints.length) {
      add(L.polyline([[truck.lat, truck.lng], ...donePoints], {
        color: '#00B14F', weight: 2, opacity: 0.3, dashArray: null,
      }));
    }

    // Remaining route (dark dashed: truck → active → pending)
    const remaining = [
      ...(truck?.lat != null ? [[truck.lat, truck.lng]] : []),
      ...activeTasks.map((t) => [t.lat, t.lng]),
      ...pendingTasks.map((t) => [t.lat, t.lng]),
    ];
    if (remaining.length >= 2) {
      add(L.polyline(remaining, {
        color: '#00212F', weight: 2, opacity: 0.55, dashArray: '5 7',
      }));
    }

    // Done pins
    doneTasks.forEach((t) => add(L.marker([t.lat, t.lng], { icon: pinDone() })));

    // Pending pins
    pendingTasks.forEach((t) => add(L.marker([t.lat, t.lng], { icon: pinPending(t.sequence) })));

    // Active pin — on top
    activeTasks.forEach((t) => add(L.marker([t.lat, t.lng], { icon: pinActive(t.priority_score) })));

    // Truck pin
    if (truck?.lat != null) {
      add(L.marker([truck.lat, truck.lng], { icon: pinTruck(truck.code) }));
    }

    // Fit map to all visible points
    const allPts = [
      ...(truck?.lat != null ? [[truck.lat, truck.lng]] : []),
      ...withCoords.map((t) => [t.lat, t.lng]),
    ];
    if (allPts.length === 1) {
      map.setView(allPts[0], 16, { animate: false });
    } else if (allPts.length > 1) {
      map.fitBounds(L.latLngBounds(allPts), { padding: [28, 28], maxZoom: 16, animate: false });
    }
    setTimeout(() => map.invalidateSize(), 60);
  }, [tasks, truck]);

  const activeEta = activeTask?.eta_minutes;
  const activeDist = activeTask?.distance_km;

  return (
    <div className="relative flex-shrink-0" style={{ height: '200px' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* Distance / ETA badge for the active stop */}
      {(activeDist != null || activeEta != null) && (
        <div className="absolute top-2.5 left-2.5 z-[500] bg-white/95 backdrop-blur border border-hairline px-2.5 py-1 rounded-btn text-[11px] font-semibold text-ink shadow-card num">
          {activeDist != null && `${activeDist} km`}
          {activeDist != null && activeEta != null && ' · '}
          {activeEta != null && `${activeEta} min`}
        </div>
      )}

      {/* Mini legend */}
      <div className="absolute bottom-2 right-2 z-[500] flex items-center gap-2.5 bg-white/90 backdrop-blur border border-hairline px-2 py-1 rounded-btn shadow-card">
        <LegDot color="#DC2626" label="Next" />
        <LegDot color="#767676" label="Upcoming" outline />
        <LegDot color="#00B14F" label="Done" />
      </div>
    </div>
  );
}

function LegDot({ color, label, outline }) {
  return (
    <div className="flex items-center gap-1">
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: outline ? '#fff' : color,
        border: `1.5px solid ${color}`,
      }} />
      <span className="text-[9px] font-medium" style={{ color: '#767676' }}>{label}</span>
    </div>
  );
}
