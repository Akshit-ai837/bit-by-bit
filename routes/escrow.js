// ─────────────────────────────────────────
//  routes/escrow.js
//  GET /api/escrow/:projectId   — get escrow status for a project
//  GET /api/escrow/summary      — get all escrow summary for current user
// ─────────────────────────────────────────

const express = require('express');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── ESCROW SUMMARY (ALL PROJECTS) ─────────
// GET /api/escrow/summary
router.get('/summary', protect, async (req, res) => {
  try {
    const filter =
      req.user.role === 'client'
        ? { client: req.user._id }
        : { freelancer: req.user._id };

    const projects = await Project.find(filter).select('title escrow status');

    const summary = {
      totalLocked:   0,
      totalReleased: 0,
      totalRefunded: 0,
      projects: [],
    };

    projects.forEach((p) => {
      summary.totalLocked   += p.escrow.locked;
      summary.totalReleased += p.escrow.released;
      summary.totalRefunded += p.escrow.refunded;
      summary.projects.push({
        id:       p._id,
        title:    p.title,
        status:   p.status,
        escrow:   p.escrow,
      });
    });

    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── ESCROW FOR SINGLE PROJECT ─────────────
// GET /api/escrow/:projectId
router.get('/:projectId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .select('title escrow milestones status client freelancer');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Only client or assigned freelancer can view
    const isClient     = project.client.toString()     === req.user._id.toString();
    const isFreelancer = project.freelancer?.toString() === req.user._id.toString();
    if (!isClient && !isFreelancer) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const milestoneBreakdown = project.milestones.map((ms) => ({
      id:      ms._id,
      name:    ms.name,
      payment: ms.payment,
      status:  ms.status,
    }));

    res.json({
      success: true,
      projectTitle: project.title,
      escrow:       project.escrow,
      milestones:   milestoneBreakdown,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;