// ─────────────────────────────────────────
//  routes/demo.js
//  Demo endpoints (used by the public landing page) that use the same AI
//  services as the authenticated backend, without requiring auth.
// ─────────────────────────────────────────

const express = require('express');
const { generateMilestones, verifyWork } = require('../services/aiService');

const router = express.Router();

// POST /api/demo/nlp
// Request: { description: string, budget: number }
// Response: { success: true, milestones: [...] }
router.post('/nlp', async (req, res) => {
  try {
    const { description, budget } = req.body;
    if (!description) {
      return res.status(400).json({ success: false, message: 'Description is required' });
    }

    const ms = await generateMilestones(description, budget || 50000);
    res.json({ success: true, milestones: ms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/demo/aqa
// Request: { work: string, type: string }
// Response: { success: true, aqa: {...} }
router.post('/aqa', async (req, res) => {
  try {
    const { work, type } = req.body;
    if (!work) {
      return res.status(400).json({ success: false, message: 'Submitted work is required' });
    }

    const aqa = await verifyWork(work, type || 'code', 'Demo');
    res.json({ success: true, aqa });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
