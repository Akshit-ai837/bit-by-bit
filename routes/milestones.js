// ─────────────────────────────────────────
//  routes/milestones.js
//  POST /api/milestones/:projectId/:milestoneId/submit   — freelancer submits work
//  POST /api/milestones/:projectId/:milestoneId/verify   — AI verifies & triggers payment
// ─────────────────────────────────────────

const express = require('express');
const Project        = require('../models/Project');
const { protect, requireRole } = require('../middleware/auth');
const { verifyWork } = require('../services/aiService');
const { updatePFI }  = require('../services/pfiService');
const { releaseEscrow, refundEscrow } = require('../services/escrowService');

const router = express.Router();

// ── SUBMIT WORK ───────────────────────────
// POST /api/milestones/:projectId/:milestoneId/submit
router.post('/:projectId/:milestoneId/submit', protect, requireRole('freelancer'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (!project.freelancer || project.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this project' });
    }

    const ms = project.milestones.id(req.params.milestoneId);
    if (!ms) return res.status(404).json({ success: false, message: 'Milestone not found' });
    if (!['active', 'partial'].includes(ms.status)) {
      return res.status(400).json({ success: false, message: `Milestone is ${ms.status} — cannot submit` });
    }

    const { submittedWork, submittedLink, deliverableType } = req.body;
    if (!submittedWork) {
      return res.status(400).json({ success: false, message: 'Submitted work description is required' });
    }

    // Save submission
    ms.submittedWork = submittedWork;
    ms.submittedLink = submittedLink || null;
    ms.status = 'submitted';
    await project.save();

    // Trigger AI verification automatically
    const aqa = await verifyWork(submittedWork, deliverableType || 'code', ms.name);
    ms.aqaScore   = aqa.score;
    ms.aqaVerdict = aqa.verdict;
    ms.aqaFeedback = aqa.feedback;
    ms.status = 'in_review';
    await project.save();

    // Process result
    if (aqa.verdict === 'full') {
      await releaseEscrow(project, ms, req.user._id);
      await updatePFI(req.user._id, project._id, ms.name, 'full_completion', aqa.score);
    } else if (aqa.verdict === 'partial') {
      ms.status = 'partial';
      await project.save();
      await updatePFI(req.user._id, project._id, ms.name, 'partial_completion', aqa.score);
    } else {
      await refundEscrow(project, ms);
      await updatePFI(req.user._id, project._id, ms.name, 'dispute', aqa.score);
    }

    // Add quality bonus if score >= 90
    if (aqa.score >= 90) {
      await updatePFI(req.user._id, project._id, ms.name, 'high_quality', aqa.score);
    }

    await project.save();

    res.json({
      success: true,
      message: 'Work submitted and verified by AI',
      aqa,
      milestone: ms,
      escrow: project.escrow,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET MILESTONE DETAILS ─────────────────
// GET /api/milestones/:projectId/:milestoneId
router.get('/:projectId/:milestoneId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const ms = project.milestones.id(req.params.milestoneId);
    if (!ms) return res.status(404).json({ success: false, message: 'Milestone not found' });

    res.json({ success: true, milestone: ms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;