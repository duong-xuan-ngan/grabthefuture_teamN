// GET /api/hotspots  — Member A owns this
const express = require('express');
const router = express.Router();

/** GET /api/hotspots  — all active hotspots with priority score */
router.get('/', async (_req, res, next) => {
  try {
    // TODO (Member A): query DB, return hotspots with waste_point join
    res.json({ hotspots: [] });
  } catch (err) { next(err); }
});

/** GET /api/hotspots/:id  — single hotspot detail (reports, photos, score) */
router.get('/:id', async (req, res, next) => {
  try {
    // TODO (Member A): query hotspot with all reports and photos
    res.json({ hotspot: null });
  } catch (err) { next(err); }
});

module.exports = router;
