import { SEVERITY_COLOR, severityFromScore } from '../../lib/constants.js';
import { timeAgo } from '../../lib/format.js';

const ISSUE_LABEL = {
  overflow: 'Overflow',
  near_full: 'Near full',
  bulky: 'Bulky waste',
  smell: 'Bad smell',
};

export default function HotspotList({ hotspots, selectedId, onSelect, loading }) {
  return (
    <div className="px-5 pt-4 pb-2">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-bold tracking-widest uppercase text-ink-2">
          Active hotspots
        </div>
        <div className="text-[11px] text-ink-2 num font-semibold">{hotspots.length}</div>
      </div>
      {loading && hotspots.length === 0 && (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-[52px] bg-surface rounded-card animate-pulse" />
          ))}
        </div>
      )}
      {!loading && hotspots.length === 0 && (
        <div className="py-6 text-center text-[13px] text-ink-2">No active hotspots</div>
      )}
      {hotspots.map((h) => {
        const selected = h.id === selectedId;
        const sev = h.severity || severityFromScore(h.priority_score);
        return (
          <button
            key={h.id}
            onClick={() => onSelect(h.id)}
            className={`w-full text-left px-3 py-2.5 rounded-card mb-1.5 transition-all duration-200 ${
              selected
                ? 'bg-white border-2 shadow-card'
                : 'border-2 border-transparent hover:bg-surface'
            }`}
            style={selected ? { borderColor: '#00B14F' } : {}}
          >
            <div className="flex items-start gap-2.5">
              <div
                className="w-8 h-8 rounded-full text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 num"
                style={{ background: SEVERITY_COLOR[sev] }}
              >
                {h.priority_score}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold tracking-tightish leading-tight text-ink">
                  {h.name}
                </div>
                <div className="text-[11px] text-ink-2 mt-0.5 flex items-center gap-1.5">
                  <span>{ISSUE_LABEL[h.issue_type] || h.issue_type}</span>
                  <span className="text-ink-3">·</span>
                  <span className="num">{h.report_count} reports</span>
                  <span className="text-ink-3">·</span>
                  <span className="num">{timeAgo(h.created_at)}</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
