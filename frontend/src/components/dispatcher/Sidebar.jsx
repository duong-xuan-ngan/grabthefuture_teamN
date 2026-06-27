import { clsx } from '../../lib/format.js';

function NavItem({ icon, label, badge, active }) {
  return (
    <div
      className={clsx(
        'px-2.5 py-1.5 text-[13px] rounded-md flex items-center gap-2.5 cursor-pointer',
        active
          ? 'bg-white border border-hairline font-medium text-ink'
          : 'text-ink-2 hover:bg-white/60',
      )}
    >
      {icon}
      <span>{label}</span>
      {badge != null && (
        <span className="ml-auto text-[11px] px-1.5 py-px bg-primary-soft text-primary rounded-full font-medium num">
          {badge}
        </span>
      )}
    </div>
  );
}

export default function Sidebar({ activeHotspotCount }) {
  return (
    <aside className="w-[220px] flex-shrink-0 bg-surface border-r border-hairline flex flex-col py-[18px]">
      {/* Brand */}
      <div className="px-[18px] pb-6 flex items-center gap-2">
        <div className="w-[22px] h-[22px] rounded-md bg-primary flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
        </div>
        <div className="text-[13px] font-semibold tracking-tightish">WasteHotspot</div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col px-2 gap-px">
        <NavItem
          active
          label="Operations"
          icon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 6.5L8 2L14 6.5V13C14 13.55 13.55 14 13 14H10V10H6V14H3C2.45 14 2 13.55 2 13V6.5Z" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          }
        />
        <NavItem
          label="Hotspots"
          badge={activeHotspotCount}
          icon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L9.5 5.5H14L10.5 8.5L12 13L8 10L4 13L5.5 8.5L2 5.5H6.5L8 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          }
        />
        <NavItem
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
          label="Reports"
          icon={
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 9V11M8 6V11M11 8V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          }
        />
        <NavItem
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
      <div className="mt-auto px-[18px] pt-4 pb-1">
        <div className="text-[10px] font-medium tracking-wider uppercase text-ink-3 mb-2">
          Shift
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="num">Morning · 06:00–14:00</span>
        </div>
        <div className="text-[11px] text-ink-2 mt-1">Hà — Dispatcher</div>
      </div>
    </aside>
  );
}
