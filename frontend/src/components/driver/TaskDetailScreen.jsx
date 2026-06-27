import MapPreview from './MapPreview.jsx';

const ISSUE_LABEL = {
  overflow: 'Overflow',
  near_full: 'Near full',
  bulky: 'Bulky waste',
  smell: 'Bad smell',
};

export default function TaskDetailScreen({ task, onDone, onUnreachable, onBack }) {
  if (!task) return null;
  return (
    <div className="animate-fade-up">
      <MapPreview score={task.priority_score} distanceKm={task.distance_km} etaMin={task.eta_minutes} />

      <div className="px-5 pt-5">
        <div className="flex items-center gap-2 mb-1.5">
          {task.priority_score != null && (
            <div className="px-2 py-0.5 bg-danger-soft text-danger text-[10px] font-semibold tracking-wider rounded-full">
              PRIORITY {task.priority_score}
            </div>
          )}
          {task.issue_type && (
            <div className="text-[11px] text-ink-2">{ISSUE_LABEL[task.issue_type]}</div>
          )}
        </div>
        <div className="text-[19px] font-semibold tracking-tightish leading-tight">
          {task.name}
        </div>
        <div className="text-[12px] text-ink-2 mt-1 num">
          {task.address} · Bin {task.waste_point_id?.replace('wp-', 'M-')} ·{' '}
          {task.category?.replace(/_/g, ' ')}
        </div>

        <div className="mt-4 px-3.5 py-3 bg-surface border border-hairline rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3">
              Estimated weight
            </div>
            <div className="text-base font-semibold num">
              {task.estimated_weight_kg}
              <span className="text-[11px] text-ink-2 font-medium"> kg</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3">
              Reports
            </div>
            <div className="text-base font-semibold num">{task.photos || '—'}</div>
          </div>
        </div>

        {task.photos > 0 && (
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3 mb-2">
              Resident photos · {task.photos}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: Math.min(task.photos, 3) }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-md"
                  style={{
                    background: [
                      'linear-gradient(135deg, #C8C8BE 0%, #9A9A93 100%)',
                      'linear-gradient(135deg, #B0AFA3 0%, #8A8A82 100%)',
                      'linear-gradient(135deg, #A5A599 0%, #75756B 100%)',
                    ][i],
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="px-5 pt-5 pb-6 flex gap-2 sticky bottom-0 bg-white">
        <button
          onClick={onUnreachable}
          className="flex-1 py-3.5 text-sm font-medium bg-white text-ink border border-line rounded-xl hover:bg-surface transition-colors"
        >
          Unreachable
        </button>
        <button
          onClick={onDone}
          className="flex-[1.6] py-3.5 text-[15px] font-semibold bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors tracking-tightish"
        >
          Done
        </button>
      </div>
    </div>
  );
}
