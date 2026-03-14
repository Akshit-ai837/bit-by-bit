// ─────────────────────────────────────────
//  services/pfiService.js
//  Calculates and updates PFI scores
// ─────────────────────────────────────────

const User           = require('../models/User');
const PFITransaction = require('../models/PFITransaction');

// Score deltas per event
const PFI_DELTAS = {
  full_completion:    +15,
  partial_completion: -5,
  late_delivery:      -8,
  dispute:            -25,
  high_quality:       +10,  // bonus when AQA score >= 90
  bonus:              +5,
};

// ── UPDATE PFI ────────────────────────────
async function updatePFI(freelancerId, projectId, milestoneName, event, aqaScore) {
  try {
    const user = await User.findById(freelancerId);
    if (!user || user.role !== 'freelancer') return;

    const delta      = PFI_DELTAS[event] || 0;
    const scoreBefore = user.pfi.score;
    const scoreAfter  = Math.max(0, Math.min(1000, scoreBefore + delta));

    // Update PFI fields
    user.pfi.score = scoreAfter;

    if (event === 'full_completion' || event === 'high_quality') {
      user.pfi.accuracy = Math.min(100, user.pfi.accuracy + 1);
    }
    if (event === 'late_delivery') {
      user.pfi.deadline = Math.max(0, user.pfi.deadline - 2);
    }
    if (event === 'dispute') {
      user.pfi.disputes += 1;
      user.pfi.deadline  = Math.max(0, user.pfi.deadline - 3);
    }
    if (event === 'full_completion') {
      user.pfi.deadline = Math.min(100, user.pfi.deadline + 1);
    }

    await user.save();

    // Log the transaction
    await PFITransaction.create({
      freelancer:  freelancerId,
      project:     projectId,
      milestone:   milestoneName,
      event,
      delta,
      scoreBefore,
      scoreAfter,
      note: buildNote(event, aqaScore),
    });

    console.log(`📊 PFI updated for ${freelancerId}: ${scoreBefore} → ${scoreAfter} (${delta > 0 ? '+' : ''}${delta})`);
    return { scoreBefore, scoreAfter, delta };
  } catch (err) {
    console.error('PFI update failed:', err.message);
  }
}

function buildNote(event, aqaScore) {
  const notes = {
    full_completion:    `Milestone fully completed. AQA score: ${aqaScore}/100`,
    partial_completion: `Milestone partially completed. AQA score: ${aqaScore}/100`,
    late_delivery:      'Milestone completed after deadline',
    dispute:            `Milestone unmet. AQA score: ${aqaScore}/100`,
    high_quality:       `High quality bonus — AQA score: ${aqaScore}/100`,
    bonus:              'Performance bonus applied',
  };
  return notes[event] || '';
}

// ── GET PFI TIER ──────────────────────────
function getPFITier(score) {
  if (score >= 800) return 'Elite';
  if (score >= 700) return 'Trusted';
  if (score >= 600) return 'Standard';
  return 'At Risk';
}

module.exports = { updatePFI, getPFITier };