export default function WeightInputScreen({ task, weight, setWeight, onConfirm, onCancel }) {
  return (
    <div className="px-5 pt-5 pb-6 animate-fade-up">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1.5">
        Confirm weight
      </div>
      <div className="text-[19px] font-semibold tracking-tightish leading-tight mb-1">
        {task?.name}
      </div>
      <div className="text-[12px] text-ink-2 mb-5">
        Adjust if the collected weight differs from the estimate.
      </div>

      <div className="flex items-end gap-4 px-5 py-5 bg-surface border border-hairline rounded-2xl mb-2">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider font-medium text-ink-3 mb-1">
            Weight collected
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="text-[40px] font-semibold tracking-tightest leading-none num">
              {weight}
            </div>
            <div className="text-sm text-ink-2 font-medium">kg</div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setWeight(weight + 5)}
            className="w-9 h-9 rounded-lg bg-white border border-line text-base hover:bg-surface"
          >
            +
          </button>
          <button
            onClick={() => setWeight(Math.max(0, weight - 5))}
            className="w-9 h-9 rounded-lg bg-white border border-line text-base hover:bg-surface"
          >
            −
          </button>
        </div>
      </div>

      {/* Quick-set chips */}
      <div className="flex gap-1.5 mb-6">
        {[task?.estimated_weight_kg, Math.round(task?.estimated_weight_kg * 1.2), Math.round(task?.estimated_weight_kg * 0.8)]
          .filter(Boolean)
          .map((v) => (
            <button
              key={v}
              onClick={() => setWeight(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border ${
                weight === v ? 'bg-ink text-white border-ink' : 'bg-white text-ink-2 border-line hover:border-ink-2'
              } num`}
            >
              {v} kg
            </button>
          ))}
      </div>

      <button
        onClick={onConfirm}
        className="w-full py-3.5 text-[15px] font-semibold bg-primary text-white rounded-xl tracking-tightish hover:bg-primary-dark"
      >
        Confirm and finish
      </button>
      <button
        onClick={onCancel}
        className="w-full mt-2 py-3 text-[13px] font-medium text-ink-2 hover:text-ink"
      >
        Back
      </button>
    </div>
  );
}
