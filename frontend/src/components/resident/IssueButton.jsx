export default function IssueButton({ label, hint, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-3 rounded-card text-left flex flex-col min-h-[64px] transition-all duration-200 border-2 ${
        selected
          ? 'bg-primary-soft shadow-card'
          : 'bg-white border-transparent hover:border-hairline hover:bg-surface'
      }`}
      style={selected ? { borderColor: '#00B14F' } : {}}
    >
      <div className="flex items-center justify-between w-full">
        <div className="text-[13px] font-semibold tracking-tightish text-ink">{label}</div>
        {selected && (
          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#00B14F' }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <div className="text-[11px] text-ink-2 mt-1 leading-tight">{hint}</div>
    </button>
  );
}
