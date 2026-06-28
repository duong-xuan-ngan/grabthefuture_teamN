export default function SuccessScreen({ report, onAnother, onTrack }) {
  return (
    <div className="flex flex-col items-center justify-start text-center px-6 pt-10 pb-8 animate-fade-up">
      <div className="w-[72px] h-[72px] rounded-full bg-primary-soft flex items-center justify-center mb-4">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M8 16L13 21L24 9" stroke="#00B14F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {/* 'deadline' is present (string or explicit null) only for booked
          pickups; a plain report has no deadline key at all. */}
      {(() => {
        const isBooking = 'deadline' in report;
        const scheduledAt = report.deadline ? new Date(report.deadline) : null;
        return (
          <>
            <div className="text-[22px] font-semibold tracking-tightish">
              {isBooking ? 'Pickup booked' : 'Thank you'}
            </div>
            <p className="text-sm text-ink-2 mt-2 leading-snug max-w-[260px]">
              {isBooking
                ? 'A truck will be dispatched accordingly.'
                : 'Your report has been received. A truck will be dispatched if needed.'}
            </p>
            {isBooking && (
              <div className="mt-4 px-3.5 py-2 rounded-pill bg-primary-soft text-[12px] font-semibold" style={{ color: '#00873A' }}>
                {scheduledAt ? `Scheduled for ${scheduledAt.toLocaleString()}` : 'Priority pickup · ASAP'}
              </div>
            )}
          </>
        );
      })()}

      <div className="mt-7 w-full p-3.5 bg-surface border border-hairline rounded-xl text-left">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-medium tracking-wider uppercase text-ink-3">
              Report ID
            </div>
            <div className="text-sm font-medium mt-0.5 font-mono num">{report.id}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-medium tracking-wider uppercase text-ink-3">
              Status
            </div>
            <div className="text-xs font-medium mt-0.5 text-primary capitalize">
              {report.status?.replace(/_/g, ' ') || 'Clustering…'}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onTrack}
        className="mt-5 w-full py-3 text-sm font-bold text-white rounded-pill transition-colors duration-200"
        style={{ background: '#00B14F' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#00873A'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#00B14F'; }}
      >
        Track this report
      </button>
      <button
        onClick={onAnother}
        className="mt-3 text-[13px] text-ink-2 underline underline-offset-2 hover:text-ink transition-colors"
      >
        Report another issue
      </button>
    </div>
  );
}
