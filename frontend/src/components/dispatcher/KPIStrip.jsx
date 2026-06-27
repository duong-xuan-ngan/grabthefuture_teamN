function Cell({ label, children }) {
  return (
    <div className="px-4 py-3 bg-white border border-hairline rounded-card shadow-card">
      <div className="text-[10px] font-semibold tracking-widest uppercase text-ink-2 mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

export default function KPIStrip({ kpi }) {
  if (!kpi) {
    return (
      <div className="flex-shrink-0 px-6 py-3 border-b border-hairline bg-surface grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-white border border-hairline rounded-card animate-pulse" />
        ))}
      </div>
    );
  }
  const sev = kpi.open_by_severity || { high: 0, mid: 0, low: 0 };

  return (
    <div className="flex-shrink-0 px-6 py-3 border-b border-hairline bg-surface grid grid-cols-5 gap-3">
      <Cell label="Opened today">
        <div className="flex items-baseline gap-1.5">
          <div className="text-[22px] font-bold tracking-tightish num text-ink">{kpi.opened_today}</div>
          <div className="text-[11px] text-ink-2 num">+2 vs yest.</div>
        </div>
      </Cell>
      <Cell label="Resolved">
        <div className="flex items-baseline gap-1.5">
          <div className="text-[22px] font-bold tracking-tightish num text-ink">{kpi.resolved}</div>
          <div className="text-[11px] font-semibold num" style={{ color: '#00B14F' }}>{kpi.resolved_pct}%</div>
        </div>
      </Cell>
      <Cell label="Avg response">
        <div className="flex items-baseline gap-1.5">
          <div className="text-[22px] font-bold tracking-tightish num text-ink">
            {kpi.avg_response_minutes}
            <span className="text-[13px] text-ink-2 font-medium">min</span>
          </div>
        </div>
      </Cell>
      <Cell label="Open · severity">
        <div className="flex items-center gap-2.5 mt-0.5">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
            <span className="text-[13px] font-semibold num text-ink">{sev.high}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: '#D97706' }} />
            <span className="text-[13px] font-semibold num text-ink">{sev.mid}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: '#00B14F' }} />
            <span className="text-[13px] font-semibold num text-ink">{sev.low}</span>
          </div>
        </div>
      </Cell>
      <Cell label="Fleet load">
        <div className="flex items-baseline gap-1.5">
          <div className="text-[22px] font-bold tracking-tightish num text-ink">
            {kpi.fleet_load_pct}
            <span className="text-[13px] text-ink-2 font-medium">%</span>
          </div>
          <div className="text-[11px] text-ink-2 num">
            {(kpi.fleet_load_kg || 0).toLocaleString()} kg
          </div>
        </div>
      </Cell>
    </div>
  );
}

export function SuggestionBreakdown({ kpi }) {
  if (!kpi?.suggestion_breakdown) return null;
  const bd = kpi.suggestion_breakdown;
  const keep = bd.keep_route || 0;
  const reorder = bd.reorder || 0;
  const reassign = (bd.reassign || 0) + (bd.assign_greedy || 0);
  const manual = bd.manual_alert || 0;
  if (!keep && !reorder && !reassign && !manual) return null;
  return (
    <div className="flex items-center gap-4 px-6 py-1.5 border-b border-hairline bg-surface/60 text-[11px] text-ink-2">
      <span className="font-medium text-ink-3 uppercase tracking-wider text-[9px]">Suggestions today</span>
      {keep > 0 && <span className="num">Keep route <b className="text-ink">{keep}</b></span>}
      {reorder > 0 && <span className="num">Reorder <b className="text-ink">{reorder}</b></span>}
      {reassign > 0 && <span className="num">Reassign <b className="text-ink">{reassign}</b></span>}
      {manual > 0 && <span className="num text-warning">Manual alert <b>{manual}</b></span>}
    </div>
  );
}
