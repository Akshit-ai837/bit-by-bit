// ─────────────────────────────────────────
//  routes/projects.js
//  GET    /api/projects              — browse open projects
//  POST   /api/projects              — client creates project
//  GET    /api/projects/mine         — get my projects
//  GET    /api/projects/:id          — get single project
//  POST   /api/projects/:id/assign   — assign freelancer
//  DELETE /api/projects/:id          — cancel project
// ─────────────────────────────────────────

const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const { protect, requireRole } = require('../middleware/auth');
const { generateMilestones } = require('../services/aiService');

const router = express.Router();

// ── BROWSE OPEN PROJECTS ──────────────────
// GET /api/projects
router.get('/', protect, async (req, res) => {
  try {
    const { category, minBudget, maxBudget } = req.query;
    const filter = { status: 'open', freelancer: null };
    if (category)  filter.category = category;
    if (minBudget) filter.budget   = { ...filter.budget, $gte: Number(minBudget) };
    if (maxBudget) filter.budget   = { ...filter.budget, $lte: Number(maxBudget) };

    const projects = await Project.find(filter)
      .populate('client', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: projects.length, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET MY PROJECTS ───────────────────────
// GET /api/projects/mine
router.get('/mine', protect, async (req, res) => {
  try {
    const filter =
      req.user.role === 'client'
        ? { client: req.user._id }
        : { freelancer: req.user._id };

    const projects = await Project.find(filter)
      .populate('client',     'firstName lastName email')
      .populate('freelancer', 'firstName lastName email pfi')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: projects.length, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET SINGLE PROJECT ────────────────────
// GET /api/projects/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client',     'firstName lastName email')
      .populate('freelancer', 'firstName lastName email pfi');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── CREATE PROJECT (CLIENT ONLY) ──────────
// POST /api/projects
router.post(
  '/',
  protect,
  requireRole('client'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('budget').isNumeric().withMessage('Budget must be a number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { title, description, budget, timeline, category } = req.body;

      // Call AI to generate milestones
      const milestones = await generateMilestones(description, budget);

      const project = await Project.create({
        title,
        description,
        budget,
        timeline:   timeline  || '30 days',
        category:   category  || 'General',
        client:     req.user._id,
        milestones,
        escrow: {
          total:    budget,
          locked:   budget,
          released: 0,
          refunded: 0,
        },
      });

      // Activate first milestone
      if (project.milestones.length > 0) {
        project.milestones[0].status = 'active';
        await project.save();
      }

      res.status(201).json({ success: true, message: 'Project created', project });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── ASSIGN FREELANCER ─────────────────────
// POST /api/projects/:id/assign
router.post('/:id/assign', protect, requireRole('client'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your project' });
    }

    project.freelancer = req.body.freelancerId;
    project.status     = 'active';
    await project.save();

    res.json({ success: true, message: 'Freelancer assigned', project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── CANCEL PROJECT ────────────────────────
// DELETE /api/projects/:id
router.delete('/:id', protect, requireRole('client'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your project' });
    }

    project.status = 'cancelled';
    await project.save();

    res.json({ success: true, message: 'Project cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;