export default function CompletedScreen({ weight, nextTask, onNext }) {
  return (
    <div className="px-6 pt-12 pb-6 text-center animate-fade-up">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-soft flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M6 14L12 20L22 8" stroke="#00B14F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="text-lg font-semibold tracking-tightish">Task complete</div>
      <div className="text-[13px] text-ink-2 mt-1.5 num">
        {weight} kg logged to your truck
      </div>

      {nextTask && (
        <div className="mt-6 p-3.5 bg-surface border border-hairline rounded-xl text-left">
          <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3 mb-1.5">
            Next stop
          </div>
          <div className="text-sm font-medium">{nextTask.name}</div>
          <div className="text-[11px] text-ink-2 mt-0.5 num">
            {nextTask.distance_km} km · ~{nextTask.eta_minutes} min · est.{' '}
            {nextTask.estimated_weight_kg} kg
          </div>
        </div>
      )}
      <button
        onClick={onNext}
        className="mt-4 w-full py-3.5 text-sm font-bold text-white rounded-pill transition-colors duration-200"
        style={{ background: '#00B14F' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#00873A'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}
      >
        {nextTask ? 'Start next stop' : 'Back to stops'}
      </button>
    </div>
  );
}
