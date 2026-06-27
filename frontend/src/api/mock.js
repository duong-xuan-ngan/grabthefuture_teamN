// Mock data layer — minimal stubs so the UI doesn't crash in mock mode.
// All real data comes from the backend (VITE_USE_MOCK=false).

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

// Mock manager accounts — mirrors seed.py MANAGERS list
const MOCK_MANAGERS = {
  'manager.benthanh': { password: 'demo123', waste_point_id: 1, waste_point_name: 'Bến Thành Market Bin A' },
  'manager.buivien':  { password: 'demo123', waste_point_id: 6, waste_point_name: 'Bùi Viện Food Street A' },
  'manager.taodан':   { password: 'demo123', waste_point_id: 8, waste_point_name: 'Tao Đàn Park Bin A' },
  'manager.tanbinh':  { password: 'demo123', waste_point_id: 14, waste_point_name: 'Chợ Tân Bình Bin A' },
};

// All mock accounts (for login)
const MOCK_ACCOUNTS = {
  admin:       { password: 'demo123', role: 'admin',      waste_point_id: null, truck_id: null },
  dispatcher:  { password: 'demo123', role: 'dispatcher', waste_point_id: null, truck_id: null },
  driver1:     { password: 'demo123', role: 'driver',     waste_point_id: null, truck_id: 'tr-B' },
  driver2:     { password: 'demo123', role: 'driver',     waste_point_id: null, truck_id: 'tr-C' },
  ...Object.fromEntries(
    Object.entries(MOCK_MANAGERS).map(([u, d]) => [u, { password: d.password, role: 'manager', waste_point_id: d.waste_point_id, truck_id: null }])
  ),
};

export async function mockLogin(username, password) {
  await delay(300);
  const acc = MOCK_ACCOUNTS[username];
  if (!acc || acc.password !== password) throw new Error('Invalid credentials');
  return { token: 'mock-token', role: acc.role, waste_point_id: acc.waste_point_id, truck_id: acc.truck_id };
}

export async function adminListManagers() {
  await delay();
  return {
    managers: Object.entries(MOCK_MANAGERS).map(([username, d], i) => ({
      id: 100 + i,
      username,
      role: 'manager',
      waste_point_id: d.waste_point_id,
      waste_point_name: d.waste_point_name,
    })),
  };
}

export async function adminCreateManager({ username, password, waste_point_id }) {
  await delay(300);
  if (MOCK_ACCOUNTS[username]) throw new Error('Username already taken');
  const wp_name = Object.values(MOCK_MANAGERS).find(m => m.waste_point_id === waste_point_id)?.waste_point_name || `Waste Point ${waste_point_id}`;
  MOCK_MANAGERS[username] = { password, waste_point_id, waste_point_name: wp_name };
  MOCK_ACCOUNTS[username] = { password, role: 'manager', waste_point_id, truck_id: null };
  return { id: Date.now(), username, role: 'manager', waste_point_id, waste_point_name: wp_name };
}

export async function adminDeleteManager(userId) {
  await delay(200);
  // remove by matching index
}

// ── Empty data sets ───────────────────────────────────────────────────────────

export async function listHotspots()      { await delay(); return []; }
export async function getHotspot()        { await delay(); return null; }
export async function listTrucks() {
  await delay();
  return [{ id: 'tr-B', code: 'B', name: 'Truck B · Hino 300', driver: 'Minh', lat: 10.7770, lng: 106.7020, max_capacity_kg: 2800, current_load_kg: 840, stops_left: 4 }];
}
export async function listWastePoints()   { await delay(); return []; }
export async function listZones()         { await delay(); return { zones: [] }; }
export async function listRoutes() {
  await delay();
  const r1 = [
    [10.7750, 106.6990], [10.7726, 106.6981], [10.7766, 106.6904],
    [10.7782, 106.7045], [10.7775, 106.7012], [10.7768, 106.7045], [10.7750, 106.6990],
  ];
  const r2 = [
    [10.7760, 106.6530], [10.7975, 106.6521], [10.7949, 106.6277],
    [10.7981, 106.6810], [10.7762, 106.6685], [10.7760, 106.6530],
  ];
  return { routes: [
    { id: 1, truck_id: 1, name: 'Alpha loop', is_active: true, waypoints: r1, geometry: r1 },
    { id: 2, truck_id: 2, name: 'Beta loop', is_active: true, waypoints: r2, geometry: r2 },
  ]};
}
export async function getDashboardKPIs()  { await delay(); return { opened_today: 0, resolved: 0, resolved_pct: 0, avg_response_minutes: 0, open_by_severity: { high: 0, mid: 0, low: 0 }, fleet_load_pct: 0, fleet_load_kg: 0, suggestion_breakdown: {} }; }
export async function getHotspotAreas()  { await delay(); return { areas: [] }; }
export async function getShiftSummary() {
  await delay();
  const done = _tasks.filter(t => t.status === 'done');
  return { stops_done: done.length, stops_total: _tasks.length, weight_collected_kg: done.reduce((s,t) => s + (t.weight_collected_kg||0), 0), shift_minutes: 95, avg_per_stop_minutes: 12, current_load_kg: 840, max_capacity_kg: 2800, recent_stops: done.map(t => ({ id: t.id, name: t.name, weight_collected_kg: t.weight_collected_kg })) };
}

export async function getSuggestion()    { await delay(); return null; }
export async function approveSuggestion(){ await delay(); return { status: 'approved' }; }
export async function rejectSuggestion() { await delay(); return { status: 'rejected' }; }

const _mockTasks = [
  { id: 't1', sequence: 1, name: 'Bến Thành Market — Gate B',   status: 'done',    issue_type: 'overflow',  priority_score: 86, estimated_weight_kg: 150, distance_km: null, eta_minutes: null, lat: 10.7763, lng: 106.7032, truck_lat: 10.7770, truck_lng: 106.7020, weight_collected_kg: 148 },
  { id: 't2', sequence: 2, name: 'Nguyễn Huệ Pedestrian St',    status: 'active',  issue_type: 'bulky',     priority_score: 62, estimated_weight_kg: 115, distance_km: 0.4, eta_minutes: 2,  lat: 10.7782, lng: 106.7045, truck_lat: 10.7770, truck_lng: 106.7020 },
  { id: 't3', sequence: 3, name: 'Lê Thánh Tôn Apartment C',    status: 'pending', issue_type: null,        priority_score: null, estimated_weight_kg: 75, distance_km: 0.9, eta_minutes: 5,  lat: 10.7748, lng: 106.6985, truck_lat: 10.7770, truck_lng: 106.7020 },
  { id: 't4', sequence: 4, name: 'Pasteur Park Bench Area',      status: 'pending', issue_type: null,        priority_score: null, estimated_weight_kg: 115, distance_km: 1.3, eta_minutes: 8, lat: 10.7790, lng: 106.6995, truck_lat: 10.7770, truck_lng: 106.7020 },
  { id: 't5', sequence: 5, name: 'Hàm Nghi 88',                  status: 'pending', issue_type: null,        priority_score: null, estimated_weight_kg: 30, distance_km: 1.8, eta_minutes: 11, lat: 10.7755, lng: 106.6985, truck_lat: 10.7770, truck_lng: 106.7020 },
];

let _tasks = _mockTasks.map(t => ({ ...t }));

export async function listTasks() { await delay(); return _tasks.map(t => ({ ...t })); }
export async function patchTask(taskId, payload) {
  await delay();
  const t = _tasks.find(x => x.id === taskId);
  if (t) Object.assign(t, payload);
  return { id: taskId, ...payload };
}

export async function createReport(payload) {
  await delay();
  return { id: Math.floor(Math.random() * 9000) + 1000, status: 'received', ...payload };
}
export async function getReportStatus()  { await delay(); return null; }
export async function getBinByQr(binId)  { await delay(); return { bin_id: binId, waste_point_id: null, name: `Bin ${binId}`, address: '', lat: null, lng: null }; }

export async function exportCsv() {
  await delay();
  const csv = 'hotspot_id,location,severity,priority_score\n(no data)\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'hotspots_mock.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
