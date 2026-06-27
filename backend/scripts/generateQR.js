#!/usr/bin/env node
// QR Code Generator — Member A
// Generates one PNG per waste point: bin_<id>.png → ./qr-codes/
// Usage: npm run qr:generate

require('dotenv').config({ path: '../.env' });
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const prisma = require('../prisma/client');

const APP_BASE_URL = process.env.APP_URL || 'http://localhost:5173';
const OUTPUT_DIR = path.join(__dirname, 'qr-codes');

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const points = await prisma.wastePoint.findMany();

  for (const p of points) {
    const url = `${APP_BASE_URL}/report?bin=${p.id}&lat=${p.lat}&lng=${p.lng}`;
    const file = path.join(OUTPUT_DIR, `bin_${p.id}.png`);
    await QRCode.toFile(file, url, { width: 400 });
    console.log(`✓ bin_${p.id}.png  →  ${url}`);
  }

  console.log(`\nGenerated ${points.length} QR codes in ${OUTPUT_DIR}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
