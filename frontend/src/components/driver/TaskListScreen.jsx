import { SEVERITY_COLOR, severityFromScore } from '../../lib/constants.js';
import { formatKg } from '../../lib/format.js';

const ISSUE_LABEL = {
  overflow: 'Overflow',
  near_full: 'Near full',
  bulky: 'Bulky waste',
  smell: 'Bad smell',
};

export default function TaskListScreen({ tasks, onOpen }) {
  if (!tasks?.length) {
    return (
      <div className="px-5 py-10 text-center text-ink-2 text-sm">
        No stops assigned yet.
      </div>
    );
  }
  return (
    <div className="divide-y divide-hairline">
      {tasks.map((t) => {
        const sev = t.priority_score ? severityFromScore(t.priority_score) : null;
        const isActive = t.status === 'active';
        const isDone = t.status === 'done';
        const isUnreachable = t.status === 'unreachable';
        return (
          <button
            key={t.id}
            onClick={() => !isDone && !isUnreachable && onOpen(t.id)}
            className={`w-full text-left px-5 py-4 transition-colors ${
              isActive ? 'bg-primary-soft/40' : ''
            } ${(isDone || isUnreachable) ? 'opacity-60' : 'hover:bg-surface/60'}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {sev ? (
                  <div
                    className="w-[34px] h-[34px] rounded-full text-white text-[12px] font-bold flex items-center justify-center num"
                    style={{ background: SEVERITY_COLOR[sev] }}
                  >
                    {t.priority_score}
                  </div>
                ) : (
                  <div className="w-[34px] h-[34px] rounded-full bg-surface border border-hairline text-ink-2 text-[12px] font-semibold flex items-center justify-center num">
                    {t.sequence}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-semibold tracking-tightish leading-tight">
                      {t.name}
                    </div>
                    <div className="text-[12px] text-ink-2 mt-0.5">{t.address}</div>
                  </div>
                  {isActive && (
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-full whitespace-nowrap">
                      Active
                    </div>
                  )}
                  {isDone && (
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-ink-2 bg-surface px-2 py-0.5 rounded-full whitespace-nowrap">
                      Done
                    </div>
                  )}
                  {isUnreachable && (
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-warning bg-warning-soft px-2 py-0.5 rounded-full whitespace-nowrap">
                      Skipped
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 text-[11.5px] text-ink-2">
                  {t.issue_type && (
                    <>
                      <span>{ISSUE_LABEL[t.issue_type]}</span>
                      <span className="text-ink-3">·</span>
                    </>
                  )}
                  <span className="num">est. {formatKg(t.estimated_weight_kg)} kg</span>
                  <span className="text-ink-3">·</span>
                  <span className="num">{t.distance_km} km</span>
                  <span className="text-ink-3">·</span>
                  <span className="num">{t.eta_minutes} min</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
