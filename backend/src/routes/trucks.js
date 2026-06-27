// GET /api/trucks  — Member A owns data model; Member B & C consume
const express = require('express');
const router = express.Router();
const { computeTruckCapacity } = require('../utils/weightUtils');

/** GET /api/trucks  — all trucks with live capacity fields */
router.get('/', async (_req, res, next) => {
  try {
    // TODO (Member A): query all trucks, attach computed capacity fields
    res.json({ trucks: [] });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/trucks/:id/load
 * Body: { weight_kg: number }
 * Increments current_load_kg and updates truck status — Member C wires this
 */
router.patch('/:id/load', async (req, res, next) => {
  try {
    const { weight_kg } = req.body;
    // TODO (Member C):
    //   1. Load truck from DB
    //   2. Increment current_load_kg by weight_kg
    //   3. Recompute capacity_pct → update status (available/near_full/full)
    //   4. Trigger re-optimisation if threshold crossed
    res.json({ message: 'stub' });
  } catch (err) { next(err); }
});

module.exports = router;
