// Routing engine endpoints — Member 1 owns the service; Member B wires approve/reject
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { runRoutingEngine } = require('../services/routingEngine');

/**
 * POST /api/routing/suggest
 * Runs the routing engine against all active hotspots.
 * Called internally by re-optimisation trigger (Member C).
 */
router.post('/suggest', async (_req, res, next) => {
  try {
    const suggestions = await runRoutingEngine();
    res.json({ suggestions });
  } catch (err) { next(err); }
});

/**
 * POST /api/routing/approve/:suggestionId
 * Dispatcher approves: writes task to DB, notifies driver.
 * Member B owns the frontend card; this endpoint finalises the action.
 */
router.post('/approve/:id', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B / Member 1):
    //   1. Create Task record (hotspot_id, truck_id)
    //   2. Mark suggestion consumed
    //   3. Return updated task
    res.json({ message: 'stub' });
  } catch (err) { next(err); }
});

/**
 * POST /api/routing/reject/:suggestionId
 * Hotspot stays active; dispatcher handles manually.
 */
router.post('/reject/:id', authenticate, async (req, res, next) => {
  try {
    // TODO (Member B): mark suggestion rejected; leave hotspot active
    res.json({ message: 'stub' });
  } catch (err) { next(err); }
});

module.exports = router;
