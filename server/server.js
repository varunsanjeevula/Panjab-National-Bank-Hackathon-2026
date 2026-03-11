const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const { initScheduler } = require('./utils/scheduler');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

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
app.use('/api/admin', require('./routes/admin'));
app.use('/api/schedules', require('./routes/schedule'));

// VPN Scan endpoint
const { protect } = require('./middleware/auth');
const { scanVPNEndpoints } = require('../scanner/vpnProbe');
app.post('/api/vpn-scan', protect, async (req, res) => {
  try {
    const { host } = req.body;
    if (!host) return res.status(400).json({ error: 'Host is required' });
    const result = await scanVPNEndpoints(host);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'QuantumShield API Docs'
}));

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
app.get('/{*path}', (req, res) => {
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

// ── Start Server (skip in Vercel serverless) ──────────────
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`\n════════════════════════════════════════════════════`);
    console.log(`  QuantumShield Scanner API`);
    console.log(`  Running on: http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`════════════════════════════════════════════════════\n`);
    initScheduler();
  });
}

module.exports = app;
