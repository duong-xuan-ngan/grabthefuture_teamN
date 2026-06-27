// Thin API client. Reads VITE_API_URL and VITE_USE_MOCK at build time.
// If mock mode is on, calls are routed through ./mock.js with realistic
// async timing; otherwise we hit the real backend over fetch.

import * as mock from './mock.js';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === 'true' || !BASE_URL;

async function http(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// --------------------------------------------------------------------
// Hotspots
// --------------------------------------------------------------------
export function listHotspots() {
  return USE_MOCK ? mock.listHotspots() : http('GET', '/api/hotspots');
}
export function getHotspot(id) {
  return USE_MOCK ? mock.getHotspot(id) : http('GET', `/api/hotspots/${id}`);
}

// --------------------------------------------------------------------
// Trucks
// --------------------------------------------------------------------
export function listTrucks() {
  return USE_MOCK ? mock.listTrucks() : http('GET', '/api/trucks');
}

// --------------------------------------------------------------------
// Routing suggestions
// --------------------------------------------------------------------
export function getSuggestion(hotspotId) {
  return USE_MOCK
    ? mock.getSuggestion(hotspotId)
    : http('GET', `/api/routing/suggestion?hotspotId=${hotspotId}`);
}
export function approveSuggestion(suggestionId) {
  return USE_MOCK
    ? mock.approveSuggestion(suggestionId)
    : http('POST', `/api/routing/suggestions/${suggestionId}/approve`);
}
export function rejectSuggestion(suggestionId) {
  return USE_MOCK
    ? mock.rejectSuggestion(suggestionId)
    : http('POST', `/api/routing/suggestions/${suggestionId}/reject`);
}

// --------------------------------------------------------------------
// Tasks (driver)
// --------------------------------------------------------------------
export function listTasks(truckId) {
  return USE_MOCK
    ? mock.listTasks(truckId)
    : http('GET', `/api/tasks?truckId=${truckId}`);
}
export function patchTask(taskId, payload) {
  return USE_MOCK
    ? mock.patchTask(taskId, payload)
    : http('PATCH', `/api/tasks/${taskId}`, payload);
}

// --------------------------------------------------------------------
// Reports (resident)
// --------------------------------------------------------------------
export function createReport(payload) {
  return USE_MOCK
    ? mock.createReport(payload)
    : http('POST', '/api/reports', payload);
}
export function getReportStatus(reportId) {
  return USE_MOCK
    ? mock.getReportStatus(reportId)
    : http('GET', `/api/reports/${reportId}`);
}
export function getBinByQr(binId) {
  return USE_MOCK
    ? mock.getBinByQr(binId)
    : http('GET', `/api/bins/${binId}`);
}

// --------------------------------------------------------------------
// Dashboard KPIs
// --------------------------------------------------------------------
export function getDashboardKPIs() {
  return USE_MOCK
    ? mock.getDashboardKPIs()
    : http('GET', '/api/dashboard/kpis');
}

export const META = { BASE_URL, USE_MOCK };
