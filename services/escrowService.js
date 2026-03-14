// ─────────────────────────────────────────
//  services/escrowService.js
//  Handles fund release and refund logic
// ─────────────────────────────────────────

const Project = require('../models/Project');

// ── RELEASE PAYMENT ───────────────────────
async function releaseEscrow(project, milestone, freelancerId) {
  milestone.status     = 'done';
  milestone.releasedAt = new Date();

  project.escrow.released += milestone.payment;
  project.escrow.locked   -= milestone.payment;
  project.escrow.locked    = Math.max(0, project.escrow.locked);

  // Activate next milestone if exists
  const milestones = project.milestones;
  const currentIdx = milestones.findIndex((m) => m._id.equals(milestone._id));
  if (currentIdx + 1 < milestones.length) {
    milestones[currentIdx + 1].status = 'active';
  }

  // Check if all milestones are done
  const allDone = milestones.every((m) => m.status === 'done' || m.status === 'refunded');
  if (allDone) {
    project.status = 'completed';
  }

  await project.save();

  console.log(`✅ Escrow released ₹${milestone.payment} for milestone: ${milestone.name}`);
  return { released: milestone.payment };
}

// ── REFUND PAYMENT ────────────────────────
async function refundEscrow(project, milestone) {
  milestone.status = 'refunded';

  project.escrow.refunded += milestone.payment;
  project.escrow.locked   -= milestone.payment;
  project.escrow.locked    = Math.max(0, project.escrow.locked);

  await project.save();

  console.log(`🔄 Escrow refunded ₹${milestone.payment} for milestone: ${milestone.name}`);
  return { refunded: milestone.payment };
}

module.exports = { releaseEscrow, refundEscrow };