// Dashboard & KPI endpoints — Member B owns this
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

/** GET /api/dashboard/kpis  — today's shift summary */
router.get('/kpis', authenticate, async (_req, res, next) => {
  try {
    // TODO (Member B): aggregate today's hotspots, avg response time, truck loads
    res.json({
      hotspots_opened:   0,
      hotspots_resolved: 0,
      avg_response_min:  0,
      open_by_severity:  {},
      trucks:            [],
    });
  } catch (err) { next(err); }
});

/** GET /api/dashboard/repeat-offenders  — bins with ≥ 3 hotspots in 30 days */
router.get('/repeat-offenders', authenticate, async (_req, res, next) => {
  try {
    // TODO (Member B): query waste_points with hotspot count ≥ 3 in last 30 days
    res.json({ repeat_offenders: [] });
  } catch (err) { next(err); }
});

/** GET /api/admin/export  — CSV export (Nice to Have) */
router.get('/export', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B): stream CSV with hotspot data for date range
    res.set('Content-Type', 'text/csv');
    res.send('id,location,severity,response_time_min,truck,weight_kg\n');
  } catch (err) { next(err); }
});

module.exports = router;
