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

async function http(method, path, body, isForm = false) {
  const opts = { method };
  if (body !== undefined) {
    if (isForm) {
      opts.body = body; // FormData — let the browser set the boundary header
    } else {
      opts.headers = { 'Content-Type': 'application/json' };
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
  // ctx = the suggestion object (carries hotspot_id + truck_id)
  const hotspotId = ctx?.hotspot_id ?? String(suggestionId).replace(/^sg-/, '');
  const truckId = ctx?.truck_id;
  const q = truckId != null ? `?truck_id=${truckId}` : '';
  return http('POST', `/api/routing/approve/${hotspotId}${q}`).then(() => ({ status: 'approved' }));
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
export function patchTask(taskId, payload) {
  if (USE_MOCK) return mock.patchTask(taskId, payload);
  // UI may send weight as a number/string; backend wants weight_collected_kg
  const body = { status: payload.status };
  if (payload.weight_collected_kg != null) {
    body.weight_collected_kg = Number(payload.weight_collected_kg);
  }
  return http('PATCH', `/api/tasks/${taskId}`, body);
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
// Dashboard KPIs
// --------------------------------------------------------------------
export function getDashboardKPIs() {
  if (USE_MOCK) return mock.getDashboardKPIs();
  return http('GET', '/api/dashboard/kpis');
}

export const META = { BASE_URL, USE_MOCK };
