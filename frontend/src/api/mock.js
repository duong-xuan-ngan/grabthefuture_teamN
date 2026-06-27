// In-process mock data layer. Mirrors the shared data model in the
// Technical Requirements doc so swapping VITE_USE_MOCK=false should be
// a drop-in once the backend is up.

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

// --------------------------------------------------------------------
// Seed data — District 1, Ho Chi Minh City
// --------------------------------------------------------------------
const CENTER = { lat: 10.7765, lng: 106.7019 };

const wastePoints = [
  { id: 'wp-001', name: 'Bến Thành market — gate B', lat: 10.7763, lng: 106.7032, area_type: 'market', category: 'market_commercial', estimated_weight_kg: 150 },
  { id: 'wp-002', name: 'Nguyễn Huệ pedestrian street', lat: 10.7782, lng: 106.7045, area_type: 'plaza', category: 'large_public', estimated_weight_kg: 115 },
  { id: 'wp-003', name: 'Lê Thánh Tôn — apartment C', lat: 10.7748, lng: 106.6985, area_type: 'residential', category: 'medium_residential', estimated_weight_kg: 75 },
  { id: 'wp-004', name: 'Đồng Khởi 12', lat: 10.7775, lng: 106.7012, area_type: 'commercial', category: 'small_residential', estimated_weight_kg: 30 },
  { id: 'wp-005', name: 'Pasteur park bench area', lat: 10.7790, lng: 106.6995, area_type: 'park', category: 'large_public', estimated_weight_kg: 115 },
  { id: 'wp-006', name: 'Hàm Nghi 88', lat: 10.7755, lng: 106.6985, area_type: 'commercial', category: 'small_residential', estimated_weight_kg: 30 },
  { id: 'wp-007', name: 'Tôn Đức Thắng riverside', lat: 10.7768, lng: 106.7045, area_type: 'park', category: 'large_public', estimated_weight_kg: 115 },
  { id: 'wp-008', name: 'Lê Lợi alley 7', lat: 10.7785, lng: 106.7045, area_type: 'alley', category: 'small_residential', estimated_weight_kg: 30 },
];

const trucks = [
  { id: 'tr-A', code: 'A', name: 'Truck A · Hino 500', driver: 'Long', lat: 10.7770, lng: 106.7020, status: 'on_route', current_route_id: 'rt-1', max_capacity_kg: 3000, current_load_kg: 1840, stops_left: 7 },
  { id: 'tr-B', code: 'B', name: 'Truck B · Hino 300', driver: 'Minh', lat: 10.7770, lng: 106.7010, status: 'on_route', current_route_id: 'rt-2', max_capacity_kg: 2800, current_load_kg: 2210, stops_left: 4 },
  { id: 'tr-C', code: 'C', name: 'Truck C · Isuzu N', driver: 'Tuấn', lat: 10.7795, lng: 106.7050, status: 'on_route', current_route_id: 'rt-3', max_capacity_kg: 2500, current_load_kg: 920, stops_left: 9 },
];

const routes = {
  'rt-1': [
    [10.7795, 106.6985], [10.7785, 106.7005], [10.7770, 106.7020],
    [10.7755, 106.7035], [10.7740, 106.7050], [10.7725, 106.7060],
  ],
  'rt-2': [
    [10.7745, 106.6970], [10.7758, 106.6990], [10.7770, 106.7010],
    [10.7780, 106.7035], [10.7790, 106.7060],
  ],
  'rt-3': [
    [10.7805, 106.6995], [10.7795, 106.7020], [10.7795, 106.7050],
    [10.7790, 106.7075],
  ],
};

const now = Date.now();
const minsAgo = (m) => new Date(now - m * 60_000).toISOString();

const hotspots = [
  {
    id: 'h1', waste_point_id: 'wp-001', name: 'Bến Thành market — gate B',
    address: '123 Lê Lợi · District 1', lat: 10.7763, lng: 106.7032,
    issue_type: 'overflow', report_count: 4, photos: ['p1', 'p2', 'p3'],
    severity: 'high', priority_score: 86, status: 'open',
    estimated_weight_kg: 150,
    created_at: minsAgo(18),
  },
  {
    id: 'h2', waste_point_id: 'wp-002', name: 'Nguyễn Huệ pedestrian street',
    address: 'Nguyễn Huệ · District 1', lat: 10.7782, lng: 106.7045,
    issue_type: 'bulky', report_count: 2, photos: ['p4'],
    severity: 'mid', priority_score: 62, status: 'open',
    estimated_weight_kg: 115,
    created_at: minsAgo(34),
  },
  {
    id: 'h3', waste_point_id: 'wp-003', name: 'Lê Thánh Tôn — apartment C',
    address: '45 Lê Thánh Tôn · District 1', lat: 10.7748, lng: 106.6985,
    issue_type: 'near_full', report_count: 1, photos: [],
    severity: 'low', priority_score: 34, status: 'open',
    estimated_weight_kg: 75,
    created_at: minsAgo(6),
  },
];

const suggestions = {
  h1: {
    id: 'sg-h1', hotspot_id: 'h1', scenario_id: 'SC-02',
    title: 'Insert as next stop for Truck B',
    description: "High priority hotspot 1.2 km from Truck B's current position. Detour is cheap and capacity feasible.",
    truck_id: 'tr-B', detour_minutes: 6, truck_eta_minutes: 4, status: 'pending',
  },
  h2: {
    id: 'sg-h2', hotspot_id: 'h2', scenario_id: 'SC-03',
    title: 'Reassign to Truck C',
    description: 'Truck A on the existing route is 22 min away. Truck C is closer and has more remaining capacity.',
    truck_id: 'tr-C', detour_minutes: 11, truck_eta_minutes: 8, status: 'pending',
  },
  h3: {
    id: 'sg-h3', hotspot_id: 'h3', scenario_id: 'SC-01',
    title: 'Keep fixed route — Truck A arriving in 19 min',
    description: 'Low priority, scheduled truck is already on its way. No reorder needed.',
    truck_id: 'tr-A', detour_minutes: 0, truck_eta_minutes: 19, status: 'pending',
  },
};

// Tasks per truck — current + upcoming
const tasks = {
  'tr-B': [
    { id: 't-1', hotspot_id: 'h1', waste_point_id: 'wp-001', truck_id: 'tr-B',
      name: 'Bến Thành market — gate B', address: '123 Lê Lợi',
      issue_type: 'overflow', priority_score: 86, photos: 3,
      estimated_weight_kg: 150, status: 'active', sequence: 1,
      eta_minutes: 4, distance_km: 1.2, category: 'market_commercial' },
    { id: 't-2', hotspot_id: null, waste_point_id: 'wp-003', truck_id: 'tr-B',
      name: 'Lê Thánh Tôn — apartment C', address: 'Alley bin',
      issue_type: null, priority_score: null, photos: 0,
      estimated_weight_kg: 75, status: 'pending', sequence: 2,
      eta_minutes: 9, distance_km: 0.8, category: 'medium_residential' },
    { id: 't-3', hotspot_id: null, waste_point_id: 'wp-005', truck_id: 'tr-B',
      name: 'Pasteur park bench area', address: 'Park entrance',
      issue_type: null, priority_score: null, photos: 0,
      estimated_weight_kg: 115, status: 'pending', sequence: 3,
      eta_minutes: 18, distance_km: 1.6, category: 'large_public' },
    { id: 't-4', hotspot_id: null, waste_point_id: 'wp-006', truck_id: 'tr-B',
      name: 'Hàm Nghi 88', address: 'Streetside',
      issue_type: null, priority_score: null, photos: 0,
      estimated_weight_kg: 30, status: 'pending', sequence: 4,
      eta_minutes: 26, distance_km: 2.1, category: 'small_residential' },
  ],
};

const reports = {
  'RPT-8142': {
    id: 'RPT-8142', waste_point_id: 'wp-001', bin_id: 'M-042',
    bin_name: 'Bến Thành market — gate B', address: '123 Lê Lợi · District 1',
    issue_type: 'overflow', description: '',
    created_at: minsAgo(18),
    timeline: [
      { step: 'received', label: 'Report received', at: minsAgo(18) },
      { step: 'clustered', label: 'Clustered with 3 other reports', at: minsAgo(17) },
      { step: 'scored', label: 'Priority score 86 (high)', at: minsAgo(17) },
      { step: 'assigned', label: 'Assigned to Truck B', at: minsAgo(14) },
      { step: 'in_transit', label: 'Truck B in transit (ETA 4 min)', at: minsAgo(2) },
    ],
    status: 'in_transit',
    assigned_truck: 'Truck B · Minh',
  },
};

const kpi = {
  opened_today: 14, resolved: 11, resolved_pct: 79,
  avg_response_minutes: 22,
  open_by_severity: { high: 1, mid: 1, low: 1 },
  fleet_load_pct: 60, fleet_load_kg: 4970,
};

// --------------------------------------------------------------------
// Public mock handlers
// --------------------------------------------------------------------

export async function listHotspots() {
  await delay();
  return hotspots.map((h) => ({ ...h }));
}

export async function getHotspot(id) {
  await delay();
  return hotspots.find((h) => h.id === id) || null;
}

export async function listTrucks() {
  await delay();
  return trucks.map((t) => ({ ...t, route: routes[t.current_route_id] }));
}

export async function getSuggestion(hotspotId) {
  await delay();
  const s = suggestions[hotspotId];
  if (!s) return null;
  const truck = trucks.find((t) => t.id === s.truck_id);
  return { ...s, truck };
}

export async function approveSuggestion(suggestionId) {
  await delay(400);
  const s = Object.values(suggestions).find((x) => x.id === suggestionId);
  if (s) s.status = 'approved';
  return { ...s };
}

export async function rejectSuggestion(suggestionId) {
  await delay(400);
  const s = Object.values(suggestions).find((x) => x.id === suggestionId);
  if (s) s.status = 'rejected';
  return { ...s };
}

export async function listTasks(truckId) {
  await delay();
  return (tasks[truckId] || []).map((t) => ({ ...t }));
}

export async function patchTask(taskId, payload) {
  await delay(350);
  const truckId = Object.keys(tasks).find((k) =>
    tasks[k].some((t) => t.id === taskId),
  );
  if (!truckId) return null;
  const list = tasks[truckId];
  const idx = list.findIndex((t) => t.id === taskId);
  if (idx === -1) return null;
  const next = { ...list[idx], ...payload };

  // If done, advance sequence: next pending becomes active.
  if (payload.status === 'done' || payload.status === 'unreachable') {
    list[idx] = next;
    const upcoming = list.find((t) => t.status === 'pending');
    if (upcoming) upcoming.status = 'active';

    // Bump truck load if weight provided
    if (payload.weight_collected_kg) {
      const tr = trucks.find((t) => t.id === truckId);
      if (tr) tr.current_load_kg += Number(payload.weight_collected_kg) || 0;
    }
  } else {
    list[idx] = next;
  }
  return next;
}

let reportCounter = 8143;
export async function createReport(payload) {
  await delay(500);
  const id = `RPT-${reportCounter++}`;
  const report = {
    id,
    bin_id: payload.bin_id,
    bin_name: payload.bin_name,
    address: payload.address,
    issue_type: payload.issue_type,
    description: payload.description || '',
    created_at: new Date().toISOString(),
    status: 'received',
    timeline: [
      { step: 'received', label: 'Report received', at: new Date().toISOString() },
    ],
    assigned_truck: null,
  };
  reports[id] = report;
  return report;
}

export async function getReportStatus(reportId) {
  await delay();
  return reports[reportId] || null;
}

export async function getBinByQr(binId) {
  await delay(120);
  // Look up a bin by short ID like "042" → wp-001 (demo: always returns gate B)
  const wp = wastePoints[0];
  return {
    bin_id: binId || 'M-042',
    waste_point_id: wp.id,
    name: wp.name,
    address: '123 Lê Lợi · District 1',
    lat: wp.lat,
    lng: wp.lng,
  };
}

export async function getDashboardKPIs() {
  await delay();
  return { ...kpi };
}

// Map seed (used by MapPanel)
export const seed = {
  center: CENTER,
  wastePoints,
  trucks,
  routes,
  hotspots,
};
