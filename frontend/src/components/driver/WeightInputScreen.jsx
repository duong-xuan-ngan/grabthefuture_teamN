// Weight confirmation — big number, big +/- buttons, quick presets.
export default function WeightInputScreen({ task, weight, setWeight, onConfirm, onCancel }) {
  const est = task?.estimated_weight_kg || 0;
  const presets = [...new Set([est, Math.round(est * 1.2), Math.round(est * 0.8)].filter(Boolean))];

  return (
    <div className="flex flex-col min-h-full px-5 pt-6 pb-6">
      <div className="flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1.5">
          Confirm weight
        </div>
        <div className="text-[22px] font-semibold tracking-tightish leading-tight mb-1">
          {task?.name}
        </div>
        <div className="text-[14px] text-ink-2 mb-6">
          Adjust if the collected weight differs from the estimate.
        </div>

        {/* Big number + steppers */}
        <div className="flex items-center justify-center gap-5 py-6">
          <button
            onClick={() => setWeight(Math.max(0, weight - 5))}
            className="w-14 h-14 rounded-2xl bg-surface border border-line text-2xl font-light hover:bg-white active:scale-95 transition"
          >
            −
          </button>
          <div className="text-center min-w-[120px]">
            <div className="text-[52px] font-semibold tracking-tightest leading-none num">
              {weight}
            </div>
            <div className="text-sm text-ink-2 font-medium mt-1">kg</div>
          </div>
          <button
            onClick={() => setWeight(weight + 5)}
            className="w-14 h-14 rounded-2xl bg-surface border border-line text-2xl font-light hover:bg-white active:scale-95 transition"
          >
            +
          </button>
        </div>

        {/* Presets */}
        <div className="flex justify-center gap-2 mt-2">
          {presets.map((v) => (
            <button
              key={v}
              onClick={() => setWeight(v)}
              className={`px-4 py-2 text-[13px] font-medium rounded-full border num ${
                weight === v
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-ink-2 border-line hover:border-ink-2'
              }`}
            >
              {v} kg
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6">
        <button
          onClick={onConfirm}
          className="w-full py-4 text-[17px] font-bold text-white rounded-pill tracking-tightish transition-colors duration-200"
          style={{ background: '#00B14F' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#00873A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}
        >
          Confirm & finish
        </button>
        <button
          onClick={onCancel}
          className="w-full mt-2.5 py-3 text-[14px] font-medium text-ink-2 hover:text-ink"
        >
          Back
        </button>
      </div>
    </div>
  );
}
