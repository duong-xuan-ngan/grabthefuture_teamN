import { useEffect, useState } from 'react';
import Sidebar from '../components/dispatcher/Sidebar.jsx';
import Topbar from '../components/dispatcher/Topbar.jsx';
import KPIStrip from '../components/dispatcher/KPIStrip.jsx';
import MapPanel from '../components/dispatcher/MapPanel.jsx';
import SuggestionCard from '../components/dispatcher/SuggestionCard.jsx';
import HotspotList from '../components/dispatcher/HotspotList.jsx';
import TruckList from '../components/dispatcher/TruckList.jsx';
import * as api from '../api/client.js';

const POLL_MS = Number(import.meta.env.VITE_POLL_INTERVAL) || 10000;

export default function DispatcherPage() {
  const [hotspots, setHotspots] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  // Initial load + polling (F-ROUTE-04 implies re-evaluation triggers we
  // simulate here with a simple interval; real backend would use SSE/WS).
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
      // Auto-select the first hotspot once data arrives (works for both
      // string mock ids and integer backend ids).
      setSelectedId((cur) => cur ?? (h[0] ? h[0].id : null));
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Pull suggestion whenever the selected hotspot changes.
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    api.getSuggestion(selectedId).then((s) => {
      if (!cancelled) setSuggestion(s);
    });
    return () => {
      cancelled = true;
    };
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

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">
      <div className="flex-1 flex min-h-0">
        <Sidebar activeHotspotCount={hotspots.length} />

        <main className="flex-1 min-w-0 flex flex-col">
          <Topbar />
          <KPIStrip kpi={kpi} />
          <div className="flex-1 relative min-h-0">
            <MapPanel
              hotspots={hotspots}
              trucks={trucks}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </main>

        <aside className="w-[380px] flex-shrink-0 border-l border-hairline bg-white flex flex-col min-h-0">
          <SuggestionCard
            suggestion={suggestion}
            onApprove={onApprove}
            onReject={onReject}
            onUndo={onUndo}
          />
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
            <HotspotList
              hotspots={hotspots}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <TruckList trucks={trucks} />
          </div>
        </aside>
      </div>
    </div>
  );
}
