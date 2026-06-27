// src/routes/reports.js
// BE Dev 1 owns this file.
//
// Endpoints:
//   POST   /api/v1/reports                  — submit report (no auth)
//   GET    /api/v1/reports                  — list reports (manager)
//   GET    /api/v1/reports/:id              — single report (manager)
//   PATCH  /api/v1/reports/:id/status       — update status (crew or manager)

const router = require('express').Router();

// TODO (BE Dev 1): implement all handlers
// After POST /reports, trigger runClustering() + updateRoutes() from optimizer

router.post('/', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.get('/', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.get('/:id', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.patch('/:id/status', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

module.exports = router;
