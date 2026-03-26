// ── Gemini AI Chatbot Route ─────────────────────────────────────
const express = require('express');
const router = express.Router();

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBQqyeBjQisiC0jYuAA7AtPe3X07GTOil8';
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// System prompt with complete project context
const SYSTEM_PROMPT = `You are the AI assistant for **QuantumShield Scanner** — a Post-Quantum Cryptography (PQC) readiness assessment platform built for the PNB Hackathon 2026.

## About the Project
QuantumShield is an enterprise-grade scanner purpose-built for the banking sector. It connects to any public-facing TLS endpoint, performs a complete cryptographic audit, and produces a Cryptographic Bill of Materials (CBOM) with quantum-safety classifications.

## Tech Stack
- **Frontend:** React 18 + Vite 6, Recharts for charts, Lucide React icons, CSS custom properties design system
- **Backend:** Node.js 20 + Express 5, MongoDB Atlas with Mongoose ODM
- **Auth:** JWT + bcryptjs (12 salt rounds), Role-Based Access Control (Admin/Analyst/Viewer)
- **Scanner Engine:** Custom-built using Node.js built-in \`tls\` module + \`node-forge\` for ASN.1 certificate parsing
- **Reports:** PDFKit (PDF), json2csv (CSV), JSON export
- **Scheduling:** node-cron for automated recurring scans
- **Security:** Helmet.js, express-rate-limit, CORS, audit logging
- **Deployment:** Docker, Render, Vercel

## Scanner Engine Architecture
1. **TLS Probe (tlsProbe.js):** Performs TLS handshakes via \`tls.connect()\`, extracts certificates, cipher suites, TLS versions, ephemeral key info
2. **Quantum Classifier (quantumClassifier.js):** Classifies 40+ algorithms as Quantum-Safe, Quantum-Vulnerable, Quantum-Weakened, or Classically-Broken based on NIST FIPS 203-206
3. **CBOM Generator (cbomGenerator.js):** Compiles scan results into a structured Cryptographic Bill of Materials with a quantum score (0-100)
4. **Recommendations Engine (recommendations.js):** Generates actionable migration recommendations per component
5. **VPN Probe (vpnProbe.js):** Scans VPN gateways for cryptographic configuration

## Key Algorithms
- **Shor's Algorithm:** Breaks RSA, ECDHE, ECDSA (all asymmetric crypto) — this is why they're classified as "Quantum-Vulnerable"
- **Grover's Algorithm:** Halves symmetric key strength (AES-128 → 64-bit effective) — "Quantum-Weakened"
- **TF-IDF + Cosine Similarity:** Used in the built-in chatbot's intent classification engine
- **bcrypt (12 rounds):** Password hashing
- **Weighted Deduction Scoring:** Quantum score calculation (starts at 100, deducts for vulnerabilities)

## NIST PQC Standards
- **FIPS 203 — ML-KEM (Kyber):** Replaces RSA/ECDHE key exchange
- **FIPS 204 — ML-DSA (Dilithium):** Replaces RSA/ECDSA digital signatures
- **FIPS 205 — SLH-DSA (SPHINCS+):** Hash-based signatures
- **FIPS 206 — FN-DSA (FALCON):** Compact signatures

## Why Every Website Shows ~40/100
Almost no website uses PQC yet. Typical scan: RSA cert (-25) + RSA signature (-15) + ECDHE key exchange (-20) = 40/100. This is correct — the world hasn't migrated to PQC yet, which is the whole point of the tool.

## 21 Frontend Pages
Dashboard, New Scan, Scan History, Scan Results, CBOM Dashboard, Asset Inventory, Asset Detail, PQC Posture, Cyber Rating, Risk Heatmap, Compliance Mapping, Scan Comparison, Migration Roadmap, Remediation Tracker, Reports, Executive Reports, On-Demand Reports, Schedule Reporting, Schedule Manager, Admin Panel, Login

## Features
- TLS Deep Scan (TLS 1.0-1.3 probing, cipher enumeration)
- CBOM Generation (Cryptographic Bill of Materials)
- PQC Labeling (Fully Quantum Safe / Hybrid / Not PQC Ready)
- Executive Dashboard with animated charts
- Network/CIDR scanning, Cleartext detection
- VPN endpoint probing
- Scheduled scans (cron-based)
- Cyber Rating & Compliance Mapping (RBI, SEBI, NIST)
- Report Export (JSON, CSV, PDF)
- RBAC (Admin, Analyst, Viewer roles)
- Audit Logging
- AI Chatbot (rule-based + this Gemini integration)
- Dark/Light theme with glassmorphism UI

## Important Context
- This is a PNB (Punjab National Bank) Hackathon 2026 project
- The "Harvest Now, Decrypt Later" (HNDL) attack is real — adversaries intercept encrypted data today to decrypt later with quantum computers
- QuantumShield tells banks what needs to be migrated BEFORE quantum computers become powerful enough

Answer all questions about this project accurately. Be helpful, concise, and technical when needed. If asked about specific code, reference the file names above. Always relate answers back to the project's goal of quantum readiness assessment for banking.`;

// Conversation history per session (simple in-memory store)
const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session && Date.now() - session.lastAccess < SESSION_TTL) {
    session.lastAccess = Date.now();
    return session.history;
  }
  sessions.delete(sessionId);
  return [];
}

function updateSession(sessionId, history) {
  sessions.set(sessionId, { history: history.slice(-20), lastAccess: Date.now() });
}

// Cleanup old sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastAccess > SESSION_TTL) sessions.delete(id);
  }
}, 5 * 60 * 1000);

// POST /api/gemini/ask
router.post('/ask', async (req, res) => {
  try {
    const { question, sessionId = 'default' } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    const history = getSession(sessionId);

    // Build contents array with conversation history
    const contents = [];

    // Add conversation history
    for (const msg of history) {
      contents.push({
        role: msg.role,
        parts: [{ text: msg.text }]
      });
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: question.trim() }]
    });

    const requestBody = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        topP: 0.9,
      }
    };

    // Retry logic for rate limiting
    let response;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        if (response.ok) break;
        if (response.status === 429 && attempt < 2) {
          const delay = (attempt + 1) * 5000; // 5s, 10s for free tier
          console.log(`Gemini rate limited, retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        break;
      } catch (fetchErr) {
        lastError = fetchErr;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
      }
    }

    if (!response || !response.ok) {
      const errData = response ? await response.text() : (lastError?.message || 'Network error');
      console.error('Gemini API error:', response?.status, errData);
      return res.status(500).json({ 
        answer: 'Sorry, Gemini AI is currently unavailable. Please try again or switch to the built-in assistant.',
        error: true 
      });
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text 
      || 'Sorry, I couldn\'t generate a response.';

    // Update conversation history
    history.push({ role: 'user', text: question.trim() });
    history.push({ role: 'model', text: answer });
    updateSession(sessionId, history);

    res.json({ answer, source: 'gemini' });

  } catch (err) {
    console.error('Gemini route error:', err);
    res.status(500).json({ 
      answer: 'Sorry, something went wrong with Gemini AI. Please try again.',
      error: true 
    });
  }
});

module.exports = router;
