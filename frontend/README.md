# 🎨 Frontend — WasteFlow UI

**Owner:** Frontend Dev  
**Stack:** React · Vite · Tailwind CSS · Leaflet.js · React Query

---

## Folder Structure

```
frontend/
├── src/
│   ├── pages/         → Top-level page components (one per route)
│   ├── components/    → Reusable UI components
│   ├── hooks/         → Custom React hooks (data fetching, polling)
│   ├── services/      → API client functions (axios wrappers)
│   ├── store/         → Global state (Zustand or React Context)
│   └── styles/        → Tailwind config, global CSS
├── public/            → Static assets, PWA manifest, favicon
├── index.html
├── vite.config.js
├── tailwind.config.js
└── README.md          → This file
```

---

## Pages to Build

| Page | Path | User | Description |
|------|------|------|-------------|
| Report Form | `/report` | Anyone (no auth) | Citizen QR/web report submission |
| Report Confirmation | `/report/done` | Anyone | Post-submit confirmation + report ID |
| Crew Route View | `/crew` | Crew (auth) | Ordered stop list for current shift |
| Crew Check-in | `/crew/:routeId/stop/:stopId` | Crew (auth) | Check-in screen per stop |
| Manager Dashboard | `/dashboard` | Manager (auth) | Live map + KPIs |
| Login | `/login` | Manager + Crew | Email/password login |
| 404 | `*` | All | Not found fallback |

---

## Component Breakdown

### Shared Components (`src/components/`)

| Component | File | Used By |
|-----------|------|---------|
| `<NavBar />` | `NavBar.jsx` | All authenticated pages |
| `<LoadingSpinner />` | `LoadingSpinner.jsx` | All async pages |
| `<StatusBadge />` | `StatusBadge.jsx` | Everywhere status is shown |
| `<SeverityBadge />` | `SeverityBadge.jsx` | Report lists, cluster cards |
| `<PhotoUpload />` | `PhotoUpload.jsx` | Report form, crew check-in |
| `<MapView />` | `MapView.jsx` | Dashboard (Leaflet wrapper) |
| `<MetricCard />` | `MetricCard.jsx` | Dashboard KPI tiles |
| `<ClusterPin />` | `ClusterPin.jsx` | Map pin with status color |

### Page-specific Components

**Report Form:**
- `IssueTypeSelector.jsx` — icon grid for issue type selection
- `SeveritySelector.jsx` — 3-level radio group
- `LocationPicker.jsx` — GPS auto-detect + manual map pin fallback

**Crew App:**
- `StopCard.jsx` — single stop with address, priority badge, issue list
- `RouteProgress.jsx` — progress bar (N of M stops completed)
- `CheckInButton.jsx` — GPS capture + status update

**Dashboard:**
- `HotspotMap.jsx` — Leaflet map with cluster pins + heatmap layer
- `StatusTable.jsx` — filterable table of active clusters
- `ImpactSummary.jsx` — 4 KPI cards (reports, km, time, CO₂)
- `TrendChart.jsx` — 30-day line chart (recharts)

---

## API Integration

All API calls go through `src/services/api.js`. This file wraps axios and handles:
- Base URL from `VITE_API_URL` environment variable
- Automatic JWT token attachment from localStorage
- 401 handling (redirect to `/login`)

```javascript
// src/services/api.js skeleton
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Interceptor: attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('wf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

### Service modules to create

| File | Endpoints wrapped |
|------|------------------|
| `services/reports.js` | `POST /reports`, `GET /reports`, `PATCH /reports/:id/status` |
| `services/routes.js` | `GET /routes/:id`, `POST /routes/:id/stops/:stopId/checkin` |
| `services/dashboard.js` | `GET /dashboard/metrics`, `GET /dashboard/map` |
| `services/auth.js` | `POST /auth/login`, `GET /auth/me` |

---

## State Management

Use **React Query** for server state (data fetching, caching, polling).  
Use **Zustand** (or React Context) for client-only state (auth token, UI preferences).

### Polling Strategy (no WebSocket in MVP)

The dashboard and crew app poll the API every **30 seconds**:

```javascript
// src/hooks/useRoute.js
import { useQuery } from '@tanstack/react-query';
import { getRoute } from '../services/routes';

export function useRoute(routeId) {
  return useQuery({
    queryKey: ['route', routeId],
    queryFn: () => getRoute(routeId),
    refetchInterval: 30_000,  // 30-second polling
  });
}
```

---

## PWA Requirements

The crew app must work offline (route data cached at shift start).

Add to `vite.config.js`:
```javascript
import { VitePWA } from 'vite-plugin-pwa';

// Configure service worker to cache:
// - Route data JSON for the current crew's shift
// - All static assets
// Queue check-in actions in IndexedDB when offline; sync on reconnect
```

---

## Responsive Design

- **Report form + Crew app:** mobile-first, min-width 320px, touch targets ≥ 44px
- **Dashboard:** desktop-first (min 1024px), but must not break on tablet
- Use Tailwind breakpoints: `sm:` `md:` `lg:` — never use arbitrary pixel values
- Colors: green palette (`green-600`, `green-700`) for primary actions; `red-500` for high severity; `yellow-400` for medium

---

## Environment Variables

```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

---

## Coding Conventions

- **Component files:** PascalCase (`StopCard.jsx`)
- **Hook files:** camelCase with `use` prefix (`useRoute.js`)
- **Service files:** camelCase (`reports.js`)
- **Props:** always destructure in function signature
- **No inline styles:** Tailwind classes only
- **No `useEffect` for data fetching:** use React Query hooks
- **Accessibility:** all interactive elements must have `aria-label` if no visible text

---

## Progress Tracker

| Task | Status | Notes |
|------|--------|-------|
| Vite + React + Tailwind setup | 🔲 Not started | |
| React Router setup (all routes) | 🔲 Not started | |
| `services/api.js` base client | 🔲 Not started | |
| Login page + auth flow | 🔲 Not started | |
| Report form — issue type + severity | 🔲 Not started | |
| Report form — GPS + map pin | 🔲 Not started | |
| Report form — photo upload | 🔲 Not started | |
| Report confirmation screen | 🔲 Not started | |
| Crew route view — stop list | 🔲 Not started | |
| Crew check-in flow (GPS) | 🔲 Not started | |
| Crew mark complete + photo | 🔲 Not started | |
| Dashboard — Leaflet map + pins | 🔲 Not started | |
| Dashboard — status table | 🔲 Not started | |
| Dashboard — 4 KPI metric cards | 🔲 Not started | |
| Dashboard — 30-day trend chart | 🔲 Not started | |
| React Query polling (30s) | 🔲 Not started | |
| PWA offline caching (crew app) | 🔲 Not started | Low priority if time-constrained |

Legend: ✅ Done · 🔄 In progress · 🔲 Not started
