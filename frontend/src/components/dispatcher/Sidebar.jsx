import { clsx } from '../../lib/format.js';

function NavItem({ icon, label, badge, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full px-3 py-2 text-[13px] rounded-btn flex items-center gap-2.5 text-left transition-colors duration-200',
        active
          ? 'bg-white/10 text-white font-semibold'
          : 'text-white/60 hover:bg-white/8 hover:text-white/90',
      )}
    >
      {icon}
      <span>{label}</span>
      {badge != null && (
        <span className="ml-auto text-[11px] px-1.5 py-px bg-primary text-white rounded-pill font-semibold num">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({ activeHotspotCount, activeTab = 'operations', onTabChange }) {
  const change = (tab) => onTabChange?.(tab);

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col py-5" style={{ background: '#00212F' }}>
      {/* Brand */}
      <div className="px-5 pb-7 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-btn flex items-center justify-center flex-shrink-0" style={{ background: '#00B14F' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" />
          </svg>
        </div>
        <div className="text-[14px] font-bold text-white tracking-tightish">Erac</div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col px-3 gap-0.5">
        <NavItem
          active={activeTab === 'operations'}
          onClick={() => change('operations')}
          label="Operations"
          icon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 6.5L8 2L14 6.5V13C14 13.55 13.55 14 13 14H10V10H6V14H3C2.45 14 2 13.55 2 13V6.5Z" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          }
        />
        <NavItem
          active={activeTab === 'hotspots'}
          onClick={() => change('hotspots')}
          label="Hotspots"
          badge={activeHotspotCount}
          icon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L9.5 5.5H14L10.5 8.5L12 13L8 10L4 13L5.5 8.5L2 5.5H6.5L8 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          }
        />
        <NavItem
          active={activeTab === 'trucks'}
          onClick={() => change('trucks')}
          label="Trucks"
          icon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="5" width="9" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <path d="M10.5 7H13L14.5 9V11H10.5" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="4" cy="12" r="1.3" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="12" cy="12" r="1.3" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          }
        />
        <NavItem
          active={activeTab === 'reports'}
          onClick={() => change('reports')}
          label="Reports"
          icon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 9V11M8 6V11M11 8V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          }
        />
        <NavItem
          active={activeTab === 'zones'}
          onClick={() => change('zones')}
          label="Zones"
          icon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M8 5L11 6.75V10.25L8 12L5 10.25V6.75L8 5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          }
        />
        <NavItem
          active={activeTab === 'settings'}
          onClick={() => change('settings')}
          label="Settings"
          icon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 1V3M8 13V15M15 8H13M3 8H1M12.9 3.1L11.5 4.5M4.5 11.5L3.1 12.9M12.9 12.9L11.5 11.5M4.5 4.5L3.1 3.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          }
        />
      </nav>

      {/* Shift status */}
      <div className="mt-auto px-5 pt-4">
        <div className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: '#B0C4CC' }}>
          Shift
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/80">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00B14F' }} />
          <span className="num">Morning · 06:00–14:00</span>
        </div>
        <div className="text-[11px] mt-1" style={{ color: '#B0C4CC' }}>Hà — Dispatcher</div>
      </div>
    </aside>
  );
}
