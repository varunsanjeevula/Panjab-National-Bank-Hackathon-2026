# 🛡️ QuantumShield Scanner — Project Presentation Guide

### Post-Quantum Cryptography Readiness Assessment for Banking Infrastructure
**Team Project — PNB Hackathon 2026**

---

## 📌 Problem Statement

Quantum computers are advancing rapidly. When they become powerful enough, **Shor's algorithm** will break all classical asymmetric cryptography — RSA, ECDHE, ECDSA — in polynomial time. This means every encrypted banking transaction, credential, and certificate becomes compromised.

Even more threatening is the **"Harvest Now, Decrypt Later" (HNDL)** attack — adversaries are already intercepting encrypted banking data today, storing it until quantum computers can break it.

**QuantumShield Scanner** solves this by auditing a bank's entire TLS infrastructure, identifying which cryptographic assets are quantum-vulnerable, and providing a clear migration roadmap to NIST-standardized Post-Quantum Cryptography (PQC).

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | React | 18+ | Interactive dashboard & UI |
| **Build Tool** | Vite | 6.x | Fast HMR, modern bundling |
| **Charts** | Recharts | — | Data visualization (donut, line, bar charts) |
| **Backend** | Express.js | 5.x | REST API server |
| **Runtime** | Node.js | 20+ | Server-side JavaScript runtime |
| **Database** | MongoDB Atlas | — | NoSQL document store via Mongoose ODM |
| **Auth** | JWT + bcryptjs | — | Stateless token auth + password hashing |
| **TLS Probing** | Node.js `tls` module | Built-in | TLS handshake & certificate extraction |
| **Certificate Parsing** | node-forge | 1.3.x | ASN.1 DER certificate decoding |
| **Reports** | PDFKit + json2csv | — | PDF & CSV report generation |
| **Scheduling** | node-cron | 4.x | Cron-based automated scans |
| **API Docs** | Swagger (swagger-jsdoc) | — | Auto-generated OpenAPI docs |
| **Security** | Helmet + express-rate-limit | — | HTTP header hardening + rate limiting |
| **Deployment** | Docker / Render / Vercel | — | Multi-platform cloud deployment |

### Languages Used
- **JavaScript (ES6+)** — Frontend and Backend
- **JSX** — React component templating
- **CSS3** — Custom design system with CSS custom properties
- **HTML5** — Semantic web structure

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     QuantumShield Scanner                        │
│                                                                  │
│  ┌────────────┐    ┌───────────────┐    ┌──────────────┐  ┌───┐ │
│  │   React    │    │  Express.js   │    │   Scanner    │  │Mon│ │
│  │  Frontend  │◄──►│  REST API     │◄──►│   Engine     │◄►│go │ │
│  │  (Vite)   │    │  + Swagger    │    │  (TLS Probe) │  │DB │ │
│  └────────────┘    └───────────────┘    └──────────────┘  └───┘ │
│       │                   │                    │                  │
│       ▼                   ▼                    ▼                  │
│  21 Dashboard Pages   JWT/RBAC Auth      Target Endpoints        │
│  Charts & Reports     Rate Limiting      TLS Handshakes          │
│  CBOM Viewer          Helmet Security    Cert Chain Parsing      │
│  AI Chatbot           Audit Logging      Quantum Classification  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Feature-by-Feature Breakdown

### Feature 1: TLS Deep Scan Engine

**What it does:** Connects to any TLS endpoint (e.g., `onlinesbi.sbi:443`) and performs a complete cryptographic audit.

**How it works (Code: `scanner/tlsProbe.js`):**
1. Uses Node.js's built-in `tls.connect()` to initiate a TLS handshake with `rejectUnauthorized: false` (to inspect all certs, even self-signed).
2. Extracts:
   - **Negotiated cipher suite** — via `socket.getCipher()`
   - **TLS protocol version** — via `socket.getProtocol()`
   - **Full certificate chain** — via `socket.getPeerCertificate(true)` (leaf → intermediate → root)
   - **Ephemeral key info** — via `socket.getEphemeralKeyInfo()` (for PFS detection)
3. **Certificate parsing** uses `node-forge` library to decode raw ASN.1 DER data and extract the signature algorithm OID.
4. **TLS version detection** probes each TLS version (1.0, 1.1, 1.2, 1.3) individually to map all supported versions.
5. **Cipher suite enumeration** tests 25+ individual cipher suites by attempting separate connections with each one.

**Key algorithm:** Brute-force cipher enumeration — attempt individual TLS handshakes with specific cipher strings to determine support.

---

### Feature 2: Quantum Safety Classification Engine

**What it does:** Classifies every cryptographic algorithm as Quantum-Safe, Vulnerable, Weakened, or Classically-Broken.

**How it works (Code: `scanner/quantumClassifier.js`):**
1. Maintains a **classification database of 40+ algorithms** covering:
   - Key Exchange: RSA, ECDHE, DHE, X25519, X448, PSK, ML-KEM (Kyber)
   - Digital Signatures: ECDSA, EdDSA, DSS, ML-DSA (Dilithium), SLH-DSA (SPHINCS+), FN-DSA (FALCON)
   - Symmetric Ciphers: AES-256-GCM, AES-128-GCM, ChaCha20-Poly1305, 3DES, RC4, DES
   - Hash Functions: SHA-256, SHA-384, SHA-512, SHA-1, MD5
2. Each algorithm entry includes:
   - `quantumStatus` — Safe / Vulnerable / Weakened / Broken
   - `severity` — Critical / High / Medium / Low / None
   - `reason` — Why it's vulnerable (e.g., "broken by Shor's algorithm")
   - `nistGuidance` — Migration recommendation (e.g., "Migrate to ML-KEM FIPS 203")
3. **`classifyAlgorithm()`** function: Normalizes input → direct lookup → normalized lookup → regex pattern matching for PQC algorithms.
4. **`classifyCipherSuite()`** function: Decomposes cipher suite into 4 components (keyExchange, authentication, bulkCipher, hash) and classifies each independently. Overall status = worst component.
5. **`determineEndpointLabel()`** function: Evaluates the entire endpoint (cert + cipher suites + TLS versions) and assigns one of four labels:
   - ✅ **Fully Quantum Safe** — All components PQC
   - 🔶 **Hybrid Mode** — Mix of classical + PQC
   - ❌ **Not PQC Ready** — Only classical algorithms
   - 🔴 **Critical — Not PQC Ready** — Uses broken/deprecated algorithms

**NIST Standards referenced:**
| Standard | Algorithm | Replaces |
|---|---|---|
| FIPS 203 | ML-KEM (Kyber) | RSA/ECDHE key exchange |
| FIPS 204 | ML-DSA (Dilithium) | RSA/ECDSA signatures |
| FIPS 205 | SLH-DSA (SPHINCS+) | Hash-based signatures |
| FIPS 206 | FN-DSA (FALCON) | Compact signatures |

---

### Feature 3: Cryptographic Bill of Materials (CBOM) Generation

**What it does:** Produces a comprehensive inventory of ALL cryptographic assets found on an endpoint — analogous to an SBOM but for cryptography.

**How it works (Code: `scanner/cbomGenerator.js`):**
1. **`generateCBOM()`** takes raw scan data and compiles:
   - TLS version analysis (supported, deprecated, best version)
   - Certificate analysis with quantum-safety classification for key AND signature algorithms
   - Full cipher suite inventory with per-suite quantum classification
   - Ephemeral key exchange classification
2. **Quantum Score (0–100):** A weighted deduction-based scoring algorithm:
   - Certificate key vulnerable: −25 points
   - Certificate key broken: −35 points
   - Certificate signature vulnerable: −15 points
   - Deprecated TLS versions: −20 points
   - No TLS 1.3: −5 points
   - Vulnerable key exchange: −20 points
   - Broken ciphers: −15 points
   - PQC key exchange detected: +10 bonus
3. **Statistics** are auto-generated: total suites, safe/vulnerable/broken counts, unique algorithms, recommendation counts.

---

### Feature 4: Remediation Recommendations Engine

**What it does:** Generates specific, actionable migration recommendations for every vulnerable component found.

**How it works (Code: `scanner/recommendations.js`):**
1. Analyzes 5 categories: Certificates (key + signature + expiry), Key Exchange, Symmetric Ciphers, TLS Versions, Hash Algorithms.
2. Each recommendation includes: ID, category, severity, component, vulnerability description, specific fix, NIST reference, priority level, and effort estimate.
3. **Priority system:** 0 = immediate action, 1-2 = short-term, 3+ = long-term.
4. **`generateExecutiveSummary()`** aggregates all recommendations into immediate/short-term/long-term action buckets.
5. De-duplicates recommendations using a `Set` to avoid repeating the same fix.

---

### Feature 5: Scan Orchestrator (Single + Batch Scanning)

**What it does:** Coordinates the entire scan lifecycle for single or multiple targets.

**How it works (Code: `scanner/index.js`):**
1. **`scanEndpoint()`** — 4-step pipeline:
   - Step 1: Primary TLS handshake (get cert, negotiated cipher)
   - Step 2: Detect supported TLS versions (probe 1.0–1.3)
   - Step 3: Enumerate all supported cipher suites
   - Step 4: Generate CBOM with classifications + recommendations
2. **`scanMultiple()`** — Batch scanning with:
   - Rate limiting between scans (configurable delay to avoid IDS)
   - Aggregate statistics: label distribution, average score, pass/fail counts
   - Sequential processing with error isolation per target

---

### Feature 6: VPN Endpoint Probing

**What it does:** Scans VPN gateways for cryptographic configuration assessment.

**How it works (Code: `scanner/vpnProbe.js`):**
- Probes common VPN ports (443, 500, 4500, 1194, 1723, 10000)
- Checks for IPsec (IKE), OpenVPN, PPTP, and SSTP protocols
- Flag deprecated VPN protocols (PPTP) as critical

---

### Feature 7: Authentication & Role-Based Access Control (RBAC)

**What it does:** Secure multi-role user management system.

**How it works (Code: `server/routes/auth.js`, `server/middleware/`):**
1. **Registration:** Password hashed with bcryptjs (12 salt rounds) before storing in MongoDB.
2. **Login:** Compares bcrypt hash → issues JWT token with user ID and role.
3. **RBAC middleware** checks role on every protected route:
   - **Admin** — Full access + user management + audit logs
   - **Analyst** — Can scan, view, export (no user management)
   - **Viewer** — Read-only access to all dashboards
4. **Route protection** in React: `ProtectedRoute`, `AdminRoute`, `AnalystRoute` HOCs check auth state before rendering.

---

### Feature 8: AI-Powered Chatbot Assistant

**What it does:** An intelligent chatbot that answers questions about scan data, PQC concepts, and platform navigation using live MongoDB data.

**How it works (Code: `server/routes/chatbot.js`, `server/chatbot/`):**

**5-Layer Processing Architecture:**
1. **Layer 1 — Phrase Pattern Match:** Exact substring matching against 1,300+ question patterns for highest precision.
2. **Layer 2 — Glossary Match:** Handles "What is X?" questions against a 20+ term glossary database.
3. **Layer 3 — TF-IDF Cosine Similarity:** Intent classification using term frequency–inverse document frequency. Tokenizes the question, computes TF-IDF vectors, and ranks intents by cosine similarity score.
4. **Layer 4 — FAQ Match:** Falls back to FAQ pattern matching.
5. **Layer 5 — Partial Glossary Match:** Searches for glossary terms anywhere in the question.

**40+ supported intents** including: scan stats, vulnerability counts, PQC scores, certificate alerts, compliance status, remediation tracking, page guides, and project info.

**Live data queries:** The chatbot aggregates real MongoDB data (Scan, CbomRecord models) to give accurate answers like "You have 5 critical assets" — not pre-written text.

**Response caching:** 60-second TTL cache for expensive MongoDB aggregations to prevent repeated queries.

---

### Feature 9: Executive Dashboard & Charts

**What it does:** Visual command center showing overall quantum readiness at a glance.

**How it works (Code: `client/src/pages/Dashboard.jsx`):**
- 4 animated stat cards (Total Scans, Assets, PQC Score, Critical Alerts)
- Donut chart: Quantum safety breakdown (Critical/Vulnerable/Hybrid/Safe) via Recharts
- Line chart: PQC readiness score trends over time
- Recent scans table with status badges
- Risk distribution progress bar

---

### Feature 10: CBOM Dashboard

**What it does:** Interactive viewer for the Cryptographic Bill of Materials.

**How it works (Code: `client/src/pages/CbomDashboard.jsx`):**
- Per-host CBOM breakdown with drill-down
- Algorithm distribution charts
- Cipher suite decomposition tables
- Certificate chain visualization
- Quantum safety labels per component
- Export in JSON/CSV/PDF

---

### Feature 11: Asset Inventory System

**What it does:** Comprehensive inventory of all discovered cryptographic assets.

**How it works (Code: `client/src/pages/AssetInventory.jsx`, `server/routes/assetInventory.js`):**
- 4 asset categories: Domains, SSL Certificates, IP Addresses, Software
- Certificate health monitoring (valid, expiring, expired)
- Detailed per-asset view with full CBOM data
- Search, filter, and sort capabilities

---

### Feature 12: Risk Heatmap Visualization

**What it does:** Color-coded grid showing quantum vulnerability across all assets.

**How it works (Code: `client/src/pages/RiskHeatmap.jsx`):**
- Each cell = one scanned host
- Color scale: 🔴 Critical → 🟠 Vulnerable → 🟡 Hybrid → 🟢 Safe
- Hover tooltips with host details and scores
- Summary statistics per risk level

---

### Feature 13: Compliance Mapping

**What it does:** Maps scan results against regulatory frameworks.

**How it works (Code: `client/src/pages/ComplianceMapping.jsx`):**
- **RBI** (Reserve Bank of India) — Banking cryptography mandates
- **SEBI** (Securities and Exchange Board of India) — Securities compliance
- **NIST** — US PQC standards (FIPS 203/204/205)
- Compliance percentage gauges per framework
- Gap analysis showing unmet requirements

---

### Feature 14: Cyber Rating & PQC Posture

**What it does:** Composite security rating and detailed PQC adoption metrics.

**How it works (Code: `client/src/pages/CyberRating.jsx`, `PqcPosture.jsx`):**
- Overall security score with category breakdown
- Algorithm inventory with per-algorithm quantum classification
- PQC adoption percentage tracking
- Migration status dashboard

---

### Feature 15: Migration Roadmap & Remediation Tracker

**What it does:** 4-phase strategic migration plan with task tracking.

**How it works (Code: `client/src/pages/MigrationRoadmap.jsx`, `RemediationTracker.jsx`):**
- **Phase 1 — Immediate:** Replace critical/deprecated algorithms
- **Phase 2 — Short-term (0–6 months):** Upgrade high-risk systems
- **Phase 3 — Medium-term (6–18 months):** Full PQC adoption
- **Phase 4 — Ongoing:** Monitor and maintain
- Per-task status tracking: Pending → In Progress → Completed → Deferred

---

### Feature 16: Scan Comparison

**What it does:** Side-by-side comparison of two scans to track improvement.

**How it works (Code: `client/src/pages/ScanComparison.jsx`):**
- Score delta calculation (improvement/degradation)
- Per-host comparison
- Label category shift tracking

---

### Feature 17: Report Generation & Export

**What it does:** Generate downloadable reports in multiple formats.

**How it works (Code: `server/routes/reports.js`):**
- **PDF** — Executive summary with charts (via PDFKit)
- **CSV** — Raw data export (via json2csv)
- **JSON** — Machine-readable format
- Reports include: PQC scores, algorithm assessments, compliance results, remediation recommendations

---

### Feature 18: Scheduled Scanning (Cron Automation)

**What it does:** Automated recurring scans on a schedule.

**How it works (Code: `server/routes/schedule.js`, `server/utils/scheduler.js`):**
- Uses `node-cron` for scheduling
- Supports daily, weekly, monthly frequencies
- Auto-stores results in MongoDB
- Configurable targets per schedule

---

### Feature 19: Audit Logging

**What it does:** Complete audit trail of all user and system actions.

**How it works (Code: `server/models/AuditLog.js`, `server/routes/admin.js`):**
- Logs: who did what, when, from which IP
- Tracks: scans initiated, reports exported, users created
- Admin-only access to audit logs

---

### Feature 20: Security Hardening

**What it does:** Multi-layer security for the application itself.

**How it works (Code: `server/server.js`):**
- **Helmet.js** — Sets secure HTTP headers (CSP, HSTS, X-Frame-Options)
- **Rate Limiting** — 100 auth requests / 15 min, 1000 API requests / 15 min
- **CORS** — Restricted origins list
- **Input validation** — Body size limit (10MB), type checking
- **JWT expiration** — Tokens auto-expire

---

### Feature 21: Dark/Light Theme & Premium UI

**What it does:** Enterprise-grade UI with glassmorphism design system.

**How it works (Code: `client/src/index.css`, `client/src/App.jsx`):**
- CSS custom properties design system with `data-theme` attribute
- Smooth theme transitions with `theme-transition` class
- Theme persisted in localStorage
- Glassmorphism cards, gradient backgrounds, micro-animations
- Responsive sidebar with collapsible sections
- Keyboard shortcuts (Ctrl+D = Dashboard, Ctrl+N = New Scan)

---

## 🧮 Key Algorithms Used

| Algorithm/Technique | Where Used | Purpose |
|---|---|---|
| **TF-IDF + Cosine Similarity** | Chatbot Intent Engine | Natural language intent classification |
| **Shor's Algorithm** (referenced) | Quantum Classifier | Why RSA/ECC are vulnerable |
| **Grover's Algorithm** (referenced) | Quantum Classifier | Why AES-128 is weakened |
| **bcrypt (12 rounds)** | Auth System | Secure password hashing |
| **JWT (HMAC-SHA256)** | Auth System | Stateless authentication tokens |
| **Weighted Deduction Scoring** | CBOM Generator | Quantum-safety score (0–100) |
| **ASN.1 DER Parsing** | TLS Probe | Certificate signature extraction |
| **Cipher Brute-Force Enumeration** | TLS Probe | Testing individual cipher support |

---

## 📊 Project Statistics

| Metric | Value |
|---|---|
| Total frontend pages | **21 React pages** |
| Scanner engine modules | **7 files** |
| Backend API routes | **8 route modules** |
| Database models | **5 Mongoose schemas** |
| Algorithm classifications | **40+** |
| Chatbot intents | **40+ with 1,300+ patterns** |
| NIST standards covered | **4 (FIPS 203, 204, 205, 206)** |
| Report formats | **3 (JSON, CSV, PDF)** |
| User roles | **3 (Admin, Analyst, Viewer)** |
| Lines of code | **~15,000+** |

---

## 🔄 End-to-End Scan Flow (What Happens When You Click "Start Scan")

```
User enters "onlinesbi.sbi:443" → clicks Start Scan
         │
         ▼
[1] POST /api/scan → Backend validates input
         │
         ▼
[2] scanEndpoint("onlinesbi.sbi", 443) called
         │
         ├─► tls.connect() → TLS handshake → extract cipher + cert
         ├─► detectSupportedVersions() → probe TLS 1.0–1.3
         ├─► enumerateCipherSuites() → test 25+ cipher suites
         │
         ▼
[3] generateCBOM() called
         │
         ├─► classifyAlgorithm() for each component
         ├─► classifyCipherSuite() for each suite
         ├─► determineEndpointLabel() → overall PQC label
         ├─► calculateQuantumScore() → 0–100 score
         ├─► generateRecommendations() → actionable fixes
         │
         ▼
[4] CBOM stored in MongoDB (CbomRecord + Scan models)
         │
         ▼
[5] Frontend receives result → Dashboard updates
         │
         ├─► Donut chart updates with new classification
         ├─► Score trend line extends
         ├─► Asset inventory adds new entries
         ├─► Risk heatmap adds new cell
         └─► Compliance scores recalculate
```

---

## 🚀 Deployment

- **Live Demo:** [https://panjab-national-bank-hackathon-2026.onrender.com](https://panjab-national-bank-hackathon-2026.onrender.com)
- **Docker:** Multi-stage build with `Dockerfile`
- **Render:** One-click deploy via `render.yaml`
- **Vercel:** Frontend deployment via `vercel.json`

---

## 🏆 What Makes QuantumShield Unique

1. **First-of-its-kind PQC scanner** purpose-built for banking
2. **CBOM generation** — complete cryptographic inventory (like SBOM, but for crypto)
3. **Indian compliance focus** — RBI + SEBI mapping (rare in global tools)
4. **21-page enterprise dashboard** — not a CLI tool, a full platform
5. **AI chatbot** with live MongoDB data queries (no external APIs)
6. **4-phase migration roadmap** — actionable, not just advisory
7. **Zero external TLS dependencies** — uses Node.js built-in `tls` module

---

> _Built with ❤️ for the PNB Hackathon 2026 — Defending banking infrastructure against the quantum threat._
