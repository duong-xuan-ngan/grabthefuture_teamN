export default function PhoneFrame({ children }) {
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="min-h-[100dvh] sm:min-h-screen flex items-center justify-center sm:py-8 sm:px-4 bg-white sm:bg-[linear-gradient(135deg,#00212F_0%,#003a52_50%,#00212F_100%)]"
    >
      {/* Dot-grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none hidden sm:block"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,177,79,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Brand watermark */}
      <div className="fixed top-6 left-8 flex items-center gap-2.5 pointer-events-none select-none hidden sm:flex">
        <div className="w-7 h-7 rounded-btn flex items-center justify-center" style={{ background: '#00B14F' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" />
          </svg>
        </div>
        <span className="text-sm font-bold tracking-tightish" style={{ color: 'rgba(255,255,255,0.45)' }}>
          GrabWaste
        </span>
      </div>

      {/* Phone shell */}
      <div
        className="relative flex flex-col overflow-hidden w-full h-[100dvh] sm:w-[390px] sm:h-[844px] sm:rounded-[44px] sm:shadow-[0_0_0_10px_#1a3a4a,0_0_0_12px_#0f2530,0_40px_80px_rgba(0,0,0,0.6),0_8px_24px_rgba(0,0,0,0.4)]"
        style={{
          background: '#ffffff',
        }}
      >
        {/* Status bar */}
        <div
          className="flex-shrink-0 hidden sm:flex items-center justify-between px-7"
          style={{ background: '#00212F', height: '44px' }}
        >
          <span className="text-[11px] font-semibold num" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {time}
          </span>
          <div className="flex items-center gap-1.5">
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
              <rect x="0" y="7" width="3" height="3" rx="0.5" fill="white" fillOpacity="0.7" />
              <rect x="4.5" y="4.5" width="3" height="5.5" rx="0.5" fill="white" fillOpacity="0.7" />
              <rect x="9" y="2" width="3" height="8" rx="0.5" fill="white" fillOpacity="0.7" />
              <rect x="13.5" y="0" width="2.5" height="10" rx="0.5" fill="white" fillOpacity="0.7" />
            </svg>
            <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
              <rect x="0.5" y="0.5" width="18" height="10" rx="2.5" stroke="white" strokeOpacity="0.7" />
              <rect x="2" y="2" width="13" height="7" rx="1.5" fill="white" fillOpacity="0.7" />
              <path d="M20 3.5V7.5" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* App content fills remaining height */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </div>

        {/* Home indicator */}
        <div className="flex-shrink-0 hidden sm:flex justify-center py-2" style={{ background: '#ffffff' }}>
          <div className="w-32 h-1 rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }} />
        </div>
      </div>
    </div>
  );
}
