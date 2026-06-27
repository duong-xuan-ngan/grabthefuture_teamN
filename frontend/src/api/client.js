// API client. Reads VITE_API_URL and VITE_USE_MOCK at build time.
// If mock mode is on, calls route through ./mock.js with realistic async
// timing; otherwise we hit the real FastAPI backend over fetch.
//
// The backend follows the documented API contract (used by the routing engine
// and other team members): enveloped responses ({hotspots:[...]}), snake_case
// fields, integer IDs, and DB enums (bulky_waste / bad_smell). The frontend was
// built against a flatter mock shape. The adapter functions below translate
// between the two so neither side has to change. Mock mode bypasses all of it.

import * as mock from './mock.js';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === 'true' || !BASE_URL;

// --- Auth token (JWT) -------------------------------------------------
// Stored in localStorage so the dispatcher/driver session survives reloads.
// Sent as a bearer header on every request when present; harmless when the
// backend has AUTH_REQUIRED=false.
const TOKEN_KEY = 'wh_token';
export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

async function http(method, path, body, isForm = false) {
  const opts = { method, headers: {} };
  const token = getToken();
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    if (isForm) {
      opts.body = body; // FormData — let the browser set the boundary header
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${BASE_URL}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// --------------------------------------------------------------------
// Enum + shape adapters (backend → frontend)
// --------------------------------------------------------------------

// DB issue enum → UI issue key (constants.js / ISSUE_LABEL use bulky + smell).
const ISSUE_TO_UI = { overflow: 'overflow', near_full: 'near_full', bulky_waste: 'bulky', bad_smell: 'smell' };
const ISSUE_TO_API = { overflow: 'overflow', near_full: 'near_full', bulky: 'bulky_waste', smell: 'bad_smell' };

function adaptIssue(t) {
  return t == null ? t : (ISSUE_TO_UI[t] ?? t);
}

// Truck marker/badge wants a short `code`; derive from the name ("Truck Alpha"
// → "A", "Truck B · …" → "B") with a stable fallback to the id.
function truckCode(truck) {
  const n = truck.name || '';
  const afterTruck = n.replace(/^truck\s+/i, '').trim();
  const first = afterTruck.split(/[\s·]/)[0] || '';
  if (first) return first[0].toUpperCase();
  return String(truck.id);
}

function adaptTruck(t) {
  return {
    ...t,
    id: t.id,
    code: t.code || truckCode(t),
    // mock used a "Truck X · Model" name; keep backend name but guarantee the
    // " · " split the driver header relies on doesn't blow up.
    name: t.name?.includes(' · ') ? t.name : `${t.name || 'Truck'} · ${t.driver || ''}`.trim(),
    driver: t.driver || '—',
    stops_left: t.stops_left ?? 0,
  };
}

function adaptHotspot(h) {
  return { ...h, issue_type: adaptIssue(h.issue_type) };
}

function adaptTask(t) {
  return { ...t, issue_type: adaptIssue(t.issue_type) };
}

// --------------------------------------------------------------------
// Hotspots
// --------------------------------------------------------------------
export function listHotspots() {
  if (USE_MOCK) return mock.listHotspots();
  return http('GET', '/api/hotspots').then((d) => (d.hotspots || []).map(adaptHotspot));
}
export function getHotspot(id) {
  if (USE_MOCK) return mock.getHotspot(id);
  return http('GET', `/api/hotspots/${id}`).then(adaptHotspot);
}

// --------------------------------------------------------------------
// Trucks
// --------------------------------------------------------------------
export function listTrucks() {
  if (USE_MOCK) return mock.listTrucks();
  return http('GET', '/api/trucks').then((d) => (d.trucks || []).map(adaptTruck));
}

// --------------------------------------------------------------------
// Routing suggestions
//
// Backend exposes POST /api/routing/suggest → {suggestions:[... per hotspot]}.
// The UI asks for one suggestion at a time, so we fetch-all and index by
// hotspot_id. We carry hotspot_id + truck_id on the returned object so approve
// (which is hotspot-keyed and needs a truck) can work without another lookup.
// --------------------------------------------------------------------
const SCENARIO_TITLE = {
  'SC-01': 'Keep fixed route',
  'SC-02': 'Insert as next stop',
  'SC-03': 'Reassign to a closer truck',
  'SC-04': 'Manual decision required',
  'SC-05': 'Multiple hotspots — assign greedily',
  'SC-06': 'Truck near capacity',
  'SC-07': 'Watching — not enough signal yet',
};

async function fetchSuggestionsIndexed() {
  const d = await http('POST', '/api/routing/suggest');
  const byHotspot = {};
  for (const s of d.suggestions || []) byHotspot[s.hotspot_id] = s;
  return byHotspot;
}

export async function getSuggestion(hotspotId) {
  if (USE_MOCK) return mock.getSuggestion(hotspotId);
  const idx = await fetchSuggestionsIndexed();
  // hotspotId arrives as a string from React state; backend keys are ints.
  const raw = idx[hotspotId] ?? idx[Number(hotspotId)];
  if (!raw) return null;

  let truck = null;
  if (raw.truck_id != null) {
    const trucks = await listTrucks();
    truck = trucks.find((t) => String(t.id) === String(raw.truck_id)) || null;
  }
  return {
    // synthesize the id the UI uses; carry routing keys for approve/reject
    id: `sg-${raw.hotspot_id}`,
    hotspot_id: raw.hotspot_id,
    truck_id: raw.truck_id,
    scenario_id: raw.scenario,
    title: SCENARIO_TITLE[raw.scenario] || raw.scenario,
    description: raw.action ? `Suggested action: ${raw.action.replace(/_/g, ' ')}.` : '',
    detour_minutes: raw.detour_min ?? 0,
    truck_eta_minutes: raw.detour_min ?? 0, // straight-line proxy; no separate ETA in MVP
    status: 'pending',
    truck,
  };
}

export function approveSuggestion(suggestionId, ctx) {
  if (USE_MOCK) return mock.approveSuggestion(suggestionId);
  const hotspotId = ctx?.hotspot_id ?? String(suggestionId).replace(/^sg-/, '');
  const q = new URLSearchParams();
  if (ctx?.truck_id != null) q.set('truck_id', ctx.truck_id);
  if (ctx?.scenario_id)     q.set('scenario', ctx.scenario_id);
  if (ctx?.action)          q.set('action', ctx.action);
  return http('POST', `/api/routing/approve/${hotspotId}?${q}`).then(() => ({ status: 'approved' }));
}
export function rejectSuggestion(suggestionId, ctx) {
  if (USE_MOCK) return mock.rejectSuggestion(suggestionId);
  const hotspotId = ctx?.hotspot_id ?? String(suggestionId).replace(/^sg-/, '');
  return http('POST', `/api/routing/reject/${hotspotId}`).then(() => ({ status: 'rejected' }));
}

// --------------------------------------------------------------------
// Tasks (driver)
// --------------------------------------------------------------------
export function listTasks(truckId) {
  if (USE_MOCK) return mock.listTasks(truckId);
  return http('GET', `/api/tasks/driver/${truckId}`).then((d) => (d.tasks || []).map(adaptTask));
}
export function getShiftSummary(truckId) {
  if (USE_MOCK) return mock.getShiftSummary ? mock.getShiftSummary(truckId) : null;
  return http('GET', `/api/tasks/driver/${truckId}/shift`);
}
export function patchTask(taskId, payload) {
  if (USE_MOCK) return mock.patchTask(taskId, payload);
  const body = { status: payload.status };
  if (payload.weight_collected_kg != null) {
    body.weight_collected_kg = Number(payload.weight_collected_kg);
  }
  return http('PATCH', `/api/tasks/${taskId}`, body);
}

export function updateTruckLocation(truckId, lat, lng) {
  if (USE_MOCK) return Promise.resolve();
  return http('PATCH', `/api/trucks/${truckId}/location?lat=${lat}&lng=${lng}`);
}

// --------------------------------------------------------------------
// Reports (resident)
// --------------------------------------------------------------------
export function createReport(payload) {
  if (USE_MOCK) return mock.createReport(payload);
  // Backend expects multipart form fields, integer waste_point_id, DB enum.
  const form = new FormData();
  form.append('waste_point_id', String(payload.waste_point_id ?? payload.bin_id));
  form.append('issue_type', ISSUE_TO_API[payload.issue_type] || payload.issue_type);
  if (payload.description) form.append('description', payload.description);
  if (payload.imageFile) form.append('image', payload.imageFile);
  return http('POST', '/api/reports', form, true).then((d) => {
    const report = d.report || d;
    return {
      id: report.id,
      bin_id: payload.bin_id,
      bin_name: payload.bin_name,
      address: payload.address,
      issue_type: payload.issue_type,
      status: d.hotspot ? 'scored' : 'received',
    };
  });
}
export function getReportStatus(reportId) {
  if (USE_MOCK) return mock.getReportStatus(reportId);
  // strip any "RPT-" prefix the UI might pass; backend keys are integers
  const id = String(reportId).replace(/^RPT-/i, '');
  return http('GET', `/api/reports/${id}`).then((r) => ({ ...r, issue_type: adaptIssue(r.issue_type) }));
}
export function getBinByQr(binId) {
  if (USE_MOCK) return mock.getBinByQr(binId);
  return http('GET', `/api/bins/${binId}`);
}
// --------------------------------------------------------------------
// Admin
// --------------------------------------------------------------------
export function adminListWastePoints() {
  if (USE_MOCK) return Promise.resolve({ waste_points: [] });
  return http('GET', '/api/admin/waste-points');
}
export function adminListManagers() {
  if (USE_MOCK) return mock.adminListManagers();
  return http('GET', '/api/admin/managers');
}
export function adminCreateManager(body) {
  if (USE_MOCK) return mock.adminCreateManager(body);
  return http('POST', '/api/admin/managers', body);
}
export function adminDeleteManager(userId) {
  if (USE_MOCK) return mock.adminDeleteManager(userId);
  return http('DELETE', `/api/admin/managers/${userId}`);
}
export function adminEscalate(hotspotId, reason) {
  return http('POST', `/api/admin/hotspots/${hotspotId}/escalate${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`);
}
export function adminCreateEmergency(wastePointId, { reason, issueType } = {}) {
  let url = `/api/admin/hotspots/new-emergency?waste_point_id=${wastePointId}`;
  if (reason) url += `&reason=${encodeURIComponent(reason)}`;
  if (issueType) url += `&issue_type=${encodeURIComponent(issueType)}`;
  return http('POST', url);
}

export function listZones() {
  if (USE_MOCK) return mock.listZones();
  return http('GET', '/api/zones');
}

export function listRoutes() {
  if (USE_MOCK) return mock.listRoutes();
  return http('GET', '/api/routes');
}

export function listWastePoints() {
  if (USE_MOCK) return mock.listWastePoints();
  return http('GET', '/api/bins').then((d) => d.waste_points || []);
}

// --------------------------------------------------------------------
// Dashboard KPIs
// --------------------------------------------------------------------
export function getDashboardKPIs() {
  if (USE_MOCK) return mock.getDashboardKPIs();
  return http('GET', '/api/dashboard/kpis');
}

export function getHotspotAreas() {
  if (USE_MOCK) return mock.getHotspotAreas ? mock.getHotspotAreas() : Promise.resolve({ areas: [] });
  return http('GET', '/api/dashboard/hotspot-areas');
}

// CSV export (F-DASH-03). Fetches with auth header then triggers a browser
// download. `start`/`end` are optional ISO dates (YYYY-MM-DD).
export async function exportCsv(start, end) {
  if (USE_MOCK) {
    // Minimal client-side CSV from mock hotspots so the button works offline.
    const rows = await mock.listHotspots();
    const header = 'hotspot_id,location,severity,priority_score\n';
    const body = rows
      .map((h) => `${h.id},"${h.name}",${h.severity},${h.priority_score}`)
      .join('\n');
    triggerDownload(new Blob([header + body], { type: 'text/csv' }), 'hotspots_mock.csv');
    return;
  }
  const qs = new URLSearchParams();
  if (start) qs.set('start', start);
  if (end) qs.set('end', end);
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api/dashboard/export?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed → ${res.status}`);
  const blob = await res.blob();
  triggerDownload(blob, `hotspots_${start || 'all'}_${end || 'all'}.csv`);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --------------------------------------------------------------------
// Auth (driver / dispatcher / admin)
// --------------------------------------------------------------------
export async function register(username, password, role = 'driver') {
  if (USE_MOCK) {
    setToken('mock-token');
    localStorage.setItem('wh_role', role);
    localStorage.setItem('wh_truck_id', 'tr-B');
    return { token: 'mock-token', role, truck_id: 'tr-B' };
  }
  const res = await http('POST', '/api/auth/register', { username, password, role });
  if (res?.token) {
    setToken(res.token);
    localStorage.setItem('wh_role', res.role || '');
    localStorage.setItem('wh_truck_id', res.truck_id != null ? String(res.truck_id) : '');
  }
  return res;
}

export async function login(username, password) {
  if (USE_MOCK) {
    const res = await mock.mockLogin(username, password);
    setToken(res.token);
    localStorage.setItem('wh_role', res.role || '');
    localStorage.setItem('wh_truck_id', res.truck_id != null ? String(res.truck_id) : '');
    return res;
  }
  const res = await http('POST', '/api/auth/login', { username, password });
  if (res?.token) {
    setToken(res.token);
    localStorage.setItem('wh_role', res.role || '');
    localStorage.setItem('wh_truck_id', res.truck_id != null ? String(res.truck_id) : '');
  }
  return res;
}
export function logout() {
  setToken(null);
  localStorage.removeItem('wh_role');
  localStorage.removeItem('wh_truck_id');
}

export const META = { BASE_URL, USE_MOCK };
