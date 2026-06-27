import { formatKg, formatMinutes } from '../../lib/format.js';
import { capacityStatus } from '../../lib/constants.js';

function Metric({ label, value, suffix }) {
  return (
    <div className="px-3.5 py-3 bg-surface border border-hairline rounded-xl">
      <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3 mb-1">
        {label}
      </div>
      <div className="text-[19px] font-semibold tracking-tightish num">
        {value}
        {suffix && <span className="text-[12px] text-ink-2 font-medium ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}

export default function ShiftSummaryScreen({ tasks, truck }) {
  if (!truck) return null;
  const done = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;
  const cap = capacityStatus(truck.current_load_kg, truck.max_capacity_kg);
  const shiftMinutes = 263; // demo

  return (
    <div className="px-5 pt-5 pb-6 animate-fade-up">
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <Metric label="Stops done" value={`${done}/${total}`} />
        <Metric label="Weight collected" value={formatKg(truck.current_load_kg)} suffix="kg" />
        <Metric label="Time on shift" value={formatMinutes(shiftMinutes)} />
        <Metric label="Avg per stop" value="9" suffix="min" />
      </div>

      <div className="px-3.5 py-3.5 bg-surface border border-hairline rounded-xl mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3">
            Truck capacity
          </div>
          <div className="text-[11px] text-ink-2 num">
            {truck.current_load_kg.toLocaleString()} / {truck.max_capacity_kg.toLocaleString()} kg
          </div>
        </div>
        <div className="h-2 bg-white border border-hairline rounded-full overflow-hidden">
          <div
            className="h-full"
            style={{
              width: `${cap.pct}%`,
              background:
                cap.level === 'full' ? '#B91C1C' : cap.level === 'near_full' ? '#B45309' : '#306D29',
            }}
          />
        </div>
        <div className="text-[11px] text-ink-2 mt-2 num">
          {cap.pct}% used ·{' '}
          {(truck.max_capacity_kg - truck.current_load_kg).toLocaleString()} kg remaining
        </div>
      </div>

      <div className="px-3.5 py-3.5 bg-surface border border-hairline rounded-xl mb-4">
        <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3 mb-2">
          Recent stops
        </div>
        <div className="space-y-1.5">
          {tasks
            .filter((t) => t.status === 'done')
            .slice(-3)
            .map((t) => (
              <div key={t.id} className="flex items-center justify-between text-[12px]">
                <div className="truncate text-ink">{t.name}</div>
                <div className="text-ink-2 num flex-shrink-0 ml-2">
                  {t.weight_collected_kg ?? t.estimated_weight_kg} kg
                </div>
              </div>
            ))}
          {tasks.filter((t) => t.status === 'done').length === 0 && (
            <div className="text-[12px] text-ink-2">No stops completed yet</div>
          )}
        </div>
      </div>

      <button className="w-full py-3 text-sm font-medium bg-white text-danger border border-danger-soft rounded-xl hover:bg-danger-soft transition-colors">
        End shift
      </button>
    </div>
  );
}
