// ─────────────────────────────────────────
//  routes/pfi.js
//  GET /api/pfi/me              — get my PFI score
//  GET /api/pfi/:userId         — get any freelancer's PFI
//  GET /api/pfi/leaderboard     — top freelancers by PFI
//  GET /api/pfi/history/:userId — full PFI history
// ─────────────────────────────────────────

const express        = require('express');
const User           = require('../models/User');
const PFITransaction = require('../models/PFITransaction');
const { protect }    = require('../middleware/auth');

const router = express.Router();

// ── MY PFI ────────────────────────────────
// GET /api/pfi/me
router.get('/me', protect, async (req, res) => {
  try {
    if (req.user.role !== 'freelancer') {
      return res.status(400).json({ success: false, message: 'PFI is only for freelancers' });
    }

    const history = await PFITransaction.find({ freelancer: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('project', 'title');

    const tier =
      req.user.pfi.score >= 800 ? 'Elite'    :
      req.user.pfi.score >= 700 ? 'Trusted'  :
      req.user.pfi.score >= 600 ? 'Standard' : 'At Risk';

    res.json({
      success: true,
      pfi: {
        ...req.user.pfi.toObject(),
        tier,
      },
      history,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── LEADERBOARD ───────────────────────────
// GET /api/pfi/leaderboard
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const freelancers = await User.find({ role: 'freelancer' })
      .select('firstName lastName skill pfi')
      .sort({ 'pfi.score': -1 })
      .limit(20);

    const leaderboard = freelancers.map((f, i) => ({
      rank:      i + 1,
      id:        f._id,
      name:      `${f.firstName} ${f.lastName}`,
      skill:     f.skill,
      score:     f.pfi.score,
      accuracy:  f.pfi.accuracy,
      deadline:  f.pfi.deadline,
      disputes:  f.pfi.disputes,
      tier:
        f.pfi.score >= 800 ? 'Elite'    :
        f.pfi.score >= 700 ? 'Trusted'  :
        f.pfi.score >= 600 ? 'Standard' : 'At Risk',
    }));

    res.json({ success: true, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PFI HISTORY ───────────────────────────
// GET /api/pfi/history/:userId
router.get('/history/:userId', protect, async (req, res) => {
  try {
    const history = await PFITransaction.find({ freelancer: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('project', 'title');

    res.json({ success: true, count: history.length, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ANY FREELANCER PFI ────────────────
// GET /api/pfi/:userId
router.get('/:userId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('firstName lastName skill pfi role');
    if (!user || user.role !== 'freelancer') {
      return res.status(404).json({ success: false, message: 'Freelancer not found' });
    }

    res.json({
      success: true,
      freelancer: {
        id:       user._id,
        name:     `${user.firstName} ${user.lastName}`,
        skill:    user.skill,
        pfi:      user.pfi,
        tier:
          user.pfi.score >= 800 ? 'Elite'    :
          user.pfi.score >= 700 ? 'Trusted'  :
          user.pfi.score >= 600 ? 'Standard' : 'At Risk',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;