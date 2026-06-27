import { SEVERITY_COLOR, severityFromScore } from '../../lib/constants.js';
import { timeAgo } from '../../lib/format.js';

const ISSUE_LABEL = {
  overflow: 'Overflow',
  near_full: 'Near full',
  bulky: 'Bulky waste',
  smell: 'Bad smell',
};

export default function HotspotList({ hotspots, selectedId, onSelect }) {
  return (
    <div className="px-5 pt-4 pb-2">
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-2">
          Active hotspots
        </div>
        <div className="text-[11px] text-ink-3 num">{hotspots.length}</div>
      </div>
      {hotspots.map((h) => {
        const selected = h.id === selectedId;
        const sev = h.severity || severityFromScore(h.priority_score);
        return (
          <button
            key={h.id}
            onClick={() => onSelect(h.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors ${
              selected ? 'bg-surface border border-line' : 'border border-transparent hover:bg-surface/50'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className="w-[30px] h-[30px] rounded-full text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 num"
                style={{ background: SEVERITY_COLOR[sev] }}
              >
                {h.priority_score}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium tracking-tightish leading-tight">
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
