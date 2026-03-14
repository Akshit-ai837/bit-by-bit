// ─────────────────────────────────────────
//  models/PFITransaction.js
//  Tracks every PFI score change event
// ─────────────────────────────────────────

const mongoose = require('mongoose');

const pfiTransactionSchema = new mongoose.Schema(
  {
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    milestone:  { type: String, required: true },

    event: {
      type: String,
      enum: ['full_completion', 'partial_completion', 'late_delivery', 'dispute', 'high_quality', 'bonus'],
      required: true,
    },

    delta:     { type: Number, required: true },  // +15, -5, etc.
    scoreBefore: { type: Number, required: true },
    scoreAfter:  { type: Number, required: true },
    note:        { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PFITransaction', pfiTransactionSchema);