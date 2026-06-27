import { Link, useLocation } from 'react-router-dom';

const VIEWS = [
  { label: 'Dispatcher', to: '/dispatcher', match: ['/dispatcher'] },
  { label: 'Driver', to: '/driver', match: ['/driver'] },
  { label: 'Resident', to: '/resident?b=042', match: ['/resident'] },
];

export default function AppSwitcher() {
  const { pathname } = useLocation();
  const active = VIEWS.find((view) => view.match.some((path) => pathname.startsWith(path)));

  if (!active) return null;

  return (
    <nav className="fixed top-3 left-1/2 z-[1000] -translate-x-1/2 rounded-lg border border-line bg-white/95 p-1 shadow-sm backdrop-blur">
      <div className="grid grid-cols-3 gap-1">
        {VIEWS.map((view) => {
          const selected = view === active;
          return (
            <Link
              key={view.label}
              to={view.to}
              className={`min-w-[92px] rounded-md px-4 py-2 text-center text-sm font-semibold transition-colors ${
                selected
                  ? 'bg-ink text-white'
                  : 'text-ink-2 hover:bg-surface hover:text-ink'
              }`}
            >
              {view.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
