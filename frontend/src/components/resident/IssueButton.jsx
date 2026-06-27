export default function IssueButton({ label, hint, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-3 rounded-xl text-left flex flex-col min-h-[64px] transition-colors ${
        selected
          ? 'bg-primary-soft border border-primary'
          : 'bg-white border border-hairline hover:border-ink-3'
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="text-[13px] font-medium tracking-tightish">{label}</div>
        {selected && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="7" fill="#306D29" />
            <path d="M4 7L6 9L10 5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="text-[11px] text-ink-2 mt-1">{hint}</div>
    </button>
  );
}
