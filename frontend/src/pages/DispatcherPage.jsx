import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/dispatcher/Sidebar.jsx';
import Topbar from '../components/dispatcher/Topbar.jsx';
import KPIStrip, { SuggestionBreakdown } from '../components/dispatcher/KPIStrip.jsx';
import MapPanel from '../components/dispatcher/MapPanel.jsx';
import SuggestionCard from '../components/dispatcher/SuggestionCard.jsx';
import HotspotList from '../components/dispatcher/HotspotList.jsx';
import TruckList from '../components/dispatcher/TruckList.jsx';
import { timeAgo } from '../lib/format.js';
import * as api from '../api/client.js';

const POLL_MS = Number(import.meta.env.VITE_POLL_INTERVAL) || 10000;

export default function DispatcherPage({ onLogout }) {
  const [hotspots, setHotspots] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [wastePoints, setWastePoints] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [sideTab, setSideTab] = useState('operations');
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [h, t, k] = await Promise.all([
        api.listHotspots(),
        api.listTrucks(),
        api.getDashboardKPIs(),
      ]);
      if (cancelled) return;
      setHotspots(h);
      setTrucks(t);
      setKpi(k);
      setLoading(false);
      setSelectedId((cur) => cur ?? (h[0] ? h[0].id : null));
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.listWastePoints().then((wps) => {
      if (!cancelled) setWastePoints(wps || []);
    });
    api.listRoutes().then((d) => {
      if (!cancelled) setRoutes(d?.routes || []);
    });
    return () => { cancelled = true; };
  }, []);

  // Area analytics — re-fetch when Reports tab opens.
  useEffect(() => {
    if (sideTab !== 'reports') return;
    let cancelled = false;
    api.getHotspotAreas().then((d) => {
      if (!cancelled) setAreas(d?.areas || []);
    });
    return () => { cancelled = true; };
  }, [sideTab]);

  // Zones — fetch on mount + when Zones tab opens, poll every 30s.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api.listZones().then((d) => {
        if (!cancelled) setZones(d?.zones || []);
      });
    load();
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    api.getSuggestion(selectedId).then((s) => {
      if (!cancelled) setSuggestion(s);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  async function onApprove() {
    if (!suggestion) return;
    const next = await api.approveSuggestion(suggestion.id, suggestion);
    setSuggestion({ ...suggestion, ...next });
  }
  async function onReject() {
    if (!suggestion) return;
    const next = await api.rejectSuggestion(suggestion.id, suggestion);
    setSuggestion({ ...suggestion, ...next });
  }
  function onUndo() {
    setSuggestion((s) => (s ? { ...s, status: 'pending' } : s));
  }

  // Trucks currently handling an emergency: the active suggestion targets a
  // high-priority hotspot (score ≥ 90). Their fixed route renders red.
  const emergencyTruckIds = useMemo(() => {
    const ids = new Set();
    if (suggestion?.truck_id != null) {
      const hot = hotspots.find((h) => h.id === suggestion.hotspot_id);
      if (hot && (hot.priority_score ?? 0) >= 90) ids.add(suggestion.truck_id);
    }
    return ids;
  }, [suggestion, hotspots]);

  function handleTabChange(tab) {
    setSideTab(tab);
    // Switching to Operations resets hotspot selection to first available.
    if (tab === 'operations' && hotspots.length > 0) {
      setSelectedId((cur) => cur ?? hotspots[0].id);
    }
  }

  // Right-panel content by tab.
  function renderPanel() {
    switch (sideTab) {
      case 'hotspots':
        return (
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
            <HotspotList hotspots={hotspots} selectedId={selectedId} loading={loading} onSelect={(id) => { setSelectedId(id); setSideTab('operations'); }} />
          </div>
        );

      case 'trucks':
        return (
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 px-5 pt-4 pb-6">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-2 mb-3">
              Fleet · {trucks.length} active
            </div>
            {trucks.map((t) => {
              const pct = t.capacity_pct ?? 0;
              const level = pct >= 90 ? 'full' : pct >= 70 ? 'near_full' : 'available';
              const barColor = level === 'full' ? '#DC2626' : level === 'near_full' ? '#D97706' : '#00B14F';
              return (
                <div key={t.id} className="py-3.5 border-t border-hairline">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[13px] font-medium">{t.name}</div>
                      <div className="text-[11px] text-ink-2">Driver: {t.driver || '—'} · {t.stops_left ?? 0} stops left</div>
                    </div>
                    <div className="text-[12px] font-semibold num" style={{ color: barColor }}>
                      {pct}%
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <div className="text-[11px] text-ink-2 num mt-1">
                    {(t.current_load_kg ?? 0).toLocaleString()} / {(t.max_capacity_kg ?? 0).toLocaleString()} kg
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'reports':
        return (
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 px-5 pt-4 pb-6">
            {/* Top problem areas (Proposal §9.8) */}
            {areas.length > 0 && (
              <div className="mb-5">
                <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-2 mb-2">
                  Top problem areas · 30 days
                </div>
                {areas.map((a) => (
                  <div key={a.area_type} className="flex items-center gap-3 py-2 border-t border-hairline">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium capitalize">{a.area_type}</div>
                      <div className="text-[11px] text-ink-2 num">
                        {a.resolved_count}/{a.hotspot_count} resolved · avg {a.avg_response_minutes} min
                      </div>
                    </div>
                    <div className="text-[13px] font-bold num text-ink">{a.hotspot_count}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-2 mb-3">
              All hotspots · {hotspots.length}
            </div>
            {hotspots.length === 0 && (
              <div className="text-[13px] text-ink-2 py-8 text-center">No active hotspots</div>
            )}
            {hotspots.map((h) => (
              <div
                key={h.id}
                className="py-3 border-t border-hairline cursor-pointer hover:bg-surface/50 -mx-5 px-5 rounded"
                onClick={() => { setSelectedId(h.id); setSideTab('operations'); }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{h.name}</div>
                    <div className="text-[11px] text-ink-2 mt-0.5">
                      {h.issue_type} · {h.report_count} reports · {timeAgo(h.created_at)} ago
                    </div>
                  </div>
                  <div className="text-[12px] font-semibold num flex-shrink-0"
                    style={{ color: h.severity === 'high' ? '#DC2626' : h.severity === 'mid' ? '#D97706' : '#00B14F' }}>
                    {h.priority_score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'zones':
        return (
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 px-5 pt-4 pb-6">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-2 mb-3">
              Zone assignments · {zones.length}
            </div>
            {zones.map((z) => {
              const statusColor = z.status === 'overloaded' ? '#EF4444' : z.status === 'busy' ? '#F59E0B' : '#00B14F';
              const isSelected = String(z.id) === String(selectedZoneId);
              return (
                <button
                  key={z.id}
                  onClick={() => setSelectedZoneId(isSelected ? null : z.id)}
                  className={`w-full text-left py-3.5 border-t border-hairline transition-colors ${isSelected ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: z.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold">{z.name}</div>
                      <div className="text-[11px] text-ink-2">{z.truck_name || 'No truck assigned'}</div>
                    </div>
                    <div className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white flex-shrink-0"
                      style={{ background: statusColor }}>
                      {z.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${z.capacity_pct}%`, background: z.capacity_pct >= 90 ? '#EF4444' : z.capacity_pct >= 70 ? '#F59E0B' : '#00B14F' }} />
                    </div>
                    <div className="text-[11px] text-ink-2 num">{z.capacity_pct}%</div>
                    <div className="text-[11px] text-ink-2 num">{z.hotspot_count} hotspot{z.hotspot_count !== 1 ? 's' : ''}</div>
                  </div>
                </button>
              );
            })}
            {selectedZoneId && (
              <button
                onClick={() => setSelectedZoneId(null)}
                className="mt-4 w-full py-2 text-xs text-ink-2 underline"
              >
                Clear selection
              </button>
            )}
          </div>
        );

      case 'settings':
        return (
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 px-5 pt-4 pb-6">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-2 mb-4">
              Settings
            </div>
            <div className="space-y-3">
              <SettingRow label="Routing threshold" value="Score ≥ 70 triggers suggestion" />
              <SettingRow label="Capacity warning" value="70% → amber, 90% → red" />
              <SettingRow label="Cluster window" value="50 m radius, 30 min" />
              <SettingRow label="Poll interval" value={`${POLL_MS / 1000} s`} />
            </div>
            <a href="/admin"
              className="mt-6 flex items-center gap-2.5 px-3.5 py-3 bg-surface border border-hairline rounded-btn text-[13px] font-medium hover:bg-white transition-colors">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="2" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M5 6H11M5 9H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Admin Panel — QR &amp; Emergency
            </a>
            {onLogout && (
              <button
                onClick={onLogout}
                className="mt-3 w-full py-2.5 text-sm font-semibold text-danger border border-danger-soft rounded-btn hover:bg-danger-soft transition-colors duration-200"
              >
                Sign out
              </button>
            )}
          </div>
        );

      default: // 'operations'
        return (
          <>
            <SuggestionCard
              suggestion={suggestion}
              onApprove={onApprove}
              onReject={onReject}
              onUndo={onUndo}
            />
            <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
              <HotspotList hotspots={hotspots} selectedId={selectedId} loading={loading} onSelect={setSelectedId} />
              <TruckList trucks={trucks} loading={loading} />
            </div>
          </>
        );
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">
      <div className="flex-1 flex min-h-0">
        <Sidebar
          activeHotspotCount={hotspots.length}
          activeTab={sideTab}
          onTabChange={handleTabChange}
        />

        <main className="flex-1 min-w-0 flex flex-col">
          <Topbar onLogout={onLogout} />
          <KPIStrip kpi={kpi} />
          <SuggestionBreakdown kpi={kpi} />
          <div className="flex-1 relative min-h-0">
            <MapPanel
              hotspots={hotspots}
              trucks={trucks}
              wastePoints={wastePoints}
              zones={zones}
              routes={routes}
              emergencyTruckIds={emergencyTruckIds}
              selectedZoneId={selectedZoneId}
              selectedId={selectedId}
              onSelect={(id) => { setSelectedId(id); setSideTab('operations'); }}
              suggestion={suggestion}
            />
          </div>
        </main>

        <aside className="w-[380px] flex-shrink-0 border-l border-hairline bg-white flex flex-col min-h-0">
          {renderPanel()}
        </aside>
      </div>
    </div>
  );
}

function SettingRow({ label, value }) {
  return (
    <div className="px-3.5 py-3 bg-surface border border-hairline rounded-xl">
      <div className="text-[11px] text-ink-3 uppercase tracking-wider font-medium mb-0.5">{label}</div>
      <div className="text-[13px] font-medium">{value}</div>
    </div>
  );
}
