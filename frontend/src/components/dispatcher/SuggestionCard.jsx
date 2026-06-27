import { capacityStatus } from '../../lib/constants.js';

function Stat({ label, value, suffix, valueColor }) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <div className="text-[10px] font-medium tracking-wider uppercase text-ink-3 mb-0.5">
        {label}
      </div>
      <div className="text-base font-semibold num" style={valueColor ? { color: valueColor } : undefined}>
        {value}
        {suffix && <span className="text-[11px] text-ink-2 font-medium">{suffix}</span>}
      </div>
    </div>
  );
}

export default function SuggestionCard({ suggestion, onApprove, onReject, onUndo }) {
  if (!suggestion) {
    return (
      <div className="px-5 pt-5 pb-4 border-b border-hairline">
        <div className="h-32 bg-surface rounded-lg animate-pulse" />
      </div>
    );
  }
  const { status, truck } = suggestion;
  const cap = truck ? capacityStatus(truck.current_load_kg, truck.max_capacity_kg) : null;
  const priorityColor = '#B91C1C'; // top suggestion is usually high

  return (
    <div className="px-5 pt-[18px] pb-4 border-b border-hairline">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary text-primary wh-pulse" />
          <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-primary">
            Route suggestion
          </div>
        </div>
        <div className="text-[11px] text-ink-3 num">{suggestion.scenario_id}</div>
      </div>

      {status === 'pending' && (
        <div className="animate-fade-up">
          <div className="text-base font-semibold tracking-tightish leading-tight mb-1">
            {suggestion.title}
          </div>
          <div className="text-[13px] text-ink-2 leading-snug mb-4">
            {suggestion.description}
          </div>

          <div className="grid grid-cols-3 gap-px bg-hairline border border-hairline rounded-lg overflow-hidden mb-3.5">
            <Stat label="Priority" value={86} valueColor={priorityColor} />
            <Stat label="Detour" value={`+${suggestion.detour_minutes}`} suffix="min" />
            <Stat label="Truck load" value={cap?.pct ?? '—'} suffix="%" />
          </div>

          {truck && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-surface border border-hairline rounded-lg mb-3.5">
              <div className="w-7 h-7 rounded-full bg-white border-[1.5px] border-ink flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                {truck.code}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{truck.name}</div>
                <div className="text-[11px] text-ink-2 num">
                  {truck.current_load_kg.toLocaleString()} / {truck.max_capacity_kg.toLocaleString()} kg · cap {(truck.max_capacity_kg - truck.current_load_kg).toLocaleString()} kg
                </div>
              </div>
              <div className="text-[11px] text-ink-2 num">
                {suggestion.truck_eta_minutes} min away
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onReject}
              className="flex-1 py-2.5 text-[13px] font-medium bg-white text-ink border border-line rounded-lg hover:bg-surface transition-colors"
            >
              Reject
            </button>
            <button
              onClick={onApprove}
              className="flex-[1.6] py-2.5 text-[13px] font-medium bg-primary text-white border border-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-1.5"
            >
              Approve · Dispatch
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {status === 'approved' && (
        <ResultBlock
          tone="primary"
          title={`Dispatched to ${truck?.name || ''}`}
          subtitle={`Driver notified · ETA ${suggestion.truck_eta_minutes} min`}
          onUndo={onUndo}
          icon={
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6.5L5 9L9.5 3.5" stroke="#306D29" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      )}

      {status === 'rejected' && (
        <ResultBlock
          tone="neutral"
          title="Suggestion rejected"
          subtitle="Hotspot remains active · handle manually"
          onUndo={onUndo}
          icon={
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 3L9 9M9 3L3 9" stroke="#6B6B65" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
        />
      )}
    </div>
  );
}

function ResultBlock({ tone, title, subtitle, icon, onUndo }) {
  const bg = tone === 'primary' ? 'bg-primary-soft' : 'bg-surface';
  return (
    <div className="animate-fade-up py-3.5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full ${bg} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tightish">{title}</div>
          <div className="text-xs text-ink-2 num">{subtitle}</div>
        </div>
      </div>
      <button
        onClick={onUndo}
        className="text-xs text-ink-2 underline underline-offset-2 hover:text-ink self-start"
      >
        Undo
      </button>
    </div>
  );
}
