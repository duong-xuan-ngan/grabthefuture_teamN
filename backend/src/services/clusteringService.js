// Hotspot Clustering Service — Member A
// Merges reports within CLUSTER_RADIUS_M metres and CLUSTER_WINDOW_MIN minutes
// into a single hotspot record.

const { CLUSTER_RADIUS_M, CLUSTER_WINDOW_MIN } = require('../utils/constants');
const { haversineKm } = require('../utils/weightUtils');

/**
 * Given a new report, either attach it to an existing active hotspot
 * (within radius & time window) or create a new one.
 *
 * @param {object} report  — persisted report from DB
 * @param {object} prisma  — PrismaClient instance
 * @returns {object}  hotspot (new or updated)
 */
async function clusterReport(report, prisma) {
  const windowStart = new Date(Date.now() - CLUSTER_WINDOW_MIN * 60 * 1000);

  // Find active hotspots for this waste point created within the window
  const candidates = await prisma.hotspot.findMany({
    where: {
      waste_point_id: report.waste_point_id,
      status: 'active',
      created_at: { gte: windowStart },
    },
    include: { waste_point: true },
  });

  for (const hotspot of candidates) {
    const distKm = haversineKm(
      report.lat, report.lng,
      hotspot.waste_point.lat, hotspot.waste_point.lng
    );
    if (distKm * 1000 <= CLUSTER_RADIUS_M) {
      // Merge: attach report and increment count
      const updated = await prisma.hotspot.update({
        where: { id: hotspot.id },
        data: {
          report_count: { increment: 1 },
          // Escalate severity to most severe
          severity: escalateSeverity(hotspot.severity, report.issue_type),
          reports: { connect: { id: report.id } },
        },
      });
      return updated;
    }
  }

  // No match — create new hotspot
  const newHotspot = await prisma.hotspot.create({
    data: {
      waste_point_id: report.waste_point_id,
      report_count: 1,
      severity: report.issue_type,
      priority_score: 0, // computed next by scoringService
      status: 'active',
      reports: { connect: { id: report.id } },
    },
  });
  return newHotspot;
}

/** Return the more severe of two issue types */
const SEVERITY_RANK = { overflow: 4, near_full: 3, bulky_waste: 2, bad_smell: 1 };
function escalateSeverity(current, incoming) {
  return SEVERITY_RANK[incoming] > SEVERITY_RANK[current] ? incoming : current;
}

module.exports = { clusterReport };
