import { SEVERITY_COLOR, severityFromScore } from '../../lib/constants.js';
import { formatKg } from '../../lib/format.js';

const ISSUE_LABEL = {
  overflow: 'Overflow',
  near_full: 'Near full',
  bulky: 'Bulky waste',
  smell: 'Bad smell',
};

// Clean driver task list: active + upcoming stops up top with large tap
// targets; completed/skipped stops tucked into a quiet "Done" group so the
// driver only sees what's left to do.
export default function TaskListScreen({ tasks, onOpen }) {
  if (!tasks?.length) {
    return (
      <div className="px-5 py-16 text-center text-ink-2 text-[15px]">
        No stops assigned yet.
      </div>
    );
  }

  const open = tasks.filter((t) => t.status === 'active' || t.status === 'pending');
  const closed = tasks.filter((t) => t.status === 'done' || t.status === 'unreachable');

  return (
    <div className="px-4 pt-4 pb-6">
      {open.map((t) => (
        <StopCard key={t.id} task={t} onOpen={onOpen} />
      ))}

      {closed.length > 0 && (
        <div className="mt-6">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-3 px-1 mb-2">
            Completed · {closed.length}
          </div>
          {closed.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-3 py-3 opacity-60"
            >
              <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
                {t.status === 'done' ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5L5 9L9.5 3.5" stroke="#00B14F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="text-warning text-xs">!</span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-[14px] truncate">{t.name}</div>
              {t.weight_collected_kg != null && (
                <div className="text-[12px] text-ink-2 num flex-shrink-0">
                  {formatKg(t.weight_collected_kg)} kg
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StopCard({ task, onOpen }) {
  const sev = task.priority_score ? severityFromScore(task.priority_score) : null;
  const isActive = task.status === 'active';

  return (
    <button
      onClick={() => onOpen(task.id)}
      className={`w-full text-left rounded-2xl mb-2.5 px-4 py-4 border transition-colors ${
        isActive
          ? 'border-primary/40 bg-primary-soft/40'
          : 'border-hairline bg-white hover:bg-surface/60'
      }`}
    >
      <div className="flex items-center gap-3.5">
        {sev ? (
          <div
            className="w-12 h-12 rounded-full text-white text-[15px] font-bold flex items-center justify-center flex-shrink-0 num"
            style={{ background: SEVERITY_COLOR[sev] }}
          >
            {task.priority_score}
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-surface border border-hairline text-ink-2 text-[15px] font-semibold flex items-center justify-center flex-shrink-0 num">
            {task.sequence}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[16px] font-semibold tracking-tightish leading-tight truncate">
              {task.name}
            </div>
            {isActive && (
              <span className="text-[10px] uppercase tracking-wider font-semibold text-primary flex-shrink-0">
                Next
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[13px] text-ink-2">
            {task.issue_type && <span>{ISSUE_LABEL[task.issue_type]}</span>}
            {task.issue_type && <span className="text-ink-3">·</span>}
            <span className="num">{formatKg(task.estimated_weight_kg)} kg</span>
            {task.eta_minutes != null && (
              <>
                <span className="text-ink-3">·</span>
                <span className="num">{task.eta_minutes} min</span>
              </>
            )}
          </div>
        </div>

        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0 text-ink-3">
          <path d="M6.5 4L11.5 9L6.5 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  );
}
