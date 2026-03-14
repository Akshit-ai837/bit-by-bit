// ─────────────────────────────────────────
//  models/Project.js
// ─────────────────────────────────────────

const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, required: true },
  days:        { type: Number, required: true },
  payment:     { type: Number, required: true },
  checklist:   [{ type: String }],
  status: {
    type: String,
    enum: ['locked', 'active', 'submitted', 'in_review', 'done', 'partial', 'refunded'],
    default: 'locked',
  },
  submittedWork:  { type: String, default: null },
  submittedLink:  { type: String, default: null },
  aqaScore:       { type: Number, default: null },
  aqaVerdict:     { type: String, default: null },
  aqaFeedback:    { type: String, default: null },
  releasedAt:     { type: Date, default: null },
});

const projectSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    description: { type: String, required: true },
    category:    { type: String, default: 'General' },
    budget:      { type: Number, required: true },
    timeline:    { type: String, default: '30 days' },

    client:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    milestones: [milestoneSchema],

    status: {
      type: String,
      enum: ['open', 'active', 'completed', 'cancelled'],
      default: 'open',
    },

    escrow: {
      total:    { type: Number, default: 0 },
      released: { type: Number, default: 0 },
      refunded: { type: Number, default: 0 },
      locked:   { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Auto-set escrow total from budget
projectSchema.pre('save', function (next) {
  if (this.isNew) {
    this.escrow.total  = this.budget;
    this.escrow.locked = this.budget;
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);