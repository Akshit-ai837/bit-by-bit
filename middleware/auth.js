// ─────────────────────────────────────────
//  middleware/auth.js
//  Authentication and authorization middleware
// ─────────────────────────────────────────

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── PROTECT ─────────────────────────────────
// Verify JWT token and attach user to req
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// ── REQUIRE ROLE ───────────────────────────
// Check if user has required role
const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

module.exports = { protect, requireRole };