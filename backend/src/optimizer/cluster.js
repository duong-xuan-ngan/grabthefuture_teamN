// src/optimizer/cluster.js
// BE Dev 2 owns this file.
//
// Responsibilities:
//   - Fetch all pending/unresolved reports from DB
//   - Group by 200m radius + 4-hour time window using PostGIS ST_DWithin
//   - Compute cluster centroid (ST_Centroid)
//   - Score each cluster: priority = count × severity_weight × time_factor
//   - Upsert clusters table, update report.cluster_id FK
//
// TODO: implement runClustering()

async function runClustering() {
  // Implementation goes here
  throw new Error('Not implemented yet');
}

module.exports = { runClustering };
