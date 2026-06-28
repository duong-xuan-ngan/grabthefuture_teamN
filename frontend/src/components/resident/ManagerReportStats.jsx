import { useEffect, useState } from 'react';
import * as api from '../../api/client.js';

// Manager Status tab — report volume for this waste point over the last 12
// one-hour slots, rendered as a list (newest at top). Each row shows the
// hour label, a small bar, the count, and a per-issue breakdown.

const ISSUE_LABEL = {
  overflow:    'Overflow',
  near_full:   'Near full',
  bulky_waste: 'Bulky',
  bad_smell:   'Smell',
};

function hourLabel(iso) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  return `${hh}:00`;
}

export default function ManagerReportStats({ wastePointId, name }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.getHourlyReportStats(wastePointId, 12);
      // newest first for the list
      setData({ ...res, slots: [...(res.slots || [])].reverse() });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (wastePointId == null) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wastePointId]);

  if (wastePointId == null) {
    return (
      <div className="px-5 pt-6 pb-10 text-sm text-ink-2">
        No waste point linked to this view.
      </div>
    );
  }

  const slots   = data?.slots || [];
  const maxCount = slots.reduce((m, s) => Math.max(m, s.count), 0) || 1;

  return (
    <div className="px-5 pt-6 pb-10 animate-fade-up">
      <div className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#00B14F' }}>
        Status
      </div>
      <h1 className="text-[22px] font-bold tracking-tightish leading-tight mb-1">
        Reports by hour
      </h1>
      <p className="text-sm text-ink-2 mb-4">
        {name || data?.waste_point_name || 'This waste point'} · last 12 hours
      </p>

      {/* Live status — urgent only while an unresolved hotspot exists. Once the
          point is collected it drops back to a normal (non-urgent) point. */}
      {data && (
        data.is_urgent ? (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-card bg-danger-soft border border-danger/20">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#DC2626' }} />
            <span className="text-[13px] font-bold text-danger">Needs pickup</span>
            {data.pending_reports > 0 && (
              <span className="text-[11px] text-ink-2 ml-auto num">
                {data.pending_reports} pending report{data.pending_reports !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-card bg-primary-soft border border-primary/20">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#00B14F' }} />
            <span className="text-[13px] font-bold" style={{ color: '#00873A' }}>Normal · collected</span>
          </div>
        )
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[28px] font-bold leading-none tracking-tightish num">
            {data?.total ?? '—'}
          </div>
          <div className="text-[11px] text-ink-2 mt-1">reports in window</div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-[12px] font-semibold text-ink-2 border border-hairline rounded-pill px-3 py-1.5 hover:text-ink hover:border-line transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {err && (
        <div className="p-3 bg-danger-soft text-danger text-sm rounded-card mb-4">{err}</div>
      )}

      {!err && (
        <ol className="border border-hairline rounded-card overflow-hidden">
          {slots.map((s, i) => {
            const issues = Object.entries(s.by_issue || {});
            return (
              <li
                key={s.hour_start}
                className={`flex items-stretch gap-3 px-3.5 py-3 ${
                  i < slots.length - 1 ? 'border-b border-hairline' : ''
                } ${s.count === 0 ? 'opacity-60' : ''}`}
              >
                {/* Hour label */}
                <div className="w-12 flex-shrink-0 text-[13px] font-semibold num text-ink tabular-nums pt-0.5">
                  {hourLabel(s.hour_start)}
                </div>

                {/* Bar + breakdown */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-pill bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-pill transition-all"
                        style={{
                          width: `${Math.round((s.count / maxCount) * 100)}%`,
                          background: s.count === 0 ? 'transparent' : '#00B14F',
                        }}
                      />
                    </div>
                    <div className="text-[13px] font-bold num w-6 text-right tabular-nums">
                      {s.count}
                    </div>
                  </div>
                  {issues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {issues.map(([issue, n]) => (
                        <span
                          key={issue}
                          className="text-[10px] font-medium text-ink-2 bg-surface border border-hairline rounded-pill px-1.5 py-0.5"
                        >
                          {ISSUE_LABEL[issue] || issue} · {n}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
