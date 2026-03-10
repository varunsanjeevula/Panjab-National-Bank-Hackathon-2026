const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ── Security Middleware ───────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', process.env.CLIENT_URL].filter(Boolean),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/cbom', require('./routes/cbom'));
app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'QuantumShield Scanner API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ── Serve React Frontend in Production ────────────────────
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));

// Catch-all: serve React app for any non-API route (client-side routing)
app.get('*', (req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Route not found' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n════════════════════════════════════════════════════`);
  console.log(`  QuantumShield Scanner API`);
  console.log(`  Running on: http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`════════════════════════════════════════════════════\n`);
});

module.exports = app;
