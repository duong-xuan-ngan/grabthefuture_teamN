import { formatKg, formatMinutes } from '../../lib/format.js';
import { capacityStatus } from '../../lib/constants.js';

function Metric({ label, value, suffix }) {
  return (
    <div className="px-4 py-3.5 bg-surface border border-hairline rounded-2xl">
      <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3 mb-1">
        {label}
      </div>
      <div className="text-[22px] font-semibold tracking-tightish num leading-none">
        {value}
        {suffix && <span className="text-[13px] text-ink-2 font-medium ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

// Shift tab — all numbers come from the backend shift endpoint (real data).
export default function ShiftSummaryScreen({ shift, truck }) {
  if (!shift) {
    return <div className="px-5 py-16 text-center text-ink-2 text-[15px]">Loading shift…</div>;
  }

  const maxKg = shift.max_capacity_kg || (truck ? truck.max_capacity_kg : 0);
  const loadKg = shift.current_load_kg ?? (truck ? truck.current_load_kg : 0);
  const cap = maxKg ? capacityStatus(loadKg, maxKg) : { pct: 0, level: 'available' };

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Metric label="Stops done" value={`${shift.stops_done}/${shift.stops_total}`} />
        <Metric label="Weight collected" value={formatKg(shift.weight_collected_kg)} suffix="kg" />
        <Metric label="Time on shift" value={formatMinutes(shift.shift_minutes)} />
        <Metric label="Avg per stop" value={shift.avg_per_stop_minutes} suffix="min" />
      </div>

      <div className="px-4 py-4 bg-surface border border-hairline rounded-2xl mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3">
            Truck capacity
          </div>
          <div className="text-[12px] text-ink-2 num">
            {loadKg.toLocaleString()} / {maxKg.toLocaleString()} kg
          </div>
        </div>
        <div className="h-2.5 bg-white border border-hairline rounded-full overflow-hidden">
          <div
            className="h-full transition-all"
            style={{
              width: `${cap.pct}%`,
              background:
                cap.level === 'full' ? '#DC2626' : cap.level === 'near_full' ? '#D97706' : '#00B14F',
            }}
          />
        </div>
        <div className="text-[12px] text-ink-2 mt-2 num">
          {cap.pct}% used · {(maxKg - loadKg).toLocaleString()} kg remaining
        </div>
      </div>

      <div className="px-4 py-4 bg-surface border border-hairline rounded-2xl">
        <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3 mb-2.5">
          Recent stops
        </div>
        <div className="space-y-2">
          {(shift.recent_stops || []).map((s) => (
            <div key={s.id} className="flex items-center justify-between text-[13px]">
              <div className="truncate text-ink">{s.name}</div>
              <div className="text-ink-2 num flex-shrink-0 ml-2">
                {formatKg(s.weight_collected_kg)} kg
              </div>
            </div>
          ))}
          {(!shift.recent_stops || shift.recent_stops.length === 0) && (
            <div className="text-[13px] text-ink-2">No stops completed yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
