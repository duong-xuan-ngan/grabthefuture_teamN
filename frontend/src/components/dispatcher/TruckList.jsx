import { capacityStatus } from '../../lib/constants.js';

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

export default function TruckList({ trucks, loading }) {
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
        return (
          <div key={t.id} className="py-3 border-t border-hairline">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-[26px] h-[26px] rounded-full bg-white border-[1.5px] border-ink flex items-center justify-center text-[10px] font-bold flex-shrink-0">
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
              <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${cap.pct}%`, background: capacityColor(cap.level) }}
                />
              </div>
              <div className="text-[11px] text-ink-2 num min-w-[80px] text-right">
                {t.current_load_kg.toLocaleString()} / {t.max_capacity_kg.toLocaleString()} kg
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
