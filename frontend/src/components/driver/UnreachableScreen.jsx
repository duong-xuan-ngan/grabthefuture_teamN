export default function UnreachableScreen({ onNext }) {
  return (
    <div className="px-6 pt-12 pb-6 text-center animate-fade-up">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="11" stroke="#6B6B65" strokeWidth="2" />
          <path d="M14 8V15M14 19V19.5" stroke="#6B6B65" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-lg font-semibold tracking-tightish">Marked unreachable</div>
      <div className="text-[13px] text-ink-2 mt-1.5">
        Dispatcher has been notified
      </div>
      <button
        onClick={onNext}
        className="mt-6 w-full py-3 text-sm font-medium bg-white text-ink border border-line rounded-xl hover:bg-surface"
      >
        Continue
      </button>
    </div>
  );
}
