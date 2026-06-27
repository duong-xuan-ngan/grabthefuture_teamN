// POST /api/reports  — Member A owns this
const express = require('express');
const router = express.Router();
const { clusterReport } = require('../services/clusteringService');
const { computePriorityScore } = require('../services/scoringService');
// const upload = require('../middleware/upload'); // uncomment when Cloudinary configured

/**
 * POST /api/reports
 * Body: { waste_point_id, issue_type, description?, image? (multipart) }
 * Returns 201 with the created report (and hotspot if newly created/updated)
 */
router.post('/', async (req, res, next) => {
  try {
    const { waste_point_id, issue_type, description, lat, lng } = req.body;
    // TODO (Member A):
    //   1. Upload image to Cloudinary if present → image_url
    //   2. Persist report to DB
    //   3. Call clusterReport() → returns hotspot (new or existing)
    //   4. Call computePriorityScore(hotspot) → update hotspot.priority_score
    //   5. Return 201 { report, hotspot }
    res.status(201).json({ message: 'stub — implement in member-a branch' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
