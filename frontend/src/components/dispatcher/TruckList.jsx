import { useEffect, useState } from 'react';
import { capacityStatus } from '../../lib/constants.js';
import * as api from '../../api/client.js';

function statusPill(level) {
  if (level === 'full') return { label: 'Full', bg: '#FEE2E2', fg: '#DC2626' };
  if (level === 'near_full') return { label: 'Near full', bg: '#FEF3C7', fg: '#D97706' };
  return { label: 'Available', bg: '#E6F7EE', fg: '#00B14F' };
}

function capacityColor(level) {
  if (level === 'full') return '#DC2626';
  if (level === 'near_full') return '#D97706';
  return '#00B14F';
}

// Clicking a fleet item selects that truck and draws its route on the map
// (handled by the parent via selectedTruckId/onSelectTruck). Click again to
// deselect and clear the route.
export default function TruckList({ trucks, loading, selectedTruckId, onSelectTruck }) {
  // Per-truck projected extra load = sum of estimated_weight_kg over stops not
  // yet collected. Drawn as a faint segment on top of the actual (collected)
  // load so the bar reads "solid = collected, faint = still expected".
  const [projected, setProjected] = useState({}); // { [truckId]: extraKg }

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      trucks.map(async (t) => {
        try {
          const tasks = await api.listTasks(t.id, { includeDone: true });
          const extra = tasks
            .filter((s) => s.status !== 'done')
            .reduce((sum, s) => sum + (s.estimated_weight_kg || 0), 0);
          return [t.id, extra];
        } catch {
          return [t.id, 0];
        }
      })
    ).then((pairs) => {
      if (!cancelled) setProjected(Object.fromEntries(pairs));
    });
    return () => { cancelled = true; };
    // Re-fetch when the set of trucks (or their loads) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trucks.map((t) => `${t.id}:${t.current_load_kg}`).join(',')]);

  function select(truckId) {
    if (!onSelectTruck) return;
    onSelectTruck(String(selectedTruckId) === String(truckId) ? null : truckId);
  }

  return (
    <div className="px-5 pt-4 pb-6 border-t border-hairline mt-2">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-bold tracking-widest uppercase text-ink-2">Fleet</div>
        <div className="text-[11px] text-ink-2 num font-semibold">{trucks.length} active</div>
      </div>
      {loading && trucks.length === 0 && (
        <div className="space-y-3">
          {[1,2].map(i => (
            <div key={i} className="h-[58px] bg-surface rounded-card animate-pulse" />
          ))}
        </div>
      )}
      {trucks.map((t) => {
        const cap = capacityStatus(t.current_load_kg, t.max_capacity_kg);
        const pill = statusPill(cap.level);
        const isSelected = String(selectedTruckId) === String(t.id);
        // Solid = already collected; faint = projected extra from upcoming
        // stops. Cap the combined width at 100% of the bar.
        const collectedPct = Math.min(cap.pct, 100);
        const extraKg      = projected[t.id] || 0;
        const projectedPct = Math.min(
          Math.round((extraKg / t.max_capacity_kg) * 100),
          100 - collectedPct
        );
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => select(t.id)}
            aria-pressed={isSelected}
            className={`w-full text-left py-3 border-t border-hairline transition-colors -mx-5 px-5 ${
              isSelected ? 'bg-primary-soft' : 'hover:bg-surface/50'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                isSelected ? 'bg-ink text-white border-[1.5px] border-ink' : 'bg-white border-[1.5px] border-ink text-ink'
              }`}>
                {t.code}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-ink">{t.name}</div>
                <div className="text-[11px] text-ink-2 num">
                  {t.stops_left} stops left · driver {t.driver}
                </div>
              </div>
              <div
                className="text-[11px] font-semibold px-2 py-0.5 rounded-pill"
                style={{ background: pill.bg, color: pill.fg }}
              >
                {pill.label}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden flex">
                {/* Collected so far — solid */}
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${collectedPct}%`, background: capacityColor(cap.level) }}
                />
                {/* Projected from upcoming stops — faint */}
                {projectedPct > 0 && (
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${projectedPct}%`, background: capacityColor(cap.level), opacity: 0.3 }}
                  />
                )}
              </div>
              <div className="text-[11px] text-ink-2 num min-w-[80px] text-right">
                {t.current_load_kg.toLocaleString()} / {t.max_capacity_kg.toLocaleString()} kg
              </div>
            </div>
            {extraKg > 0 && (
              <div className="text-[10px] text-ink-3 num mt-1">
                +{extraKg.toLocaleString()} kg expected from {t.stops_left} upcoming stop{t.stops_left !== 1 ? 's' : ''}
              </div>
            )}
            {isSelected && (
              <div className="text-[10px] font-semibold mt-1.5" style={{ color: '#00B14F' }}>
                Route shown on map · click again to hide
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
