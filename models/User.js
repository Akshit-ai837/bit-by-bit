// ─────────────────────────────────────────
//  models/User.js
// ─────────────────────────────────────────

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true, minlength: 8 },
    role:      { type: String, enum: ['client', 'freelancer'], required: true },
    skill:     { type: String, default: null },   // freelancer only

    // PFI score — only relevant for freelancers
    pfi: {
      score:    { type: Number, default: 500 },
      accuracy: { type: Number, default: 50 },
      deadline: { type: Number, default: 50 },
      disputes: { type: Number, default: 0 },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Virtual: full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);