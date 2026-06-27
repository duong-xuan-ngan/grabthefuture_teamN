// Centralised API fetch helpers — shared across pages

const BASE = '/api';

function getToken() {
  return localStorage.getItem('wh_token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────
export async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(res);
}

// ── Hotspots ──────────────────────────────────────────────────────────────
export async function fetchHotspots() {
  const res = await fetch(`${BASE}/hotspots`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function fetchHotspot(id) {
  const res = await fetch(`${BASE}/hotspots/${id}`, { headers: authHeaders() });
  return handleResponse(res);
}

// ── Trucks ────────────────────────────────────────────────────────────────
export async function fetchTrucks() {
  const res = await fetch(`${BASE}/trucks`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function updateTruckLoad(truckId, weight_kg) {
  const res = await fetch(`${BASE}/trucks/${truckId}/load`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ weight_kg }),
  });
  return handleResponse(res);
}

// ── Tasks ─────────────────────────────────────────────────────────────────
export async function fetchTasks(truckId) {
  const res = await fetch(`${BASE}/tasks/${truckId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function updateTask(taskId, payload) {
  // payload: { status: 'done'|'unreachable', weight_collected_kg?: number }
  const res = await fetch(`${BASE}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// ── Routing ───────────────────────────────────────────────────────────────
export async function approveSuggestion(suggestionId) {
  const res = await fetch(`${BASE}/routing/approve/${suggestionId}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function rejectSuggestion(suggestionId) {
  const res = await fetch(`${BASE}/routing/reject/${suggestionId}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export async function fetchKpis() {
  const res = await fetch(`${BASE}/dashboard/kpis`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function fetchRepeatOffenders() {
  const res = await fetch(`${BASE}/dashboard/repeat-offenders`, { headers: authHeaders() });
  return handleResponse(res);
}

// ── Reports (resident — unauthenticated) ─────────────────────────────────
export async function submitReport(formData) {
  // formData is a FormData object (supports photo upload)
  const res = await fetch(`${BASE}/reports`, {
    method: 'POST',
    body: formData, // no Content-Type header — browser sets multipart boundary
  });
  return handleResponse(res);
}
