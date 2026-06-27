// Auth — Member C owns this
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token, role, truck_id? }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    // TODO (Member C):
    //   1. Lookup user by username
    //   2. Compare bcrypt hash
    //   3. Sign JWT with { id, role, truck_id }
    //   4. Return token
    res.json({ message: 'stub — implement auth' });
  } catch (err) { next(err); }
});

module.exports = router;
