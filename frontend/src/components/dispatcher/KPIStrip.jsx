function Cell({ label, children }) {
  return (
    <div>
      <div className="text-[10px] font-medium tracking-wider uppercase text-ink-3 mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

export default function KPIStrip({ kpi }) {
  if (!kpi) {
    return (
      <div className="flex-shrink-0 px-6 py-4 border-b border-hairline grid grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-surface rounded animate-pulse" />
        ))}
      </div>
    );
  }
  const sev = kpi.open_by_severity || { high: 0, mid: 0, low: 0 };

  return (
    <div className="flex-shrink-0 px-6 py-4 border-b border-hairline grid grid-cols-5 gap-6">
      <Cell label="Opened today">
        <div className="flex items-baseline gap-1.5">
          <div className="text-[22px] font-semibold tracking-tight num">{kpi.opened_today}</div>
          <div className="text-[11px] text-ink-2 num">+2 vs yest.</div>
        </div>
      </Cell>
      <Cell label="Resolved">
        <div className="flex items-baseline gap-1.5">
          <div className="text-[22px] font-semibold tracking-tight num">{kpi.resolved}</div>
          <div className="text-[11px] text-primary num">{kpi.resolved_pct}%</div>
        </div>
      </Cell>
      <Cell label="Avg response">
        <div className="flex items-baseline gap-1.5">
          <div className="text-[22px] font-semibold tracking-tight num">
            {kpi.avg_response_minutes}
            <span className="text-[13px] text-ink-2 font-medium">min</span>
          </div>
        </div>
      </Cell>
      <Cell label="Open · severity">
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-danger" />
            <span className="text-[13px] font-medium num">{sev.high}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-warning" />
            <span className="text-[13px] font-medium num">{sev.mid}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[13px] font-medium num">{sev.low}</span>
          </div>
        </div>
      </Cell>
      <Cell label="Fleet load">
        <div className="flex items-baseline gap-1.5">
          <div className="text-[22px] font-semibold tracking-tight num">
            {kpi.fleet_load_pct}
            <span className="text-[13px] text-ink-2 font-medium">%</span>
          </div>
          <div className="text-[11px] text-ink-2 num">
            {kpi.fleet_load_kg.toLocaleString()} kg
          </div>
        </div>
      </Cell>
    </div>
  );
}
