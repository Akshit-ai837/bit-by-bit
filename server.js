// ─────────────────────────────────────────
//  TrustChain AI — server.js
//  Main Express server entry point
// ─────────────────────────────────────────

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ── MIDDLEWARE ─────────────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests from any origin when FRONTEND_URL=* (or unset)
    if (!origin || process.env.FRONTEND_URL === '*' || !process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    if (origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
};

app.use(cors(corsOptions));
app.use(express.json());

// ── ROUTES ─────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/projects',   require('./routes/projects'));
app.use('/api/milestones', require('./routes/milestones'));
app.use('/api/escrow',     require('./routes/escrow'));
app.use('/api/pfi',        require('./routes/pfi'));
app.use('/api/demo',       require('./routes/demo'));

// ── HEALTH CHECK ───────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'TrustChain AI Backend is running',
    version: '1.0.0',
  });
});

// ── 404 HANDLER ────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── ERROR HANDLER ──────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ── DATABASE + START ───────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });