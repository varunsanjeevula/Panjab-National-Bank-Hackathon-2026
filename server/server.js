const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const { initScheduler } = require('./utils/scheduler');
const { initTelegramBot } = require('./utils/telegramBot');
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

// Rate limiting — auth endpoints get a generous limit so login/me never fail
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,                      // 100 auth requests per 15 min (login, register, me)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests, please try again later' }
});
// General API limiter — high enough for dashboard pages that fire many parallel calls
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,                     // 1000 requests per 15 min per IP
  standardHeaders: true,         // Return rate-limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});
// Apply auth limiter ONLY to auth routes, general limiter to everything else
app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);

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
app.use('/api/asset-inventory', require('./routes/assetInventory'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/gemini', require('./routes/gemini'));

// VPN Scan endpoint
const { protect } = require('./middleware/auth');
const { authorize } = require('./middleware/rbac');
const { scanVPNEndpoints } = require('../scanner/vpnProbe');
app.post('/api/vpn-scan', protect, authorize('admin', 'analyst'), async (req, res) => {
  try {
    const { host } = req.body;
    if (!host) return res.status(400).json({ error: 'Host is required' });
    const result = await scanVPNEndpoints(host);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WHOIS lookup — find domain owner email
app.get('/api/whois/:domain', protect, async (req, res) => {
  try {
    const whois = require('whois-json');
    const domain = req.params.domain.replace(/^(www\.)/i, '');
    const result = await whois(domain);

    // Extract emails from WHOIS data
    const data = Array.isArray(result) ? result[0] : result;
    let emails = [];

    // Check common WHOIS fields for emails
    const emailFields = [
      'registrantEmail', 'adminEmail', 'techEmail', 'abuseContactEmail',
      'contactEmail', 'email', 'registrant_email', 'admin_email', 'abuse_email'
    ];

    for (const field of emailFields) {
      if (data[field] && typeof data[field] === 'string' && data[field].includes('@')) {
        emails.push(data[field].trim().toLowerCase());
      }
    }

    // Also scan all values for email patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const allText = JSON.stringify(data);
    const foundEmails = allText.match(emailRegex) || [];
    foundEmails.forEach(e => {
      const lower = e.toLowerCase();
      if (!emails.includes(lower) && !lower.includes('whois') && !lower.includes('example')) {
        emails.push(lower);
      }
    });

    // Deduplicate
    emails = [...new Set(emails)];

    // Fallback: common abuse/admin patterns
    if (emails.length === 0) {
      emails = [`abuse@${domain}`, `admin@${domain}`, `webmaster@${domain}`];
    }

    res.json({
      domain,
      emails,
      registrant: data.registrantOrganization || data.registrantName || data.registrant || null,
      registrar: data.registrar || null,
      raw: {
        registrantName: data.registrantName || null,
        registrantOrg: data.registrantOrganization || null,
        adminName: data.adminName || null,
        techName: data.techName || null,
      }
    });
  } catch (err) {
    console.error('[WHOIS] Lookup failed:', err.message);
    // Return fallback emails even on error
    const domain = req.params.domain.replace(/^(www\.)/i, '');
    res.json({
      domain,
      emails: [`abuse@${domain}`, `admin@${domain}`],
      registrant: null,
      registrar: null,
      error: 'WHOIS lookup failed, using fallback emails',
    });
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
    initTelegramBot();
  });
}

module.exports = app;
