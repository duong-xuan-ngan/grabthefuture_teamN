// src/routes/routes.js
// BE Dev 1 owns this file.
//
// Endpoints:
//   GET   /api/v1/clusters                             — list active clusters (manager)
//   GET   /api/v1/routes/:id                           — route + stops (crew/manager)
//   POST  /api/v1/routes/:id/optimize                  — re-trigger optimization (manager)
//   POST  /api/v1/routes/:id/stops/:stopId/checkin     — crew check-in

const router = require('express').Router();

router.get('/clusters', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.get('/:id', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/:id/optimize', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/:id/stops/:stopId/checkin', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

module.exports = router;
