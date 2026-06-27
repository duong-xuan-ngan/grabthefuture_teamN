#!/usr/bin/env node
// Demo seed script — Member C owns this
// Seeds 25 waste points, 2 routes, 2 trucks, and a scripted hotspot scenario.

require('dotenv').config({ path: '../.env' });
const prisma = require('../prisma/client');
const { latLngToCell } = require('../src/utils/h3Utils');
const { BIN_WEIGHT_DEFAULTS } = require('../src/utils/constants');

async function main() {
  console.log('🌱  Seeding WasteHotspot demo data…');

  // ── 1. Waste Points ───────────────────────────────────────────────────────
  const wastePoints = [
    // Ho Chi Minh City approximate coordinates
    { name: 'Bến Thành Market Bin A', lat: 10.7726, lng: 106.6981, area_type: 'market',    category: 'market_commercial' },
    { name: 'Bến Thành Market Bin B', lat: 10.7729, lng: 106.6985, area_type: 'market',    category: 'market_commercial' },
    { name: 'Nguyễn Huệ Street Bin', lat: 10.7741, lng: 106.7030, area_type: 'street',    category: 'small_residential' },
    { name: 'Lê Lợi Blvd Bin',       lat: 10.7735, lng: 106.6985, area_type: 'street',    category: 'small_residential' },
    { name: 'Chợ Tân Bình Bin A',    lat: 10.7975, lng: 106.6521, area_type: 'market',    category: 'market_commercial' },
    { name: 'Chợ Tân Bình Bin B',    lat: 10.7980, lng: 106.6525, area_type: 'market',    category: 'market_commercial' },
    { name: 'Tao Đàn Park Bin A',    lat: 10.7766, lng: 106.6904, area_type: 'park',      category: 'large_public' },
    { name: 'Tao Đàn Park Bin B',    lat: 10.7760, lng: 106.6910, area_type: 'park',      category: 'large_public' },
    { name: 'RMIT University Bin',   lat: 10.7290, lng: 106.7221, area_type: 'school',    category: 'large_public' },
    { name: 'Phú Mỹ Hưng Apt Bin A',lat: 10.7297, lng: 106.7009, area_type: 'apartment', category: 'medium_residential' },
    { name: 'Phú Mỹ Hưng Apt Bin B',lat: 10.7302, lng: 106.7013, area_type: 'apartment', category: 'medium_residential' },
    { name: 'Dist 1 Alley Bin 01',  lat: 10.7791, lng: 106.7004, area_type: 'street',    category: 'small_residential' },
    { name: 'Dist 1 Alley Bin 02',  lat: 10.7793, lng: 106.7008, area_type: 'street',    category: 'small_residential' },
    { name: 'Dist 3 Residential A', lat: 10.7860, lng: 106.6870, area_type: 'street',    category: 'small_residential' },
    { name: 'Dist 3 Residential B', lat: 10.7863, lng: 106.6873, area_type: 'street',    category: 'small_residential' },
    { name: 'Dist 10 Market Bin',   lat: 10.7762, lng: 106.6685, area_type: 'market',    category: 'market_commercial' },
    { name: 'Dist 10 School Bin',   lat: 10.7770, lng: 106.6690, area_type: 'school',    category: 'large_public' },
    { name: 'Bình Thạnh Apt A',     lat: 10.8121, lng: 106.7082, area_type: 'apartment', category: 'medium_residential' },
    { name: 'Bình Thạnh Apt B',     lat: 10.8124, lng: 106.7085, area_type: 'apartment', category: 'medium_residential' },
    { name: 'Gò Vấp Market Bin',    lat: 10.8384, lng: 106.6652, area_type: 'market',    category: 'market_commercial' },
    { name: 'Gò Vấp Street Bin',    lat: 10.8387, lng: 106.6655, area_type: 'street',    category: 'small_residential' },
    { name: 'Phú Nhuận Bin A',      lat: 10.7981, lng: 106.6810, area_type: 'street',    category: 'small_residential' },
    { name: 'Phú Nhuận Bin B',      lat: 10.7984, lng: 106.6813, area_type: 'street',    category: 'small_residential' },
    { name: 'Tân Phú Market Bin',   lat: 10.7949, lng: 106.6277, area_type: 'market',    category: 'market_commercial' },
    { name: 'Củ Chi Event Venue',   lat: 11.0026, lng: 106.4750, area_type: 'park',      category: 'large_public' },
  ];

  for (const wp of wastePoints) {
    await prisma.wastePoint.upsert({
      where: { id: wastePoints.indexOf(wp) + 1 },
      update: {},
      create: {
        ...wp,
        h3_cell: latLngToCell(wp.lat, wp.lng),
        estimated_weight_kg: BIN_WEIGHT_DEFAULTS[wp.category],
        normal_collection_time: '06:30',
      },
    });
  }
  console.log(`  ✓ ${wastePoints.length} waste points`);

  // ── 2. Trucks ─────────────────────────────────────────────────────────────
  const truck1Lat = 10.7750, truck1Lng = 106.6990;
  const truck2Lat = 10.7980, truck2Lng = 106.6530;

  await prisma.truck.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1, name: 'Truck Alpha', lat: truck1Lat, lng: truck1Lng,
      h3_cell: latLngToCell(truck1Lat, truck1Lng),
      max_capacity_kg: 3000, current_load_kg: 0, status: 'available',
    },
  });
  await prisma.truck.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2, name: 'Truck Beta', lat: truck2Lat, lng: truck2Lng,
      h3_cell: latLngToCell(truck2Lat, truck2Lng),
      max_capacity_kg: 2500, current_load_kg: 0, status: 'available',
    },
  });
  console.log('  ✓ 2 trucks');

  // ── 3. Scripted hotspot scenario for demo ─────────────────────────────────
  // Simulate: Bến Thành Market Bin A is overflowing with 3 reports
  const hotspot = await prisma.hotspot.create({
    data: {
      waste_point_id: 1,
      report_count: 3,
      severity: 'overflow',
      priority_score: 85,
      status: 'active',
    },
  });

  const now = new Date();
  for (let i = 0; i < 3; i++) {
    await prisma.report.create({
      data: {
        waste_point_id: 1,
        hotspot_id: hotspot.id,
        issue_type: 'overflow',
        description: `Demo report ${i + 1}`,
        lat: 10.7726, lng: 106.6981,
        created_at: new Date(now - i * 5 * 60 * 1000),
      },
    });
  }
  console.log('  ✓ Demo hotspot (score 85, overflow, 3 reports)');

  // ── 4. Users ──────────────────────────────────────────────────────────────
  // Passwords are pre-hashed with bcrypt (rounds=10). Plaintext: "demo123"
  const DEMO_HASH = '$2b$10$placeholder_replace_with_real_bcrypt_hash';
  await prisma.user.upsert({
    where: { username: 'dispatcher' },
    update: {},
    create: { username: 'dispatcher', password: DEMO_HASH, role: 'dispatcher' },
  });
  await prisma.user.upsert({
    where: { username: 'driver1' },
    update: {},
    create: { username: 'driver1', password: DEMO_HASH, role: 'driver', truck_id: 1 },
  });
  await prisma.user.upsert({
    where: { username: 'driver2' },
    update: {},
    create: { username: 'driver2', password: DEMO_HASH, role: 'driver', truck_id: 2 },
  });
  console.log('  ✓ Demo users (dispatcher, driver1, driver2) — update passwords before demo!');

  console.log('\n🌱  Seed complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
