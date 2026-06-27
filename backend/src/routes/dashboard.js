// src/routes/dashboard.js
// BE Dev 1 owns this file.

const router = require('express').Router();

router.get('/metrics', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.get('/map', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.get('/export', async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

module.exports = router;
