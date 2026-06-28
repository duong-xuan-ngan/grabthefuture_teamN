// ═══════════════════════════════════════════════════════════════════════════
// WasteHotspot Frontend Mock
//
// Mirrors backend run_migrate.py exactly:
//  • 30 waste points — compact District 1 / Q3 / Bình Thạnh + Phú Nhuận
//  • 3 trucks with realistic routes (max loop ~3 km each)
//  • H3 cells computed at runtime from lat/lng via h3-js — never wrong
//  • Zone Voronoi: nearest centroid, no grid_disk expansion
// ═══════════════════════════════════════════════════════════════════════════

import { latLngToCell } from 'h3-js';

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const H3_RES = 8;
const h3cell = (lat, lng) => latLngToCell(lat, lng, H3_RES);

// ────────────────────────────────────────────────────────────────────────────
// WASTE POINTS — same order + IDs as run_migrate.py WASTE_POINTS_DATA
// h3 computed at load time so it always matches what the backend stores.
// ────────────────────────────────────────────────────────────────────────────
const _WP_RAW = [
  // ── TRUCK ALPHA ZONE — District 1 north ──────────────────────────────────
  // Cluster A1: Bến Thành (stop 1)
  { id: 1,  name: 'Bến Thành Market Bin A',         lat: 10.7726, lng: 106.6981, area_type:'market',    cat:'market_commercial',  kg:150, status:'overflow',  mgr:'manager.benthanh' },
  { id: 2,  name: 'Bến Thành Market Bin B',         lat: 10.7729, lng: 106.6985, area_type:'market',    cat:'market_commercial',  kg:150, status:'near_full', mgr:'manager.benthanh' },
  { id: 3,  name: 'Bến Thành Market Bin C',         lat: 10.7723, lng: 106.6977, area_type:'market',    cat:'market_commercial',  kg:150, status:'normal',    mgr:'manager.benthanh' },
  // Cluster A2: Lê Lợi strip (stop 2)
  { id: 4,  name: 'Lê Lợi Blvd Bin A',              lat: 10.7735, lng: 106.6985, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  { id: 5,  name: 'Lê Lợi Blvd Bin B',              lat: 10.7733, lng: 106.6990, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  { id: 6,  name: 'Nguyễn Thái Học Bin',            lat: 10.7738, lng: 106.6995, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  // Cluster A3: Đồng Khởi (stop 3)
  { id: 7,  name: 'Đồng Khởi St Bin A',             lat: 10.7775, lng: 106.7012, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  { id: 8,  name: 'Đồng Khởi St Bin B',             lat: 10.7778, lng: 106.7016, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  { id: 9,  name: 'Hàm Nghi St Bin',                lat: 10.7758, lng: 106.7018, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  // Cluster A4: Nguyễn Huệ + Riverside (stop 4)
  { id: 10, name: 'Nguyễn Huệ Blvd Bin A',          lat: 10.7782, lng: 106.7045, area_type:'street',    cat:'small_residential',  kg: 30, status:'near_full' },
  { id: 11, name: 'Nguyễn Huệ Blvd Bin B',          lat: 10.7786, lng: 106.7048, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  { id: 12, name: 'Tôn Đức Thắng Riverside Bin A',  lat: 10.7768, lng: 106.7045, area_type:'park',      cat:'large_public',       kg:115, status:'near_full', mgr:'manager.riverside' },
  { id: 13, name: 'Tôn Đức Thắng Riverside Bin B',  lat: 10.7772, lng: 106.7050, area_type:'park',      cat:'large_public',       kg:115, status:'normal',    mgr:'manager.riverside' },
  // Cluster A5: Lý Tự Trọng + alleys (stop 5)
  { id: 14, name: 'Lý Tự Trọng Apt Bin A',          lat: 10.7798, lng: 106.7022, area_type:'apartment', cat:'medium_residential', kg: 75, status:'normal',    mgr:'manager.lytutrong' },
  { id: 15, name: 'Lý Tự Trọng Apt Bin B',          lat: 10.7802, lng: 106.7026, area_type:'apartment', cat:'medium_residential', kg: 75, status:'near_full', mgr:'manager.lytutrong' },
  { id: 16, name: 'Dist 1 Alley Bin 01',             lat: 10.7793, lng: 106.7008, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },

  // ── TRUCK BETA ZONE — District 1 south + Q3 ──────────────────────────────
  // Cluster B1: Tao Đàn park (stop 1)
  { id: 17, name: 'Tao Đàn Park Bin A',             lat: 10.7766, lng: 106.6904, area_type:'park',      cat:'large_public',       kg:115, status:'overflow',  mgr:'manager.taodan' },
  { id: 18, name: 'Tao Đàn Park Bin B',             lat: 10.7760, lng: 106.6908, area_type:'park',      cat:'large_public',       kg:115, status:'near_full', mgr:'manager.taodan' },
  { id: 19, name: 'Tao Đàn Park Bin C',             lat: 10.7770, lng: 106.6912, area_type:'park',      cat:'large_public',       kg:115, status:'normal',    mgr:'manager.taodan' },
  // Cluster B2: Bùi Viện / Phạm Ngũ Lão (stop 2)
  { id: 20, name: 'Bùi Viện Food Street Bin A',     lat: 10.7665, lng: 106.6932, area_type:'market',    cat:'market_commercial',  kg:150, status:'full',      mgr:'manager.buivien' },
  { id: 21, name: 'Bùi Viện Food Street Bin B',     lat: 10.7668, lng: 106.6936, area_type:'market',    cat:'market_commercial',  kg:150, status:'near_full', mgr:'manager.buivien' },
  { id: 22, name: 'Phạm Ngũ Lão Hostel Bin',        lat: 10.7682, lng: 106.6958, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  // Cluster B3: Cách Mạng Tháng 8 / Q3 (stop 3)
  { id: 23, name: 'Cách Mạng Tháng 8 Bin A',        lat: 10.7820, lng: 106.6880, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  { id: 24, name: 'Cách Mạng Tháng 8 Bin B',        lat: 10.7825, lng: 106.6885, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  { id: 25, name: 'Điện Biên Phủ Bin',              lat: 10.7815, lng: 106.6875, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  // Cluster B4: Lý Chính Thắng (stop 4)
  { id: 26, name: 'Lý Chính Thắng St Bin A',        lat: 10.7870, lng: 106.6840, area_type:'street',    cat:'small_residential',  kg: 30, status:'near_full' },
  { id: 27, name: 'Lý Chính Thắng St Bin B',        lat: 10.7875, lng: 106.6845, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },

  // ── TRUCK GAMMA ZONE — Bình Thạnh + Phú Nhuận ────────────────────────────
  // Cluster G1: Đinh Tiên Hoàng / Bạch Đằng (stop 1)
  { id: 28, name: 'Đinh Tiên Hoàng Bin A',          lat: 10.7850, lng: 106.6960, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  { id: 29, name: 'Đinh Tiên Hoàng Bin B',          lat: 10.7855, lng: 106.6965, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  { id: 30, name: 'Bạch Đằng Riverside Bin',        lat: 10.7845, lng: 106.6970, area_type:'park',      cat:'large_public',       kg:115, status:'near_full', mgr:'manager.bachdang' },
  // Cluster G2: Xô Viết Nghệ Tĩnh (stop 2)
  { id: 31, name: 'Xô Viết Nghệ Tĩnh Bin A',        lat: 10.8000, lng: 106.7050, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  { id: 32, name: 'Xô Viết Nghệ Tĩnh Bin B',        lat: 10.8005, lng: 106.7055, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  // Cluster G3: Phan Đình Phùng / Phú Nhuận (stop 3)
  { id: 33, name: 'Phú Nhuận Phan Đình Phùng Bin A',lat: 10.7981, lng: 106.6810, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  { id: 34, name: 'Phú Nhuận Phan Đình Phùng Bin B',lat: 10.7984, lng: 106.6814, area_type:'street',    cat:'small_residential',  kg: 30, status:'normal' },
  { id: 35, name: 'Phú Nhuận Market Bin',            lat: 10.7987, lng: 106.6805, area_type:'market',    cat:'market_commercial',  kg:150, status:'near_full', mgr:'manager.phunhuan' },
];

// Enrich with computed h3 cell
const WASTE_POINTS = _WP_RAW.map(wp => ({ ...wp, h3: h3cell(wp.lat, wp.lng) }));

// ────────────────────────────────────────────────────────────────────────────
// TRUCKS — same positions + routes as run_migrate.py TRUCKS_DATA + ROUTES_DATA
// ────────────────────────────────────────────────────────────────────────────
const TRUCKS_DATA = [
  {
    id: 'tr-A', code: 'A', name: 'Truck Alpha · Hino 500', driver: 'Long',
    lat: 10.7733, lng: 106.6990,
    max_capacity_kg: 3000, current_load_kg: 1260, stops_left: 5,
    route: [
      [10.7733, 106.6990],
      [10.7728, 106.6984],[10.7726,106.6981],[10.7729,106.6985],[10.7723,106.6977],
      [10.7730, 106.6990],
      [10.7735, 106.6985],[10.7733,106.6990],[10.7738,106.6995],
      [10.7750, 106.7005],[10.7760,106.7010],
      [10.7758, 106.7018],[10.7775,106.7012],[10.7778,106.7016],
      [10.7780, 106.7030],
      [10.7782, 106.7045],[10.7786,106.7048],[10.7768,106.7045],[10.7772,106.7050],
      [10.7790, 106.7038],[10.7795,106.7030],
      [10.7798, 106.7022],[10.7802,106.7026],[10.7793,106.7008],
      [10.7780, 106.7010],[10.7760,106.6998],[10.7743,106.6993],
      [10.7733, 106.6990],
    ],
  },
  {
    id: 'tr-B', code: 'B', name: 'Truck Beta · Hino 300', driver: 'Minh',
    lat: 10.7720, lng: 106.6900,
    max_capacity_kg: 2800, current_load_kg: 1708, stops_left: 4,
    route: [
      [10.7720, 106.6900],
      [10.7748, 106.6905],[10.7760,106.6904],[10.7766,106.6904],[10.7770,106.6908],[10.7760,106.6912],
      [10.7775, 106.6905],[10.7796,106.6888],
      [10.7815, 106.6875],[10.7820,106.6880],[10.7825,106.6885],
      [10.7845, 106.6857],[10.7870,106.6840],[10.7875,106.6845],
      [10.7850, 106.6870],[10.7820,106.6895],[10.7780,106.6910],[10.7755,106.6925],
      [10.7682, 106.6958],[10.7668,106.6936],[10.7665,106.6932],
      [10.7680, 106.6918],[10.7700,106.6910],[10.7720,106.6900],
    ],
  },
  {
    id: 'tr-C', code: 'C', name: 'Truck Gamma · Isuzu NQR', driver: 'Tuấn',
    lat: 10.7848, lng: 106.6958,
    max_capacity_kg: 2500, current_load_kg: 450, stops_left: 3,
    route: [
      [10.7848, 106.6958],
      [10.7850, 106.6960],[10.7855,106.6965],[10.7845,106.6970],
      [10.7870, 106.6985],[10.7900,106.7010],
      [10.7998, 106.7045],[10.8000,106.7050],[10.8005,106.7055],
      [10.7995, 106.6980],[10.7988,106.6870],
      [10.7987, 106.6805],[10.7984,106.6814],[10.7981,106.6810],
      [10.7970, 106.6880],[10.7940,106.6910],[10.7900,106.6935],[10.7868,106.6950],
      [10.7848, 106.6958],
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// HOTSPOTS
// ────────────────────────────────────────────────────────────────────────────
const _ts = Date.now();
const minsAgo = (m) => new Date(_ts - m * 60_000).toISOString();

const HOTSPOTS_DATA = [
  { id:'h1', waste_point_id:1,  name:'Bến Thành Market Bin A',        lat:10.7726, lng:106.6981, h3:h3cell(10.7726,106.6981), issue_type:'overflow',   severity:'high', priority_score:92, report_count:4, status:'active', created_at:minsAgo(18), suggestion:{scenario:'SC-08', truck_id:'tr-A', detour_min:3, action:'zone_preferred'} },
  { id:'h2', waste_point_id:17, name:'Tao Đàn Park Bin A',             lat:10.7766, lng:106.6904, h3:h3cell(10.7766,106.6904), issue_type:'overflow',   severity:'high', priority_score:88, report_count:3, status:'active', created_at:minsAgo(11), suggestion:{scenario:'SC-08', truck_id:'tr-B', detour_min:4, action:'zone_preferred'} },
  { id:'h3', waste_point_id:10, name:'Nguyễn Huệ Blvd Bin A',          lat:10.7782, lng:106.7045, h3:h3cell(10.7782,106.7045), issue_type:'near_full',  severity:'high', priority_score:74, report_count:2, status:'active', created_at:minsAgo(8),  suggestion:{scenario:'SC-02', truck_id:'tr-A', detour_min:4, action:'reorder'} },
  { id:'h4', waste_point_id:20, name:'Bùi Viện Food Street Bin A',     lat:10.7665, lng:106.6932, h3:h3cell(10.7665,106.6932), issue_type:'bulky_waste', severity:'mid', priority_score:62, report_count:2, status:'active', created_at:minsAgo(34), suggestion:{scenario:'SC-03', truck_id:'tr-B', detour_min:8, action:'reassign'} },
  { id:'h5', waste_point_id:35, name:'Phú Nhuận Market Bin',            lat:10.7987, lng:106.6805, h3:h3cell(10.7987,106.6805), issue_type:'near_full',  severity:'mid', priority_score:52, report_count:2, status:'active', created_at:minsAgo(22), suggestion:{scenario:'SC-08', truck_id:'tr-C', detour_min:2, action:'zone_preferred'} },
  { id:'h6', waste_point_id:14, name:'Lý Tự Trọng Apt Bin A',          lat:10.7798, lng:106.7022, h3:h3cell(10.7798,106.7022), issue_type:'near_full',  severity:'low', priority_score:28, report_count:1, status:'active', created_at:minsAgo(6),  suggestion:{scenario:'SC-07', truck_id:'tr-A', detour_min:0, action:'watching'} },
  // Resolved — history
  { id:'h7', waste_point_id:23, name:'Cách Mạng Tháng 8 Bin A',        lat:10.7820, lng:106.6880, h3:h3cell(10.7820,106.6880), issue_type:'overflow',   severity:'high', priority_score:76, report_count:2, status:'resolved', created_at:minsAgo(90), resolved_at:minsAgo(20), suggestion:null },
];

// ────────────────────────────────────────────────────────────────────────────
// TASKS per truck
// ────────────────────────────────────────────────────────────────────────────
const TASKS_BY_TRUCK = {
  'tr-A': [
    { id:'ta-1', seq:1, name:'Lê Lợi cluster (A+B+Nguyễn Thái Học)',  status:'done',   issue_type:null,        score:null, kg: 90, dist:null, eta:null, lat:10.7735,lng:106.6985, tlat:10.7733,tlng:106.6990, collected:88, cat:'small_residential' },
    { id:'ta-2', seq:2, name:'Bến Thành Market Bin A',                 status:'active', issue_type:'overflow',  score:92,   kg:150, dist:0.3,  eta:2,    lat:10.7726,lng:106.6981, tlat:10.7733,tlng:106.6990, cat:'market_commercial' },
    { id:'ta-3', seq:3, name:'Đồng Khởi + Hàm Nghi cluster',          status:'pending',issue_type:null,        score:null, kg: 90, dist:1.0,  eta:7,    lat:10.7775,lng:106.7012, tlat:10.7733,tlng:106.6990, cat:'small_residential' },
    { id:'ta-4', seq:4, name:'Nguyễn Huệ + Riverside cluster',        status:'pending',issue_type:'near_full', score:74,   kg:175, dist:1.5,  eta:10,   lat:10.7782,lng:106.7045, tlat:10.7733,tlng:106.6990, cat:'large_public' },
    { id:'ta-5', seq:5, name:'Lý Tự Trọng + alleys cluster',          status:'pending',issue_type:'near_full', score:28,   kg:135, dist:1.9,  eta:13,   lat:10.7798,lng:106.7022, tlat:10.7733,tlng:106.6990, cat:'medium_residential' },
  ],
  'tr-B': [
    { id:'tb-1', seq:1, name:'Tao Đàn Park cluster',                  status:'active', issue_type:'overflow',  score:88,   kg:345, dist:0.3,  eta:2,    lat:10.7766,lng:106.6904, tlat:10.7720,tlng:106.6900, cat:'large_public' },
    { id:'tb-2', seq:2, name:'Cách Mạng Tháng 8 cluster',             status:'done',   issue_type:null,        score:null, kg: 90, dist:null, eta:null, lat:10.7820,lng:106.6880, tlat:10.7720,tlng:106.6900, collected:87, cat:'small_residential' },
    { id:'tb-3', seq:3, name:'Lý Chính Thắng cluster',                status:'pending',issue_type:null,        score:null, kg: 60, dist:1.4,  eta:9,    lat:10.7870,lng:106.6840, tlat:10.7720,tlng:106.6900, cat:'small_residential' },
    { id:'tb-4', seq:4, name:'Bùi Viện + Phạm Ngũ Lão cluster',      status:'pending',issue_type:'bulky_waste',score:62,  kg:330, dist:2.1,  eta:14,   lat:10.7665,lng:106.6932, tlat:10.7720,tlng:106.6900, cat:'market_commercial' },
  ],
  'tr-C': [
    { id:'tc-1', seq:1, name:'Đinh Tiên Hoàng + Bạch Đằng cluster',  status:'active', issue_type:null,        score:null, kg:175, dist:0.2,  eta:1,    lat:10.7850,lng:106.6960, tlat:10.7848,tlng:106.6958, cat:'large_public' },
    { id:'tc-2', seq:2, name:'Xô Viết Nghệ Tĩnh cluster',             status:'pending',issue_type:null,        score:null, kg: 60, dist:1.3,  eta:8,    lat:10.8000,lng:106.7050, tlat:10.7848,tlng:106.6958, cat:'small_residential' },
    { id:'tc-3', seq:3, name:'Phú Nhuận + Phan Đình Phùng cluster',  status:'pending',issue_type:'near_full', score:52,   kg:210, dist:2.0,  eta:13,   lat:10.7981,lng:106.6810, tlat:10.7848,tlng:106.6958, cat:'market_commercial' },
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// MANAGER ACCOUNTS — matches run_migrate.py MANAGERS_DATA
// ────────────────────────────────────────────────────────────────────────────
const MOCK_MANAGERS = {
  'manager.benthanh':  { password:'demo123', waste_point_id:1,  waste_point_name:'Bến Thành Market Bin A' },
  'manager.taodan':    { password:'demo123', waste_point_id:17, waste_point_name:'Tao Đàn Park Bin A' },
  'manager.buivien':   { password:'demo123', waste_point_id:20, waste_point_name:'Bùi Viện Food Street Bin A' },
  'manager.riverside': { password:'demo123', waste_point_id:12, waste_point_name:'Tôn Đức Thắng Riverside Bin A' },
  'manager.lytutrong': { password:'demo123', waste_point_id:14, waste_point_name:'Lý Tự Trọng Apt Bin A' },
  'manager.phunhuan':  { password:'demo123', waste_point_id:35, waste_point_name:'Phú Nhuận Market Bin' },
  'manager.bachdang':  { password:'demo123', waste_point_id:30, waste_point_name:'Bạch Đằng Riverside Bin' },
};

const MOCK_ACCOUNTS = {
  admin:      { password:'demo123', role:'admin',      waste_point_id:null, truck_id:null },
  dispatcher: { password:'demo123', role:'dispatcher', waste_point_id:null, truck_id:null },
  driver1:    { password:'demo123', role:'driver',     waste_point_id:null, truck_id:'tr-A' },
  driver2:    { password:'demo123', role:'driver',     waste_point_id:null, truck_id:'tr-B' },
  driver3:    { password:'demo123', role:'driver',     waste_point_id:null, truck_id:'tr-C' },
  ...Object.fromEntries(
    Object.entries(MOCK_MANAGERS).map(([u,d]) => [u, { password:d.password, role:'manager', waste_point_id:d.waste_point_id, truck_id:null }])
  ),
};

// ═══════════════════════════════════════════════════════════════════════════
// API EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export async function mockLogin(username, password) {
  await delay(300);
  const acc = MOCK_ACCOUNTS[username];
  if (!acc || acc.password !== password) throw new Error('Invalid credentials');
  return { token:'mock-token', role:acc.role, waste_point_id:acc.waste_point_id, truck_id:acc.truck_id };
}

export async function listHotspots() {
  await delay();
  return HOTSPOTS_DATA.filter(h => h.status === 'active').map(h => ({ ...h }));
}
export async function getHotspot(id) {
  await delay();
  return HOTSPOTS_DATA.find(h => String(h.id) === String(id)) || null;
}

export async function listTrucks() {
  await delay();
  return TRUCKS_DATA.map(t => ({
    ...t,
    capacity_pct: Math.round((t.current_load_kg / t.max_capacity_kg) * 100),
    remaining_capacity_kg: t.max_capacity_kg - t.current_load_kg,
  }));
}

export async function getSuggestion(hotspotId) {
  await delay();
  const hs = HOTSPOTS_DATA.find(h => String(h.id) === String(hotspotId) || String(h.waste_point_id) === String(hotspotId));
  if (!hs?.suggestion) return null;
  const truck = TRUCKS_DATA.find(t => t.id === hs.suggestion.truck_id);
  const TITLES = {
    'SC-02': `Reorder — insert as next stop for ${truck?.code}`,
    'SC-03': `Reassign to ${truck?.code} (closer + lighter)`,
    'SC-08': `Zone-preferred — ${truck?.code} owns this area`,
    'SC-07': 'Watching — re-evaluate in 15 min',
  };
  return {
    id:`sg-${hs.id}`, hotspot_id:hs.id, truck_id:hs.suggestion.truck_id,
    scenario_id:hs.suggestion.scenario, title:TITLES[hs.suggestion.scenario] || hs.suggestion.scenario,
    description:`Priority ${hs.priority_score}. Detour +${hs.suggestion.detour_min} min. Truck ${Math.round((truck?.current_load_kg/truck?.max_capacity_kg)*100)}% loaded.`,
    detour_minutes:hs.suggestion.detour_min, truck_eta_minutes:hs.suggestion.detour_min+1,
    status:'pending',
    truck: truck ? { ...truck } : null,
  };
}
export async function approveSuggestion() { await delay(400); return { status:'approved' }; }
export async function rejectSuggestion()  { await delay(400); return { status:'rejected' }; }

let _taskState = {};
Object.entries(TASKS_BY_TRUCK).forEach(([tid, tasks]) => { _taskState[tid] = tasks.map(t => ({ ...t })); });

export async function listTasks(truckId, { includeDone = true } = {}) {
  await delay();
  const map = { '1':'tr-A', '2':'tr-B', '3':'tr-C' };
  const key = map[String(truckId)] || String(truckId);
  const all = _taskState[key] || [];
  const rows = includeDone ? all : all.filter(t => t.status !== 'done');
  return rows.map(t => ({
    id:t.id, sequence:t.seq, name:t.name, status:t.status,
    issue_type:t.issue_type, priority_score:t.score,
    estimated_weight_kg:t.kg, distance_km:t.dist, eta_minutes:t.eta,
    lat:t.lat, lng:t.lng, truck_lat:t.tlat, truck_lng:t.tlng,
    weight_collected_kg:t.collected||null, category:t.cat,
  }));
}
export async function patchTask(taskId, payload) {
  await delay(300);
  for (const tasks of Object.values(_taskState)) {
    const t = tasks.find(x => x.id === taskId);
    if (t) { Object.assign(t, payload); return { id:taskId, ...payload }; }
  }
  return { id:taskId, ...payload };
}

export async function getShiftSummary(truckId) {
  await delay();
  const map = { '1':'tr-A', '2':'tr-B', '3':'tr-C' };
  const key = map[String(truckId)] || String(truckId);
  const tasks = _taskState[key] || [];
  const truck = TRUCKS_DATA.find(t => t.id === key);
  const done = tasks.filter(t => t.status === 'done');
  return {
    stops_done:done.length, stops_total:tasks.length,
    weight_collected_kg:done.reduce((s,t)=>s+(t.collected||0),0),
    shift_minutes:95, avg_per_stop_minutes:done.length?12:0,
    current_load_kg:truck?.current_load_kg||0, max_capacity_kg:truck?.max_capacity_kg||3000,
    recent_stops:done.slice(-3).map(t=>({id:t.id,name:t.name,weight_collected_kg:t.collected})),
  };
}

export async function listWastePoints() {
  await delay();
  const base = typeof window!=='undefined' ? window.location.origin : 'http://localhost:5173';
  return WASTE_POINTS.map(wp => ({
    id:wp.id, name:wp.name, lat:wp.lat, lng:wp.lng,
    area_type:wp.area_type, category:wp.cat,
    estimated_weight_kg:wp.kg, status:wp.status, h3_cell:wp.h3,
    qr_url:`${base}/r?b=${wp.id}`,
  }));
}

export async function getBinByQr(binId) {
  await delay(200);
  const wp = WASTE_POINTS.find(w => String(w.id) === String(binId));
  if (!wp) return { bin_id:binId, waste_point_id:null, name:`Bin ${binId}`, address:'', lat:null, lng:null };
  return {
    bin_id:String(wp.id), waste_point_id:wp.id,
    name:wp.name, address:`${wp.area_type}`,
    lat:wp.lat, lng:wp.lng, category:wp.cat, status:wp.status,
  };
}

export async function getDashboardKPIs() {
  await delay();
  const active = HOTSPOTS_DATA.filter(h=>h.status==='active');
  const totalLoad = TRUCKS_DATA.reduce((s,t)=>s+t.current_load_kg,0);
  const totalCap  = TRUCKS_DATA.reduce((s,t)=>s+t.max_capacity_kg,0);
  return {
    opened_today:active.length+2, resolved:2, resolved_pct:25, avg_response_minutes:18,
    open_by_severity:{
      high:active.filter(h=>h.severity==='high').length,
      mid: active.filter(h=>h.severity==='mid').length,
      low: active.filter(h=>h.severity==='low').length,
    },
    fleet_load_pct:Math.round((totalLoad/totalCap)*100), fleet_load_kg:totalLoad,
    suggestion_breakdown:{keep_route:1,reorder:2,reassign:1,assign_greedy:0,manual_alert:1},
  };
}

export async function getHotspotAreas() {
  await delay();
  return { areas:[
    {area_type:'market',    hotspot_count:3, resolved_count:2, avg_response_minutes:14},
    {area_type:'park',      hotspot_count:2, resolved_count:1, avg_response_minutes:20},
    {area_type:'street',    hotspot_count:1, resolved_count:1, avg_response_minutes:18},
    {area_type:'apartment', hotspot_count:1, resolved_count:0, avg_response_minutes:30},
  ]};
}

export async function listZones() {
  await delay();
  // Zone centroids matching run_migrate.py ZONE_CENTERS exactly
  const CENTROIDS = {
    'tr-A': { lat:10.7765, lng:106.7015 },
    'tr-B': { lat:10.7730, lng:106.6890 },
    'tr-C': { lat:10.7930, lng:106.6940 },
  };
  const ZONE_META = {
    'tr-A': { id:1, name:'District 1 North',         color:'#00B14F', truck_id:'tr-A', status:'busy'   },
    'tr-B': { id:2, name:'District 1 South + Q3',    color:'#F97316', truck_id:'tr-B', status:'normal' },
    'tr-C': { id:3, name:'Bình Thạnh + Phú Nhuận',   color:'#0EA5E9', truck_id:'tr-C', status:'normal' },
  };
  const hav = (la1,lo1,la2,lo2) => {
    const R=6371, r=d=>d*Math.PI/180;
    const a=Math.sin(r(la2-la1)/2)**2+Math.cos(r(la1))*Math.cos(r(la2))*Math.sin(r(lo2-lo1)/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  };
  const buckets = {'tr-A':new Set(),'tr-B':new Set(),'tr-C':new Set()};
  WASTE_POINTS.forEach(wp => {
    let best='tr-A', bestD=Infinity;
    for (const [tid,c] of Object.entries(CENTROIDS)) {
      const d = hav(wp.lat,wp.lng,c.lat,c.lng);
      if (d<bestD){bestD=d;best=tid;}
    }
    buckets[best].add(wp.h3);
  });
  return { zones: Object.entries(buckets).map(([tid,cells]) => ({
    ...ZONE_META[tid], h3_cells:[...cells],
  }))};
}

export async function listRoutes() {
  await delay();
  return { routes: TRUCKS_DATA.map((t,i) => ({
    id:i+1, truck_id:t.id,
    name:`${t.name.split(' · ')[0]} — fixed loop`,
    is_active:true, waypoints:t.route, geometry:t.route,
  }))};
}

export async function adminListManagers() {
  await delay();
  return { managers: Object.entries(MOCK_MANAGERS).map(([username,d],i) => ({
    id:100+i, username, role:'manager', waste_point_id:d.waste_point_id, waste_point_name:d.waste_point_name,
  }))};
}
export async function adminCreateManager({ username, password, waste_point_id }) {
  await delay(300);
  if (MOCK_ACCOUNTS[username]) throw new Error('Username already taken');
  const wp = WASTE_POINTS.find(w=>w.id===waste_point_id);
  const wp_name = wp?.name || `Waste Point ${waste_point_id}`;
  MOCK_MANAGERS[username]={password,waste_point_id,waste_point_name:wp_name};
  MOCK_ACCOUNTS[username]={password,role:'manager',waste_point_id,truck_id:null};
  return {id:Date.now(),username,role:'manager',waste_point_id,waste_point_name:wp_name};
}
export async function adminDeleteManager() { await delay(200); }

export async function adminListWastePoints() {
  const pts = await listWastePoints();
  return { waste_points: pts };
}

export async function createReport(payload) {
  await delay(400);
  return {id:Math.floor(Math.random()*9000)+1000, status:'received', bin_name:payload.bin_name, ...payload};
}
export async function createScheduledPickup(payload) {
  await delay(400);
  return {id:Math.floor(Math.random()*9000)+1000, status:'scored', bin_name:payload.bin_name, ...payload};
}
export async function getReportStatus(id) {
  await delay(300);
  return {
    id, bin_name:'Bến Thành Market Bin A', address:'market · District 1',
    status:'assigned', assigned_truck:'Truck Alpha · Long',
    photo_urls:[],
    timeline:[
      {step:'received',  label:'Report received',           at:minsAgo(20)},
      {step:'clustered', label:'Clustered with 3 reports',  at:minsAgo(19)},
      {step:'scored',    label:'Priority score 92 (high)',   at:minsAgo(18)},
      {step:'assigned',  label:'Assigned to Truck Alpha',    at:minsAgo(12)},
    ],
  };
}

// Hourly report volume for one waste point — synthesizes plausible counts for
// the last `slots` 1-hour windows (oldest → newest). Demo-only data; uses a
// deterministic seed so the list is stable across re-renders (no Math.random).
export async function getHourlyReportStats(wastePointId, slots = 12) {
  await delay();
  const ISSUES = ['overflow', 'near_full', 'bulky_waste', 'bad_smell'];
  const currentHour = new Date(now_ts);
  currentHour.setMinutes(0, 0, 0);
  const wp = WASTE_POINTS.find((w) => String(w.id) === String(wastePointId));
  const out = [];
  let total = 0;
  for (let i = slots - 1; i >= 0; i--) {
    const hour = new Date(currentHour.getTime() - i * 3_600_000);
    const seed = (hour.getHours() * 7 + Number(wastePointId || 0) * 3 + i) % 6;
    const count = Math.max(0, seed - 1);
    const by_issue = {};
    for (let k = 0; k < count; k++) {
      const issue = ISSUES[(hour.getHours() + k) % ISSUES.length];
      by_issue[issue] = (by_issue[issue] || 0) + 1;
    }
    total += count;
    out.push({ hour_start: hour.toISOString(), count, by_issue });
  }
  // Live urgency derived from the bin's mock status (overflow/full/near_full
  // = still needs pickup; normal = already collected / not urgent).
  const urgent = wp ? ['overflow', 'full', 'near_full'].includes(wp.status) : false;
  return {
    waste_point_id: Number(wastePointId),
    waste_point_name: wp?.name || null,
    slot_minutes: 60,
    total,
    is_urgent: urgent,
    wp_status: wp?.status || null,
    pending_reports: urgent ? (out[out.length - 1]?.count || 1) : 0,
    slots: out,
  };
}

export async function exportCsv() {
  await delay();
  const rows = HOTSPOTS_DATA.map(h=>`${h.id},${h.name},${h.lat},${h.lng},${h.severity},${h.priority_score},${h.status}`);
  const csv = ['hotspot_id,name,lat,lng,severity,priority_score,status',...rows].join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='hotspots_export.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
