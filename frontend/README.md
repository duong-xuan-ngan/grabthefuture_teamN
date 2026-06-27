# WasteHotspot — Frontend

React + Vite frontend for the **WasteHotspot** waste-collection dispatch system.
Implements three role-based views from the Technical Requirements doc:

| Path | Role | What it does |
|------|------|--------------|
| `/dispatcher` | Dispatcher (desktop) | Live operations map, KPI strip, AI route suggestion (Approve / Reject), hotspot list, fleet capacity bars |
| `/driver` | Driver (mobile) | Task list, current task detail, weight input on Done, shift summary |
| `/r?b=<binId>` | Resident (mobile) | QR-landed report form (Overflow / Near full / Bulky / Smell + photo + note) → success → status timeline |
| `/r/status[/:reportId]` | Resident | Look up a report status by ID |

The visual language is intentionally minimal: white + `#306D29` primary,
warm off-white surface, hairline borders, Inter throughout, tabular
numerals on every metric.

## Tech stack

- **React 18** + **Vite 5** (fast dev / HMR)
- **React Router 6** (one route per role)
- **Leaflet 1.9** + **react-leaflet** + CARTO Positron tiles (no API key)
- **Tailwind CSS 3** with extended palette + animations

No component library — see `src/components/` for a short, focused set
(MapPanel, SuggestionCard, HotspotList, TruckList, TaskListScreen, etc).

## Quick start

```bash
cd frontend
npm install
cp .env.example .env       # default runs against the bundled mock data
npm run dev                # http://localhost:5173
```

Open the three roles in separate tabs:

- `http://localhost:5173/dispatcher`
- `http://localhost:5173/driver`
- `http://localhost:5173/r?b=042`

## Mock vs. real backend

`src/api/client.js` reads two env vars:

| Var | Default | Effect |
|-----|---------|--------|
| `VITE_API_URL` | `http://localhost:3000` | Base URL of the Express backend |
| `VITE_USE_MOCK` | `true` | When `true` or `VITE_API_URL` is blank, all calls are answered by `src/api/mock.js` so the UI runs standalone |

To wire the real backend, set `VITE_USE_MOCK=false` in `.env` and make
sure the backend exposes the endpoints below. The shapes match the
**shared data model** at the bottom of the requirements doc.

### Endpoint contract

```
GET    /api/hotspots                              → Hotspot[]
GET    /api/hotspots/:id                          → Hotspot
GET    /api/trucks                                → Truck[]   (include `route`: [[lat,lng]…] for map polyline)
GET    /api/routing/suggestion?hotspotId=…        → Suggestion
POST   /api/routing/suggestions/:id/approve       → Suggestion
POST   /api/routing/suggestions/:id/reject        → Suggestion
GET    /api/tasks?truckId=…                       → Task[]
PATCH  /api/tasks/:id                             → Task         (body: { status, weight_collected_kg? })
POST   /api/reports                               → Report       (body: { bin_id, issue_type, description, photo? })
GET    /api/reports/:id                           → Report
GET    /api/bins/:binId                           → Bin (lookup by QR code)
GET    /api/dashboard/kpis                        → KPI summary
```

The mock layer in `src/api/mock.js` is the canonical reference for
field names. Anywhere a field is computed (severity from priority_score,
capacity_pct from current_load_kg / max_capacity_kg) the helpers live in
`src/lib/constants.js` so the frontend keeps a single source of truth
without re-deriving everywhere.

## Project layout

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── src/
    ├── main.jsx          # entry, BrowserRouter
    ├── App.jsx           # route table
    ├── index.css         # Tailwind + Leaflet polish + marker classes
    ├── api/
    │   ├── client.js     # http() wrapper; switches mock <-> real
    │   └── mock.js       # in-process mock data + handlers
    ├── lib/
    │   ├── constants.js  # capacity / priority / issue thresholds
    │   └── format.js     # number, time, kg, % helpers
    ├── pages/
    │   ├── DispatcherPage.jsx
    │   ├── DriverPage.jsx
    │   ├── ResidentPage.jsx
    │   └── ResidentStatusPage.jsx
    └── components/
        ├── dispatcher/   # Sidebar, Topbar, KPIStrip, MapPanel,
        │                 # SuggestionCard, HotspotList, TruckList
        ├── driver/       # TaskListScreen, TaskDetailScreen,
        │                 # WeightInputScreen, CompletedScreen,
        │                 # UnreachableScreen, ShiftSummaryScreen,
        │                 # MapPreview
        └── resident/     # ReportForm, IssueButton, SuccessScreen,
                          # StatusScreen
```

## Mapping requirements → components

| Req. ID | Where implemented |
|---------|-------------------|
| F-MAP-01 / F-MAP-02 | `components/dispatcher/MapPanel.jsx` |
| F-ROUTE-03 | `components/dispatcher/SuggestionCard.jsx` |
| F-WEIGHT-04 / F-WEIGHT-05 | `components/dispatcher/TruckList.jsx` (bar + status pill) + `pages/DispatcherPage.jsx` KPI strip |
| F-DASH-01 | `components/dispatcher/KPIStrip.jsx` |
| F-DRIVER-01 / F-DRIVER-02 | `components/driver/TaskDetailScreen.jsx` + `WeightInputScreen.jsx` |
| F-DRIVER-03 | Driver header in `pages/DriverPage.jsx` |
| F-WEIGHT-03 | `components/driver/WeightInputScreen.jsx` |
| F-QR-01 / F-QR-02 / F-QR-03 | `components/resident/ReportForm.jsx` + `pages/ResidentPage.jsx` (`/r?b=`) |
| F-SCORE-02 colour coding | `lib/constants.js` `SEVERITY_COLOR` + map pins + hotspot badges |

## Build

```bash
npm run build      # ./dist
npm run preview    # serve ./dist locally
```

The build is a static SPA. Any host that supports SPA fallback to
`index.html` works (Vercel, Netlify, Cloudflare Pages, an `nginx
try_files`). For the Railway deploy noted in the tech-stack doc, point
the Express backend's static handler at `frontend/dist` after running
`npm run build`.
