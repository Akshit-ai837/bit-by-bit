// ─────────────────────────────────────────
//  routes/auth.js
//  POST /api/auth/register
//  POST /api/auth/login
//  GET  /api/auth/me
// ─────────────────────────────────────────

const express = require('express');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Helper: generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ── REGISTER ──────────────────────────────
// POST /api/auth/register
router.post(
  '/register',
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(['client', 'freelancer']).withMessage('Role must be client or freelancer'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { firstName, lastName, email, password, role, skill } = req.body;

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        role,
        skill: role === 'freelancer' ? skill : null,
        pfi: role === 'freelancer' ? { score: 500, accuracy: 50, deadline: 50, disputes: 0 } : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token: generateToken(user._id),
        user: {
          id:        user._id,
          firstName: user.firstName,
          lastName:  user.lastName,
          email:     user.email,
          role:      user.role,
          skill:     user.skill,
          pfi:       user.pfi,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── LOGIN ─────────────────────────────────
// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      res.json({
        success: true,
        message: 'Login successful',
        token: generateToken(user._id),
        user: {
          id:        user._id,
          firstName: user.firstName,
          lastName:  user.lastName,
          email:     user.email,
          role:      user.role,
          skill:     user.skill,
          pfi:       user.pfi,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── GET CURRENT USER ──────────────────────
// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;