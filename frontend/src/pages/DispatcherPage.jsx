// DispatcherPage — main dispatcher view
// Member B owns this page.
// Layout: left = map (2/3), right = panel (1/3)

import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import CapacityBar from '../components/CapacityBar';
import SuggestionCard from '../components/SuggestionCard';
import { fetchHotspots, fetchTrucks, fetchKpis } from '../api/client';

// Fix default Leaflet icon paths (Vite asset issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/** Colour-coded hotspot icon */
function hotspotIcon(score) {
  const colour = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#22c55e';
  return L.divIcon({
    html: `<div style="background:${colour};width:16px;height:16px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:9px;color:white;font-weight:bold">${score}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    className: '',
  });
}

const HCMC_CENTER = [10.7769, 106.7009];
const POLL_MS = 10_000;

export default function DispatcherPage() {
  const [hotspots, setHotspots]   = useState([]);
  const [trucks, setTrucks]       = useState([]);
  const [kpis, setKpis]           = useState(null);
  const [selected, setSelected]   = useState(null); // selected hotspot
  const [suggestion, setSuggestion] = useState(null);

  const refresh = useCallback(async () => {
    const [h, t, k] = await Promise.all([fetchHotspots(), fetchTrucks(), fetchKpis()]);
    setHotspots(h.hotspots ?? []);
    setTrucks(t.trucks ?? []);
    setKpis(k);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // 90% capacity blocking alert
  const fullTrucks = trucks.filter(t => (t.current_load_kg / t.max_capacity_kg) * 100 >= 90);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        {fullTrucks.length > 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
            🚨 {fullTrucks.map(t => t.name).join(', ')} at capacity — reassign stops
          </div>
        )}
        <MapContainer center={HCMC_CENTER} zoom={13} className="h-full w-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          {hotspots.map(h => (
            <Marker
              key={h.id}
              position={[h.waste_point.lat, h.waste_point.lng]}
              icon={hotspotIcon(h.priority_score)}
              eventHandlers={{ click: () => setSelected(h) }}
            >
              <Popup>{h.waste_point.name} — Score {h.priority_score}</Popup>
            </Marker>
          ))}
          {trucks.map(t => (
            <Marker key={t.id} position={[t.lat, t.lng]}>
              <Popup>{t.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div className="w-80 flex flex-col border-l border-gray-200 bg-white overflow-y-auto">
        {/* KPIs */}
        {kpis && (
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2">Today's KPIs</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Opened</span><br /><strong>{kpis.hotspots_opened}</strong></div>
              <div><span className="text-gray-500">Resolved</span><br /><strong>{kpis.hotspots_resolved}</strong></div>
              <div><span className="text-gray-500">Avg Response</span><br /><strong>{kpis.avg_response_min} min</strong></div>
            </div>
          </div>
        )}

        {/* Trucks */}
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-400 uppercase mb-3">Trucks</h2>
          <div className="space-y-3">
            {trucks.map(t => {
              const pct = (t.current_load_kg / t.max_capacity_kg) * 100;
              return (
                <div key={t.id}>
                  <div className="text-sm font-medium text-gray-700 mb-1">{t.name}</div>
                  <CapacityBar pct={pct} />
                  {pct >= 70 && pct < 90 && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ Near capacity — monitor closely</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hotspot detail + suggestion */}
        {selected ? (
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <h2 className="text-sm font-semibold text-gray-700">{selected.waste_point?.name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div>Score: <strong>{selected.priority_score}</strong></div>
              <div>Severity: <strong>{selected.severity}</strong></div>
              <div>Reports: <strong>{selected.report_count}</strong></div>
              <div>Status: <strong>{selected.status}</strong></div>
            </div>
            {suggestion && (
              <SuggestionCard
                suggestion={suggestion}
                onDone={() => { setSuggestion(null); refresh(); }}
              />
            )}
            {!suggestion && (
              <p className="text-xs text-gray-400 italic">No routing suggestion yet. Engine will run automatically.</p>
            )}
          </div>
        ) : (
          <div className="p-4 text-xs text-gray-400 italic">
            Click a hotspot pin to see details and routing suggestion.
          </div>
        )}
      </div>
    </div>
  );
}
