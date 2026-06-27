import MapPreview from './MapPreview.jsx';

const ISSUE_LABEL = {
  overflow: 'Overflow',
  near_full: 'Near full',
  bulky: 'Bulky waste',
  smell: 'Bad smell',
};

export default function TaskDetailScreen({ task, tasks = [], truck, onDone, onUnreachable, onBack }) {
  if (!task) return null;

  return (
    <div className="flex flex-col min-h-full">
      <MapPreview tasks={tasks} activeTask={task} truck={truck} />

      <div className="flex-1 px-5 pt-4">
        <button
          onClick={onBack}
          className="text-[13px] text-ink-2 mb-3 flex items-center gap-1 hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.5 3.5L5 7L8.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All stops
        </button>

        {task.priority_score != null && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-danger-soft text-danger text-[11px] font-bold tracking-widest rounded-pill mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-danger" />
            PRIORITY {task.priority_score}
          </div>
        )}

        <div className="text-[22px] font-bold tracking-tightish leading-tight text-ink">
          {task.name}
        </div>
        <div className="text-[13px] text-ink-2 mt-1">
          {task.issue_type ? ISSUE_LABEL[task.issue_type] : 'Scheduled collection'}
          {task.category ? ` · ${task.category.replace(/_/g, ' ')}` : ''}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Fact label="Est. weight" value={task.estimated_weight_kg} suffix="kg" />
          <Fact label="Distance" value={task.distance_km ?? '—'} suffix={task.distance_km != null ? 'km' : ''} />
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 bg-white border-t border-hairline px-5 py-4 flex gap-3">
        <button
          onClick={onUnreachable}
          className="flex-1 py-4 text-[15px] font-semibold bg-white text-ink border-2 border-hairline rounded-pill hover:bg-surface transition-colors duration-200"
        >
          Can't reach
        </button>
        <button
          onClick={onDone}
          className="flex-[1.8] py-4 text-[17px] font-bold text-white rounded-pill transition-colors duration-200 tracking-tightish"
          style={{ background: '#00B14F' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#00873A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}
        >
          Mark done
        </button>
      </div>
    </div>
  );
}

function Fact({ label, value, suffix }) {
  return (
    <div className="px-4 py-3.5 bg-surface border border-hairline rounded-card">
      <div className="text-[10px] uppercase tracking-widest font-semibold text-ink-2 mb-1">
        {label}
      </div>
      <div className="text-[20px] font-bold num leading-none text-ink">
        {value}
        {suffix && <span className="text-[12px] text-ink-2 font-medium ml-1">{suffix}</span>}
      </div>
    </div>
  );
}
