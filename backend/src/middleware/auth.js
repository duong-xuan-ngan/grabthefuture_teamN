// src/middleware/auth.js
// BE Dev 1 owns this file.
//
// TODO: implement verifyToken middleware
// - Extract Bearer token from Authorization header
// - Verify with JWT_SECRET
// - Attach decoded user to req.user
// - Return 401 if missing/invalid

const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  // TODO: implement
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    // TODO: check req.user.role against allowed roles
    next();
  };
}

module.exports = { verifyToken, requireRole };
