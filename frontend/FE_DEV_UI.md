# Frontend Dev — UI, Pages & API Integration

**Role:** Frontend Developer  
**Scope:** All user-facing interfaces: citizen report form · crew mobile app · manager dashboard  
**Stack:** React 18 · Vite · Tailwind CSS · React Router v6 · React Query v5 · Leaflet.js · Zustand · Recharts

---

## Your Files

```
frontend/
├── src/
│   ├── pages/
│   │   ├── ReportForm.jsx        ← citizen QR/web report (stub exists)
│   │   ├── ReportDone.jsx        ← post-submit confirmation
│   │   ├── CrewApp.jsx           ← crew route view (stub exists)
│   │   ├── CrewCheckIn.jsx       ← per-stop check-in screen
│   │   ├── Dashboard.jsx         ← manager live map + KPIs
│   │   └── Login.jsx             ← email/password login
│   ├── components/
│   │   ├── NavBar.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── SeverityBadge.jsx
│   │   ├── PhotoUpload.jsx
│   │   ├── MapView.jsx           ← Leaflet wrapper
│   │   ├── MetricCard.jsx
│   │   ├── StopCard.jsx
│   │   ├── IssueTypeSelector.jsx
│   │   ├── SeveritySelector.jsx
│   │   └── LocationPicker.jsx
│   ├── hooks/
│   │   ├── useRoute.js           ← poll GET /routes/:id every 30s
│   │   ├── useMapData.js         ← poll GET /dashboard/map every 30s
│   │   └── useMetrics.js         ← fetch GET /dashboard/metrics
│   ├── services/
│   │   ├── api.js                ← axios base client (already implemented)
│   │   ├── reports.js            ← report API calls (already implemented)
│   │   ├── routes.js             ← route/cluster API calls (already implemented)
│   │   ├── dashboard.js          ← dashboard API calls (already implemented)
│   │   └── auth.js               ← login + me
│   ├── store/
│   │   └── authStore.js          ← Zustand: token + user identity
│   └── styles/
│       └── index.css             ← Tailwind directives
├── index.html
├── vite.config.js
├── tailwind.config.js
├── .env.example
└── package.json
```

---

## Pages to Build

### Page 1 — Report Form (`/report`)
The most important page. Reachable by QR code. No auth required.

**Fields to collect (in order):**
1. Issue type — icon grid with 5 options (overflow, bulky, contamination, odor, illegal_dump)
2. Severity — 3-button toggle: Low / Medium / High
3. Location — try `navigator.geolocation` first; fall back to a small Leaflet map for manual pin
4. Photo — optional file input, accept jpg/png, show preview thumbnail
5. Description — textarea, optional, max 300 chars with counter
6. Submit button — calls `POST /api/v1/reports`, redirect to `/report/done` on success

**UX constraints:**
- Must be completable in under 90 seconds, first use, no instructions
- Works on 3G on low-end Android — keep bundle small, lazy-load the map
- Touch targets ≥ 44px on all interactive elements
- Single-column layout, no horizontal scroll

---

### Page 2 — Report Confirmation (`/report/done`)
Shown after successful submit. Display:
- Large green checkmark
- Report reference ID (returned from API)
- "Thank you" message in Vietnamese and English
- No navigation links (citizens don't need to go anywhere else)

---

### Page 3 — Crew Route View (`/crew`)
Auth required (crew role). Mobile-first.

**What to show:**
- Today's shift header with route status badge
- Ordered list of stops — use `StopCard` for each:
  - Stop number + address
  - Priority badge (High / Medium)
  - Issue type icons
  - Status (pending / in progress / completed)
- Green progress bar: N of M stops completed
- Poll every 30 seconds via `useRoute` hook — new stops may be inserted by the optimizer

---

### Page 4 — Crew Check-In (`/crew/:routeId/stop/:stopId`)
Auth required (crew role).

**Flow:**
1. Show stop details (address, issue types, cluster report count)
2. "Check In" button → call `navigator.geolocation.getCurrentPosition()` → `POST .../checkin`
3. After check-in: show "Mark Complete" button + optional photo upload
4. "Mark Complete" → `PATCH /reports/:id/status` with `status: completed` → navigate back to `/crew`

---

### Page 5 — Manager Dashboard (`/dashboard`)
Auth required (manager role). Desktop-first but not broken on tablet.

**Three sections:**

**A. Live Map** — Leaflet map, Ho Chi Minh City centered by default
- Each cluster is a pin colored by status: red=open, yellow=assigned, green=resolved
- Pin click → popup with: issue types, report count, time elapsed, assigned crew
- Poll `GET /dashboard/map` every 30 seconds via `useMapData` hook

**B. Status Table** — cards or table of active clusters
- Columns: location, priority score, report count, status, assigned crew
- Filter buttons: All / Pending / Assigned / Completed

**C. Impact Metrics** — 4 `MetricCard` components:
- Reports Processed
- Distance Saved (km)
- Time Saved (hours + minutes)
- CO₂ Reduced (kg) — labeled "estimated"

---

### Page 6 — Login (`/login`)
Minimal. Email + password form → `POST /auth/login` → store JWT in Zustand + localStorage → redirect to `/dashboard` (manager) or `/crew` (crew) based on returned role.

---

## Hooks

### `useRoute(routeId)` — 30s polling for crew app
```javascript
// src/hooks/useRoute.js
import { useQuery } from '@tanstack/react-query';
import { getRoute } from '../services/routes';

export function useRoute(routeId) {
  return useQuery({
    queryKey: ['route', routeId],
    queryFn: () => getRoute(routeId).then(r => r.data),
    refetchInterval: 30_000,
    enabled: !!routeId,
  });
}
```

### `useMapData()` — 30s polling for dashboard map
```javascript
// src/hooks/useMapData.js
import { useQuery } from '@tanstack/react-query';
import { getMapData } from '../services/dashboard';

export function useMapData() {
  return useQuery({
    queryKey: ['mapData'],
    queryFn: () => getMapData().then(r => r.data),
    refetchInterval: 30_000,
  });
}
```

---

## Auth Store (Zustand)

```javascript
// src/store/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('wf_token') || null,
  user:  null,

  setAuth: (token, user) => {
    localStorage.setItem('wf_token', token);
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('wf_token');
    set({ token: null, user: null });
  },
}));
```

Use `useAuthStore` to protect routes — redirect to `/login` if no token.

---

## Map Setup (Leaflet)

```javascript
// src/components/MapView.jsx  — skeleton
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

const STATUS_COLORS = { open: '#EF4444', assigned: '#FBBF24', resolved: '#22C55E' };

export default function MapView({ pins }) {
  return (
    <MapContainer center={[10.7769, 106.7009]} zoom={13} style={{ height: '100%' }}>
      <TileLayer url={import.meta.env.VITE_MAP_TILE_URL} />
      {pins.map(pin => (
        <CircleMarker
          key={pin.cluster_id}
          center={[pin.lat, pin.lng]}
          radius={8 + pin.report_count * 2}
          color={STATUS_COLORS[pin.status]}
        >
          <Popup>
            {pin.report_count} reports · Priority {pin.priority_score.toFixed(1)}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
```

Default center: `[10.7769, 106.7009]` — Ho Chi Minh City.

---

## Coding Conventions

- **Component files:** PascalCase (`StopCard.jsx`)
- **Hook files:** camelCase with `use` prefix (`useRoute.js`)
- **No inline styles:** Tailwind utility classes only
- **No `useEffect` for data fetching:** use React Query hooks exclusively
- **No `<form>` tags:** use `onClick` / `onChange` handlers and controlled state
- **Accessibility:** every interactive element without visible text needs `aria-label`
- **Vietnamese first:** all user-facing strings default to Vietnamese; English in comments
- **Error states:** every data-fetching component must handle `isLoading` and `isError`

---

## Environment Variables

```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

---

## Running Locally

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# → http://localhost:3000
```

The backend API must be running on port 4000 first.

---

## Progress Tracker

| Task | Status | Blocked by |
|------|--------|------------|
| Vite + React + Tailwind setup | 🔲 Not started | — |
| React Router — all 6 routes wired | 🔲 Not started | — |
| `store/authStore.js` — Zustand auth | 🔲 Not started | — |
| `services/auth.js` — login + me calls | 🔲 Not started | — |
| Login page | 🔲 Not started | `POST /auth/login` (BE Dev 1) |
| Protected route wrapper (redirect if no token) | 🔲 Not started | authStore |
| Report Form — issue type selector | 🔲 Not started | — |
| Report Form — severity selector | 🔲 Not started | — |
| Report Form — GPS + Leaflet fallback | 🔲 Not started | — |
| Report Form — photo upload + preview | 🔲 Not started | — |
| Report Form — submit + error handling | 🔲 Not started | `POST /reports` (BE Dev 1) |
| Report Confirmation page | 🔲 Not started | — |
| `hooks/useRoute.js` — 30s poll | 🔲 Not started | `GET /routes/:id` (BE Dev 1) |
| Crew Route View — stop list | 🔲 Not started | useRoute hook |
| Crew Route View — progress bar | 🔲 Not started | — |
| Crew Check-In — GPS capture | 🔲 Not started | `POST .../checkin` (BE Dev 1) |
| Crew Check-In — mark complete + photo | 🔲 Not started | — |
| `components/MapView.jsx` — Leaflet wrapper | 🔲 Not started | — |
| `hooks/useMapData.js` — 30s poll | 🔲 Not started | `GET /dashboard/map` (BE Dev 1) |
| Dashboard — live map with cluster pins | 🔲 Not started | useMapData hook |
| Dashboard — status table + filters | 🔲 Not started | — |
| `hooks/useMetrics.js` | 🔲 Not started | `GET /dashboard/metrics` (BE Dev 1) |
| Dashboard — 4 KPI metric cards | 🔲 Not started | useMetrics hook |
| Dashboard — 30-day trend chart (Recharts) | 🔲 Not started | metrics data |

Legend: ✅ Done · 🔄 In progress · 🔲 Not started · ⏸ Blocked
