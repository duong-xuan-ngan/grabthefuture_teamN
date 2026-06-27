// Tasks — Member C owns this
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

/** GET /api/tasks/:truckId  — driver's current task list */
router.get('/:truckId', authenticate, async (req, res, next) => {
  try {
    // TODO (Member C): return assigned tasks for truckId
    res.json({ tasks: [] });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/tasks/:id
 * Body: { status: 'done' | 'unreachable', weight_collected_kg?: number }
 * Member C: updates task, increments truck load if done
 */
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { status, weight_collected_kg } = req.body;
    // TODO (Member C):
    //   1. Update task status + completed_at
    //   2. If done: call PATCH /api/trucks/:id/load internally
    //   3. Trigger routing re-optimisation (Member 1)
    res.json({ message: 'stub' });
  } catch (err) { next(err); }
});

module.exports = router;
