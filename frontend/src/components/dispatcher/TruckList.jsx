import { capacityStatus } from '../../lib/constants.js';

function statusPill(level) {
  if (level === 'full') return { label: 'Full', bg: '#FEE2E2', fg: '#B91C1C' };
  if (level === 'near_full') return { label: 'Near full', bg: '#FEF3C7', fg: '#B45309' };
  return { label: 'Available', bg: '#EEF3EC', fg: '#306D29' };
}

function capacityColor(level) {
  if (level === 'full') return '#B91C1C';
  if (level === 'near_full') return '#B45309';
  return '#306D29';
}

export default function TruckList({ trucks }) {
  return (
    <div className="px-5 pt-4 pb-6 border-t border-hairline mt-2">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-2">Fleet</div>
        <div className="text-[11px] text-ink-3 num">{trucks.length} active</div>
      </div>
      {trucks.map((t) => {
        const cap = capacityStatus(t.current_load_kg, t.max_capacity_kg);
        const pill = statusPill(cap.level);
        return (
          <div key={t.id} className="py-3 border-t border-hairline">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-[26px] h-[26px] rounded-full bg-white border-[1.5px] border-ink flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                {t.code}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium">{t.name}</div>
                <div className="text-[11px] text-ink-2 num">
                  {t.stops_left} stops left · driver {t.driver}
                </div>
              </div>
              <div
                className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: pill.bg, color: pill.fg }}
              >
                {pill.label}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
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
