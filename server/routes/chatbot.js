// ── Chatbot API Routes ──────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { classifyIntent, matchGlossary, matchFAQ, matchPhrase } = require('../chatbot/intentEngine');
const { glossary, pageGuides, faq } = require('../chatbot/knowledgeBase');

// Import models
const Scan = require('../models/Scan');
const CbomRecord = require('../models/CbomRecord');

// ── Response Cache (60s TTL) ────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 60000;

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ── Data Fetchers ───────────────────────────────────────────────

async function getScanStats() {
  const cached = getCached('scan_stats');
  if (cached) return cached;

  const [total, completed, running, failed] = await Promise.all([
    Scan.countDocuments(),
    Scan.countDocuments({ status: 'completed' }),
    Scan.countDocuments({ status: 'running' }),
    Scan.countDocuments({ status: 'failed' }),
  ]);

  const lastScan = await Scan.findOne({ status: 'completed' }).sort({ completedAt: -1 }).lean();
  const result = { total, completed, running, failed, lastScan };
  setCache('scan_stats', result);
  return result;
}

async function getCbomStats() {
  const cached = getCached('cbom_stats');
  if (cached) return cached;

  const records = await CbomRecord.find({}, 'quantumAssessment.overallScore quantumAssessment.quantumSafetyLabel host').lean();

  if (records.length === 0) {
    return { totalAssets: 0, avgScore: 0, critical: 0, vulnerable: 0, hybrid: 0, safe: 0, worstHost: null, bestHost: null };
  }

  let critical = 0, vulnerable = 0, hybrid = 0, safe = 0;
  let totalScore = 0, worstScore = 101, bestScore = -1;
  let worstHost = null, bestHost = null;

  records.forEach(r => {
    const score = r.quantumAssessment?.overallScore || 0;
    const label = (r.quantumAssessment?.quantumSafetyLabel || '').toLowerCase();
    totalScore += score;

    if (label.includes('critical')) critical++;
    else if (label.includes('vulnerable')) vulnerable++;
    else if (label.includes('hybrid')) hybrid++;
    else safe++;

    if (score < worstScore) { worstScore = score; worstHost = r.host; }
    if (score > bestScore) { bestScore = score; bestHost = r.host; }
  });

  const result = {
    totalAssets: records.length,
    avgScore: Math.round(totalScore / records.length),
    critical, vulnerable, hybrid, safe,
    worstHost: { host: worstHost, score: worstScore },
    bestHost: { host: bestHost, score: bestScore },
  };

  setCache('cbom_stats', result);
  return result;
}

async function getCertStats() {
  const cached = getCached('cert_stats');
  if (cached) return cached;

  const records = await CbomRecord.find({}, 'certificate host').lean();
  const now = new Date();
  let totalCerts = 0, expiringSoon = 0, expired = 0;

  records.forEach(r => {
    if (r.certificate?.validTo) {
      totalCerts++;
      const expiry = new Date(r.certificate.validTo);
      if (expiry < now) expired++;
      else if (expiry < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) expiringSoon++;
    }
  });

  const result = { totalCerts, expiringSoon, expired };
  setCache('cert_stats', result);
  return result;
}

// ── Response Builders ───────────────────────────────────────────

const responseBuilders = {
  // Scan intents
  async scan_count() {
    const stats = await getScanStats();
    return { answer: `You have **${stats.total} total scans** — ${stats.completed} completed, ${stats.running} running, and ${stats.failed} failed.`, data: stats };
  },

  async scan_status() {
    const stats = await getScanStats();
    if (stats.running > 0) return { answer: `There ${stats.running === 1 ? 'is' : 'are'} **${stats.running} scan${stats.running > 1 ? 's' : ''} currently running**. ${stats.failed} scan${stats.failed !== 1 ? 's have' : ' has'} failed.` };
    return { answer: `No scans are currently running. **${stats.completed}** completed successfully, **${stats.failed}** failed out of ${stats.total} total.` };
  },

  async last_scan() {
    const stats = await getScanStats();
    if (!stats.lastScan) return { answer: 'No completed scans found yet. Go to **New Scan** to initiate your first scan.' };
    const date = new Date(stats.lastScan.completedAt || stats.lastScan.createdAt).toLocaleString();
    const targets = stats.lastScan.targets?.length || 0;
    const target = stats.lastScan.targets?.[0]?.host || 'unknown';
    return { answer: `Your last scan completed on **${date}**.\n• Target: **${target}** ${targets > 1 ? `(+${targets - 1} more)` : ''}\n• Status: ✅ Completed\n\nView full details in **Scan History**.` };
  },

  async scan_duration() {
    const lastScan = await Scan.findOne({ status: 'completed' }).sort({ completedAt: -1 }).lean();
    if (!lastScan || !lastScan.completedAt || !lastScan.createdAt) return { answer: 'No completed scan data available to calculate duration.' };
    const ms = new Date(lastScan.completedAt) - new Date(lastScan.createdAt);
    const seconds = Math.round(ms / 1000);
    return { answer: `The last scan took about **${seconds < 60 ? seconds + ' seconds' : Math.round(seconds / 60) + ' minutes'}** to complete.` };
  },

  // Security intents
  async vulnerable_count() {
    const stats = await getCbomStats();
    if (stats.totalAssets === 0) return { answer: 'No assets have been scanned yet. Run a scan first to assess vulnerability.' };
    const atRisk = stats.critical + stats.vulnerable;
    return { answer: `Out of **${stats.totalAssets}** scanned assets:\n• 🔴 **${stats.critical}** Critical (immediate migration needed)\n• 🟠 **${stats.vulnerable}** Vulnerable (at risk)\n• 🟡 **${stats.hybrid}** Hybrid (partial protection)\n• 🟢 **${stats.safe}** Safe (quantum-ready)\n\n**${atRisk}** assets require attention.`, data: stats };
  },

  async safe_count() {
    const stats = await getCbomStats();
    if (stats.totalAssets === 0) return { answer: 'No assets scanned yet. Run a scan to check quantum safety.' };
    const pct = Math.round((stats.safe / stats.totalAssets) * 100);
    return { answer: `**${stats.safe}** out of ${stats.totalAssets} assets are **quantum-safe** (${pct}%). Additionally, **${stats.hybrid}** have hybrid (partial) protection.`, data: stats };
  },

  async pqc_score() {
    const stats = await getCbomStats();
    if (stats.totalAssets === 0) return { answer: 'No PQC score available yet — run a scan first.' };
    let label = 'Critical';
    let emoji = '🔴';
    if (stats.avgScore > 75) { label = 'Safe'; emoji = '🟢'; }
    else if (stats.avgScore > 50) { label = 'Hybrid'; emoji = '🟡'; }
    else if (stats.avgScore > 25) { label = 'Vulnerable'; emoji = '🟠'; }
    return { answer: `${emoji} Your average PQC Readiness Score is **${stats.avgScore}/100** — classified as **${label}**.\n\n${stats.avgScore < 50 ? '⚠️ Immediate migration action is recommended.' : stats.avgScore < 75 ? 'Partial quantum protection is in place.' : '✅ Your infrastructure has strong quantum readiness!'}`, data: stats };
  },

  async worst_host() {
    const stats = await getCbomStats();
    if (!stats.worstHost?.host) return { answer: 'No scan data available to determine the weakest host.' };
    return { answer: `🔴 The most vulnerable host is **${stats.worstHost.host}** with a PQC score of **${stats.worstHost.score}/100**. Prioritize this for immediate remediation.` };
  },

  async best_host() {
    const stats = await getCbomStats();
    if (!stats.bestHost?.host) return { answer: 'No scan data available.' };
    return { answer: `🟢 Your strongest host is **${stats.bestHost.host}** with a PQC score of **${stats.bestHost.score}/100**. Great quantum readiness! 🎉` };
  },

  // Certificate intents
  async cert_expiring() {
    const stats = await getCertStats();
    if (stats.totalCerts === 0) return { answer: 'No certificates have been discovered yet. Run a scan to check SSL/TLS certificates.' };
    if (stats.expiringSoon === 0 && stats.expired === 0) return { answer: `All **${stats.totalCerts}** certificates are valid and not expiring soon. ✅` };
    return { answer: `⚠️ Certificate alert:\n• **${stats.expired}** already **expired**\n• **${stats.expiringSoon}** expiring within **30 days**\n• **${stats.totalCerts}** total certificates\n\nCheck **Asset Inventory → SSL tab** for details.` };
  },

  async cert_count() {
    const stats = await getCertStats();
    return { answer: `**${stats.totalCerts}** SSL/TLS certificates have been discovered across your scanned assets.` };
  },

  // Compliance intents
  async compliance_score() {
    const stats = await getCbomStats();
    if (stats.totalAssets === 0) return { answer: 'No compliance data available. Run scans first to generate compliance assessments.' };
    const safePct = Math.round(((stats.safe + stats.hybrid * 0.5) / stats.totalAssets) * 100);
    return { answer: `📊 Estimated overall compliance: **${safePct}%**\n• ${stats.safe} fully compliant assets\n• ${stats.hybrid} partially compliant\n\nVisit the **Compliance** page for detailed RBI, SEBI, and NIST breakdowns.` };
  },

  async rbi_status() {
    const stats = await getCbomStats();
    const safePct = stats.totalAssets > 0 ? Math.round(((stats.safe + stats.hybrid * 0.5) / stats.totalAssets) * 100) : 0;
    return { answer: `🏦 **RBI Compliance**: ~**${safePct}%**\n\nThe Reserve Bank of India mandates strong cryptographic standards for banking infrastructure. ${safePct < 70 ? '⚠️ Action needed to meet RBI requirements.' : '✅ Good standing with RBI guidelines.'}` };
  },

  async nist_status() {
    const stats = await getCbomStats();
    const safePct = stats.totalAssets > 0 ? Math.round((stats.safe / stats.totalAssets) * 100) : 0;
    return { answer: `📋 **NIST PQC Compliance**: **${safePct}%** of assets use NIST-standardized quantum-safe algorithms (ML-KEM, ML-DSA, SLH-DSA).\n\n${stats.critical + stats.vulnerable} assets still need migration to FIPS 203/204/205.` };
  },

  async compliance_gaps() {
    const stats = await getCbomStats();
    if (stats.critical + stats.vulnerable === 0) return { answer: '✅ No compliance gaps detected! All assets meet or partially meet regulatory requirements.' };
    return { answer: `⚠️ **${stats.critical + stats.vulnerable} compliance gaps** found:\n• 🔴 **${stats.critical}** using quantum-vulnerable algorithms (Critical)\n• 🟠 **${stats.vulnerable}** with weak configurations (Vulnerable)\n\nVisit **Compliance Mapping** for framework-specific details.` };
  },

  // Remediation intents
  async pending_fixes() {
    const stats = await getCbomStats();
    const pending = stats.critical + stats.vulnerable;
    return { answer: pending > 0 ? `🔧 **${pending}** assets require remediation:\n• ${stats.critical} critical (immediate action)\n• ${stats.vulnerable} vulnerable\n\nUse the **Remediation Tracker** to manage fixes.` : '✅ No pending remediations — all assets are safe or hybrid! 🎉' };
  },

  async remediation_progress() {
    const stats = await getCbomStats();
    if (stats.totalAssets === 0) return { answer: 'No remediation data available yet.' };
    const done = Math.round(((stats.safe + stats.hybrid) / stats.totalAssets) * 100);
    return { answer: `📈 Remediation progress: **${done}%** complete\n• ✅ ${stats.safe} fully remediated\n• 🟡 ${stats.hybrid} partially protected\n• ⏳ ${stats.critical + stats.vulnerable} still pending` };
  },

  async critical_actions() {
    const stats = await getCbomStats();
    if (stats.critical === 0) return { answer: '✅ No critical actions required — no assets in critical state.' };
    return { answer: `🚨 **${stats.critical} critical action${stats.critical > 1 ? 's' : ''}** required!\n\nThese assets use algorithms that will be completely broken by quantum computers. Immediate migration to NIST PQC standards is needed.\n\nCheck the **Migration Roadmap** for Phase 1 priorities.` };
  },

  // Asset intents
  async domain_count() {
    const count = await CbomRecord.distinct('host');
    return { answer: `🌐 **${count.length}** unique domains/hosts have been scanned and inventoried.` };
  },

  async cipher_info() {
    const records = await CbomRecord.find({}, 'cipherSuites').lean();
    const cipherCount = {};
    records.forEach(r => {
      (r.cipherSuites || []).forEach(cs => {
        const name = cs.name || cs.standardName || 'Unknown';
        cipherCount[name] = (cipherCount[name] || 0) + 1;
      });
    });
    const sorted = Object.entries(cipherCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (sorted.length === 0) return { answer: 'No cipher suite data available yet.' };
    const list = sorted.map(([name, count], i) => `${i + 1}. **${name}** (${count} hosts)`).join('\n');
    return { answer: `🔐 Top cipher suites in use:\n${list}` };
  },

  // Navigation intents
  async how_to_scan() {
    return { answer: '📝 **How to run a scan:**\n1. Click **New Scan** in the sidebar\n2. Enter targets in `host:port` format (e.g., `example.com:443`)\n3. Or upload a CSV file with your targets\n4. Configure options (port, timeout) if needed\n5. Click **Start Scan**\n\nResults will appear automatically when the scan completes!' };
  },

  async how_to_export() {
    return { answer: '📄 **How to export a report:**\n1. Go to **Reports** in the sidebar\n2. Select a completed scan from the dropdown\n3. Choose your format: **JSON**, **CSV**, or **PDF**\n4. The file will download immediately\n\nPDF reports include executive summaries, charts, and detailed findings.' };
  },

  async explain_page(page) {
    const guide = pageGuides[page];
    if (!guide) return { answer: 'I can explain any page! Navigate to a specific page and ask me about it, or click **📖 Page Guide** for details.' };
    const features = guide.features.map(f => `• ${f}`).join('\n');
    return { answer: `📖 **${page.charAt(0).toUpperCase() + page.slice(1)}**: ${guide.description}\n\n**Features:**\n${features}` };
  },

  async page_guide(page) {
    const guide = pageGuides[page];
    if (!guide) {
      return { answer: '📖 **Welcome to QuantumShield!**\n\nThis platform helps organizations assess their quantum computing readiness. Here are the key areas:\n\n• **Dashboard** — Overview of your security posture\n• **New Scan** — Run cryptographic assessments\n• **CBOM** — Cryptographic Bill of Materials\n• **Compliance** — RBI, SEBI, NIST compliance checks\n• **Risk Heatmap** — Visual risk overview\n• **Remediation** — Track fixes\n\nNavigate to any page and ask me for its guide!' };
    }
    const features = guide.features.map(f => `  • ${f}`).join('\n');

    // Add terminology relevant to this page
    let terminology = '';
    const pageTerms = {
      'dashboard': ['score', 'pqc', 'quantum safe'],
      'scan': ['scan', 'tls'],
      'history': ['scan'],
      'cbom': ['cbom', 'cipher suite'],
      'risk-heatmap': ['risk heatmap', 'score'],
      'compliance': ['compliance', 'rbi', 'nist'],
      'roadmap': ['migration roadmap', 'fips 203', 'fips 204'],
      'remediation': ['remediation'],
      'asset-inventory': ['asset inventory', 'certificate'],
      'cyber-rating': ['score', 'pqc'],
      'pqc-posture': ['pqc', 'quantum safe', 'hybrid'],
      'reports': ['scan'],
      'schedules': ['scan'],
    };

    const terms = pageTerms[page] || [];
    if (terms.length > 0) {
      const defs = terms.map(t => {
        const def = glossary[t];
        return def ? `• **${t.toUpperCase()}**: ${def.substring(0, 100)}...` : null;
      }).filter(Boolean).slice(0, 3);
      if (defs.length > 0) terminology = `\n\n**Key Terms:**\n${defs.join('\n')}`;
    }

    return { answer: `📖 **${page.charAt(0).toUpperCase() + page.replace(/-/g, ' ').slice(1)} — Page Guide**\n\n${guide.description}\n\n**Features:**\n${features}${terminology}\n\n💡 Ask me anything about this page's data!` };
  },

  async capabilities() {
    return { answer: '🛡️ **I can help you with:**\n\n📊 **Data & Analytics**\n• Scan counts, status, history, duration\n• PQC scores, vulnerable/safe asset counts\n• Certificate expiry alerts\n\n📋 **Compliance**\n• RBI, SEBI, NIST PQC status\n• Compliance gaps and scores\n\n🔧 **Actions**\n• How to run scans, export reports\n• Remediation progress, critical actions\n\n📖 **Knowledge**\n• Page guides and feature explanations\n• PQC terminology (ask "What is PQC?")\n• Project overview and tech stack\n\n💡 *Tip: Click **📖 Page Guide** for current page details!*' };
  },

  async greeting() {
    const stats = await getCbomStats();
    if (stats.totalAssets > 0) {
      return { answer: `👋 Hello! I'm your **QuantumShield Assistant**.\n\n📊 Quick overview:\n• **${stats.totalAssets}** assets scanned\n• Average PQC score: **${stats.avgScore}/100**\n• ${stats.critical > 0 ? `⚠️ ${stats.critical} critical assets need attention` : '✅ No critical issues'}\n\nHow can I help you today?` };
    }
    return { answer: '👋 Hello! I\'m your **QuantumShield Assistant**.\n\nI can help you with:\n• 📊 Scan results & PQC scores\n• 📋 Compliance status check\n• 📖 Page guides & terminologies\n• ❓ Any questions about quantum cryptography\n\nTry clicking **📖 Page Guide** or ask me anything!' };
  },

  async goodbye() {
    return { answer: 'Goodbye! 👋 Feel free to come back anytime you need help with your quantum readiness assessment.' };
  },

  // ── New: Glossary-specific intents ────────────────────────
  async glossary_pqc() { return { answer: `🔐 **Post-Quantum Cryptography (PQC)**\n\n${glossary['pqc']}\n\n**Why it matters:** Current encryption (RSA, ECC) will be broken by quantum computers. PQC ensures your data stays safe even when quantum computing becomes practical.\n\n**NIST Standards:**\n• FIPS 203 — ML-KEM (key exchange)\n• FIPS 204 — ML-DSA (digital signatures)\n• FIPS 205 — SLH-DSA (hash-based signatures)` }; },
  async glossary_cbom() { return { answer: `📋 **Cryptographic Bill of Materials (CBOM)**\n\n${glossary['cbom']}\n\nThink of it like a grocery list of all the cryptographic "ingredients" your system uses — algorithms, keys, certificates, and protocols. This helps you know exactly what needs to be upgraded for quantum safety.` }; },
  async glossary_tls() { return { answer: `🔒 **Transport Layer Security (TLS)**\n\n${glossary['tls']}\n\nTLS is what makes the padlock 🔒 appear in your browser's address bar. QuantumShield scans analyze TLS connections to check if the cipher suites used are quantum-safe.` }; },
  async glossary_quantum() { return { answer: `⚛️ **Quantum Computing & Crypto Threat**\n\nQuantum computers use quantum mechanics (superposition, entanglement) to solve certain problems exponentially faster than classical computers.\n\n**The threat:** Shor's algorithm can break RSA and ECC in polynomial time. Grover's algorithm halves the security of symmetric ciphers.\n\n**Timeline:** Experts estimate cryptographically-relevant quantum computers could arrive within 10-15 years. The time to prepare is NOW.` }; },
  async glossary_scan() { return { answer: `🔍 **How Scanning Works**\n\n${glossary['scan']}\n\n**Process:**\n1. Connect to target host on specified port\n2. Negotiate TLS handshake\n3. Extract cipher suites, certificates, protocols\n4. Classify each for quantum safety\n5. Generate CBOM and PQC score\n\nEach scan takes ~10-30 seconds per target.` }; },
  async glossary_score() { return { answer: `📊 **PQC Readiness Score (0-100)**\n\n${glossary['score']}\n\n**Breakdown:**\n• 🔴 **0-25** — Critical: Uses only vulnerable algorithms\n• 🟠 **26-50** — Vulnerable: Weak crypto posture\n• 🟡 **51-75** — Hybrid: Mix of classical + PQC\n• 🟢 **76-100** — Safe: Quantum-ready algorithms in use` }; },
  async glossary_compliance() { return { answer: `📋 **Regulatory Compliance**\n\n${glossary['compliance']}\n\n**Frameworks in QuantumShield:**\n• **RBI** — Reserve Bank of India banking standards\n• **SEBI** — Securities market regulations\n• **NIST** — US standards for PQC (FIPS 203/204/205)` }; },
  async glossary_heatmap() { return { answer: `🗺️ **Risk Heatmap**\n\n${glossary['risk heatmap']}\n\nThe heatmap gives you an instant visual overview — a sea of green means you're safe, red spots show where to focus migration efforts.` }; },
  async glossary_remediation() { return { answer: `🔧 **Remediation**\n\n${glossary['remediation']}\n\n**Status tracking:**\n• ⏳ Pending — Not started\n• 🔄 In Progress — Being fixed\n• ✅ Completed — Verified safe\n• ⏸️ Deferred — Postponed with justification` }; },
  async glossary_asset() { return { answer: `📦 **Asset Inventory**\n\n${glossary['asset inventory']}\n\n**4 categories tracked:**\n1. 🌐 Domains — registrar, DNS info\n2. 🔐 SSL Certificates — validity, fingerprints\n3. 🖥️ IP Addresses — geolocation via ipinfo.io\n4. 💻 Software — TLS versions, cipher suites` }; },
  async glossary_rsa() { return { answer: `🔓 **RSA**\n\n${glossary['rsa']}\n\n⚠️ RSA-2048 keys can be broken by a quantum computer running Shor's algorithm. Migration to **ML-KEM (FIPS 203)** or **ML-DSA (FIPS 204)** is essential.` }; },
  async glossary_aes() { return { answer: `🔐 **AES (Advanced Encryption Standard)**\n\n${glossary['aes']}\n\n✅ AES-256 is considered quantum-safe because Grover's algorithm only reduces its effective key length to 128 bits — still strong enough.` }; },
  async glossary_hybrid() { return { answer: `🔀 **Hybrid Cryptography**\n\n${glossary['hybrid']}\n\nHybrid is the recommended migration approach — use classical + post-quantum together during the transition period. If one breaks, the other still protects you.` }; },
  async glossary_migration() { return { answer: `🗺️ **Migration Roadmap**\n\n${glossary['migration roadmap']}\n\n**4 Phases:**\n1. 🚨 Immediate — Replace critical/vulnerable algorithms\n2. 📅 Short-term — Upgrade moderate-risk systems\n3. 📋 Medium-term — Full PQC adoption\n4. 🔄 Ongoing — Monitoring & maintenance` }; },
  async glossary_nist() { return { answer: `🏛️ **NIST**\n\n${glossary['nist']}\n\n**Standardized PQC algorithms:**\n• **FIPS 203** — ML-KEM (key encapsulation)\n• **FIPS 204** — ML-DSA (digital signatures)\n• **FIPS 205** — SLH-DSA (hash-based signatures)` }; },
  async glossary_rbi() { return { answer: `🏦 **RBI (Reserve Bank of India)**\n\n${glossary['rbi']}\n\nRBI mandates strong cryptographic standards for all banking infrastructure in India, including digital payments, core banking, and inter-bank communication.` }; },
  async glossary_sebi() { return { answer: `📈 **SEBI (Securities and Exchange Board of India)**\n\n${glossary['sebi']}\n\nSEBI requires cryptographic compliance for securities trading platforms, broker systems, and financial data protection.` }; },
  async glossary_ecc() { return { answer: `📐 **ECC (Elliptic Curve Cryptography)**\n\n${glossary['ecc']}\n\n⚠️ While ECC provides strong classical security with smaller keys than RSA, it is equally vulnerable to Shor's algorithm on quantum computers.` }; },
  async glossary_sha() { return { answer: `#️⃣ **SHA (Secure Hash Algorithm)**\n\n${glossary['sha']}\n\n✅ SHA-256 and SHA-384 remain quantum-resistant. Grover's algorithm only provides a quadratic speedup, requiring 2^128 operations for SHA-256.` }; },
  async glossary_fips203() { return { answer: `🔑 **FIPS 203 — ML-KEM**\n\n${glossary['fips 203']}\n\nML-KEM is the quantum-safe replacement for Diffie-Hellman and RSA key exchange. Used for establishing shared secrets securely.` }; },
  async glossary_fips204() { return { answer: `✍️ **FIPS 204 — ML-DSA**\n\n${glossary['fips 204']}\n\nML-DSA is the quantum-safe replacement for RSA and ECDSA digital signatures. Used for authentication and data integrity.` }; },
  async glossary_fips205() { return { answer: `🌳 **FIPS 205 — SLH-DSA**\n\n${glossary['fips 205']}\n\nSLH-DSA offers an alternative quantum-safe signature based on hash functions. More conservative but with larger signatures than ML-DSA.` }; },
  async glossary_certificate() { return { answer: `📜 **SSL/TLS Certificate**\n\n${glossary['certificate']}\n\nQuantumShield checks certificate key algorithms and signature algorithms for quantum safety. RSA-2048 and ECDSA certificates will need replacement.` }; },
  async glossary_cipher() { return { answer: `🔐 **Cipher Suite**\n\n${glossary['cipher suite']}\n\n**Example:** TLS_AES_256_GCM_SHA384 means:\n• Bulk encryption: AES-256-GCM\n• Hash: SHA-384\n• Key exchange negotiated separately` }; },

  // ── Algorithm Vulnerability Responses ──────────────────────
  async why_algo_vulnerable() {
    return { answer: `⚠️ **Why Algorithms Are Quantum-Vulnerable**\n\nQuantum computers use two key algorithms to break cryptography:\n\n**Shor's Algorithm** (breaks public-key crypto):\n• 🔓 **RSA** — factors large integers → completely broken\n• 🔓 **ECC/ECDSA/ECDHE** — solves elliptic curve discrete log → broken\n• 🔓 **Diffie-Hellman** — solves discrete log → broken\n• 🔓 **DSA** — solves discrete log → broken\n\n**Grover's Algorithm** (weakens symmetric crypto):\n• ⚠️ **AES-128** → security halved to 64 bits (unsafe)\n• ✅ **AES-256** → security halved to 128 bits (still safe)\n\n**Already broken classically:**\n• ❌ RC4, 3DES, DES, MD5, SHA-1\n\n💡 Migrate to: ML-KEM (FIPS 203), ML-DSA (FIPS 204), SLH-DSA (FIPS 205)` };
  },

  async pqc_ready_algorithms() {
    return { answer: `✅ **PQC-Ready (Quantum-Safe) Algorithms**\n\n**NIST Standardized:**\n| Algorithm | FIPS | Type | Replaces |\n|-----------|------|------|----------|\n| **ML-KEM** (Kyber) | 203 | Key Exchange | RSA, DH, ECDHE |\n| **ML-DSA** (Dilithium) | 204 | Signatures | RSA, ECDSA, DSA |\n| **SLH-DSA** (SPHINCS+) | 205 | Signatures | RSA, ECDSA |\n| **FN-DSA** (FALCON) | 206 | Signatures | RSA, ECDSA |\n\n**Symmetric (already quantum-safe):**\n• ✅ **AES-256** — Grover's only halves to 128-bit security\n• ✅ **ChaCha20-Poly1305** — 256-bit key, still strong\n• ✅ **SHA-256, SHA-384, SHA-512** — quantum-resistant hashes\n\n**Hybrid approach:** Combine classical (ECDHE) + PQC (ML-KEM) for backward compatibility during transition.` };
  },

  async vulnerable_algorithms_list() {
    return { answer: `🔴 **Quantum-Vulnerable Algorithms**\n\n**Broken by Shor's Algorithm (public-key):**\n• ❌ **RSA** (all key sizes: 1024, 2048, 4096)\n• ❌ **ECDSA** (P-256, P-384, P-521)\n• ❌ **ECDHE / ECDH** (all curves)\n• ❌ **Ed25519 / X25519** (Curve25519-based)\n• ❌ **DH / DHE** (all key sizes)\n• ❌ **DSA** (all key sizes)\n\n**Weakened by Grover's Algorithm (symmetric):**\n• ⚠️ **AES-128** → effective 64-bit security (upgrade to AES-256)\n\n**Already broken classically:**\n• ❌ **RC4** — statistical biases, banned in TLS 1.3\n• ❌ **3DES / DES** — deprecated by NIST 2023\n• ❌ **MD5** — collision attacks since 2004\n• ❌ **SHA-1** — collision demonstrated 2017\n\n➡️ Migrate to NIST PQC standards: ML-KEM, ML-DSA, SLH-DSA` };
  },

  async shor_algorithm() {
    return { answer: `⚛️ **Shor's Algorithm**\n\nInvented by **Peter Shor in 1994**, this quantum algorithm can:\n\n1. **Factor large integers** in polynomial time\n   → Breaks **RSA** (which relies on integer factoring)\n\n2. **Solve discrete logarithms** in polynomial time\n   → Breaks **DH, DSA** (discrete log problem)\n   → Breaks **ECC/ECDSA/ECDHE** (elliptic curve discrete log)\n\n**Impact:**\n• RSA-2048 → broken in hours (vs billions of years classically)\n• ECDSA P-256 → broken in minutes\n• All public-key crypto based on factoring or discrete logs → broken\n\n**What it does NOT break:**\n• AES, ChaCha20 (symmetric — use Grover's instead)\n• SHA-256, SHA-384 (hash functions)\n• ML-KEM, ML-DSA (lattice-based — no known quantum algorithm)\n\n💡 This is THE reason PQC migration is urgent.` };
  },

  async grover_algorithm() {
    return { answer: `🔍 **Grover's Algorithm**\n\nInvented by **Lov Grover in 1996**, this quantum algorithm provides a **quadratic speedup** for brute-force search.\n\n**Impact on key sizes:**\n| Algorithm | Classical Security | After Grover's | Safe? |\n|-----------|-------------------|----------------|-------|\n| AES-128 | 128 bits | **64 bits** | ❌ Too weak |\n| AES-192 | 192 bits | **96 bits** | ⚠️ Marginal |\n| AES-256 | 256 bits | **128 bits** | ✅ Safe |\n| ChaCha20 | 256 bits | **128 bits** | ✅ Safe |\n\n**Key differences from Shor's:**\n• Shor's → exponential speedup → completely breaks algorithms\n• Grover's → quadratic speedup → only halves key strength\n\n**Solution:** Use **AES-256** or **ChaCha20-Poly1305** (256-bit keys) to maintain 128-bit post-quantum security.` };
  },

  async algo_rsa_vulnerability() {
    return { answer: `🔓 **RSA — Quantum Vulnerability**\n\n**Why RSA is vulnerable:**\nRSA security relies on the difficulty of factoring large numbers (N = p × q). Shor's algorithm can factor these in **polynomial time** on a quantum computer.\n\n**Impact by key size:**\n• RSA-1024 → trivially broken (unsafe even classically now)\n• RSA-2048 → broken by quantum computer in hours\n• RSA-4096 → broken slightly slower, still not safe\n• **No RSA key size is quantum-safe**\n\n**Migration path:**\n• RSA key exchange → **ML-KEM** (FIPS 203)\n• RSA signatures → **ML-DSA** (FIPS 204)\n• Hybrid option → RSA + ML-KEM during transition\n\n⚠️ RSA is the most widely used algorithm — migration is urgent.` };
  },

  async algo_ecc_vulnerability() {
    return { answer: `📐 **ECC — Quantum Vulnerability**\n\n**Why ECC is vulnerable:**\nECC relies on the Elliptic Curve Discrete Logarithm Problem (ECDLP). Shor's algorithm solves this in **polynomial time** on a quantum computer.\n\n**Affected variants:**\n• ❌ **ECDSA** (P-256, P-384, P-521) — signatures\n• ❌ **ECDHE / ECDH** — key exchange\n• ❌ **Ed25519 / Ed448** — EdDSA signatures\n• ❌ **X25519 / X448** — key agreement\n• ❌ **Curve25519** — all uses\n\n**Migration path:**\n• ECDHE key exchange → **ML-KEM** (FIPS 203)\n• ECDSA signatures → **ML-DSA** (FIPS 204)\n• Hybrid: ECDHE + ML-KEM for backward compatibility\n\n💡 ECC has smaller keys than RSA but is equally vulnerable to Shor's.` };
  },

  async algo_dh_vulnerability() {
    return { answer: `🔑 **Diffie-Hellman — Quantum Vulnerability**\n\n**Why DH is vulnerable:**\nDiffie-Hellman relies on the Discrete Logarithm Problem (DLP). Shor's algorithm solves this in **polynomial time** on a quantum computer.\n\n**Affected variants:**\n• ❌ **DH** — Classic Diffie-Hellman\n• ❌ **DHE** — Ephemeral Diffie-Hellman\n• ❌ **ECDHE** — Elliptic Curve DH (ECDLP variant)\n\n**Migration path:**\n• All DH variants → **ML-KEM** (FIPS 203)\n• Hybrid: ECDHE + ML-KEM during transition\n\n💡 DH was the first public-key protocol (1976). ML-KEM is its quantum-safe successor.` };
  },

  async algo_3des_rc4_vulnerability() {
    return { answer: `❌ **3DES & RC4 — Broken Algorithms**\n\nThese are broken even by **classical** computers:\n\n**3DES (Triple DES):**\n• 64-bit block size → Sweet32 birthday attack\n• 112-bit effective security (too weak)\n• NIST deprecated in 2023\n• ➡️ Replace with **AES-256**\n\n**RC4:**\n• Known statistical biases in keystream\n• Practical plaintext recovery attacks (2013-2015)\n• Banned in TLS 1.3 (RFC 7465)\n• ➡️ Replace with **AES-256-GCM** or **ChaCha20-Poly1305**\n\n**DES:**\n• Only 56-bit key — brute-forced in hours\n• Broken since 1999\n• ➡️ Replace with **AES-256**\n\n⚠️ If your scan finds these, it's a **Critical** risk even without quantum computers!` };
  },

  async algo_sha1_md5_vulnerability() {
    return { answer: `❌ **SHA-1 & MD5 — Broken Hash Functions**\n\nThese are broken even by **classical** attacks:\n\n**MD5 (128-bit output):**\n• Collision attacks since 2004\n• Forged certificates demonstrated 2008\n• ➡️ Replace with **SHA-256** or **SHA-384**\n\n**SHA-1 (160-bit output):**\n• First collision found 2017 (SHAttered attack by Google)\n• Deprecated by NIST, browsers, and CAs\n• ➡️ Replace with **SHA-256** or **SHA-384**\n\n**Quantum-safe hashes:**\n• ✅ **SHA-256** — retains ~128-bit security vs Grover's\n• ✅ **SHA-384** — retains ~192-bit security\n• ✅ **SHA-512** — retains ~256-bit security\n• ✅ **SHA-3** family — quantum-resistant\n\n💡 Hash collision attacks don't need quantum — they're broken NOW.` };
  },

  async algo_aes_quantum() {
    return { answer: `🔐 **AES & Symmetric Crypto — Quantum Safety**\n\nSymmetric ciphers are affected by **Grover's algorithm** (NOT Shor's):\n\n| Cipher | Key Size | Post-Quantum Security | Verdict |\n|--------|----------|-----------------------|---------|\n| AES-128 | 128 bit | **64 bits** | ❌ Unsafe |\n| AES-192 | 192 bit | **96 bits** | ⚠️ Marginal |\n| AES-256 | 256 bit | **128 bits** | ✅ Safe |\n| ChaCha20 | 256 bit | **128 bits** | ✅ Safe |\n\n**Why they survive quantum:**\nShor's algorithm only breaks algorithms based on factoring or discrete logs. Symmetric ciphers use different math — Grover's only provides a quadratic (not exponential) speedup.\n\n**Recommendation:**\n• Use **AES-256-GCM** or **ChaCha20-Poly1305**\n• Upgrade any AES-128 to AES-256\n• These need NO algorithm replacement — just key size upgrade` };
  },

  async glossary_fips206() { return { answer: `📄 **FIPS 206 — FN-DSA (FALCON)**\n\n${glossary['fn-dsa']}\n\nFALCON offers **smaller signatures** than ML-DSA but has a more complex implementation due to its NTRU lattice foundation.\n\n**Comparison with ML-DSA:**\n• ML-DSA: Simpler, larger signatures (~2.4 KB)\n• FN-DSA: Complex, compact signatures (~0.7 KB)\n• Both are quantum-safe and NIST standardized` }; },

  async algo_comparison() {
    return { answer: `📊 **Quantum Algorithm Comparison**\n\n**Classical → PQC Migration Map:**\n| Classical | Quantum-Safe Replacement | FIPS |\n|-----------|--------------------------|------|\n| RSA (key exchange) | **ML-KEM** (Kyber) | 203 |\n| RSA (signatures) | **ML-DSA** (Dilithium) | 204 |\n| ECDSA | **ML-DSA** (Dilithium) | 204 |\n| ECDHE / DH | **ML-KEM** (Kyber) | 203 |\n| DSA | **ML-DSA** (Dilithium) | 204 |\n\n**PQC Algorithm Comparison:**\n| Feature | ML-KEM | ML-DSA | SLH-DSA | FN-DSA |\n|---------|--------|--------|---------|--------|\n| Type | Key Exchange | Signature | Signature | Signature |\n| Basis | Lattice | Lattice | Hash | Lattice |\n| Key Size | Small | Medium | Large | Small |\n| Speed | Fast | Fast | Slow | Fast |\n| Maturity | High | High | High | Medium |\n\n💡 **ML-KEM + ML-DSA** is the recommended combo for most applications.` };
  },

  // ── New: Project-level responses ──────────────────────────
  async why_pqc() {
    return { answer: `🤔 **Why do we need PQC?**\n\nQuantum computers threaten current encryption:\n\n• **RSA-2048** — Broken by Shor's algorithm in hours\n• **ECDH/ECDSA** — Equally vulnerable to quantum attacks\n• **AES-128** — Security halved by Grover's algorithm\n\n**"Harvest Now, Decrypt Later":** Adversaries may already be collecting encrypted data today, planning to decrypt it when quantum computers are available.\n\n**The solution:** Migrate to NIST-standardized PQC algorithms (ML-KEM, ML-DSA, SLH-DSA) before quantum computers become powerful enough. QuantumShield helps you identify what needs migrating.` };
  },

  async about_project() {
    return { answer: `🛡️ **About QuantumShield Scanner**\n\nQuantumShield is an enterprise-grade Post-Quantum Cryptography (PQC) readiness assessment platform.\n\n**What it does:**\n• Scans TLS endpoints for cryptographic vulnerabilities\n• Generates Cryptographic Bill of Materials (CBOM)\n• Assesses quantum safety of all discovered algorithms\n• Maps compliance against RBI, SEBI, and NIST\n• Provides migration roadmaps and remediation tracking\n\n**Built for:** Banks, financial institutions, and enterprises preparing for the quantum computing era.\n\n**21 pages** covering everything from scanning to remediation.` };
  },

  async tech_stack() {
    return { answer: `💻 **QuantumShield Tech Stack**\n\n**Frontend:**\n• React 19 + Vite 6\n• Recharts for data visualization\n• Lucide React icons\n• CSS custom properties design system\n\n**Backend:**\n• Node.js + Express 5\n• MongoDB + Mongoose\n• JWT authentication + bcrypt\n• RBAC (Admin/Analyst/Viewer)\n\n**Scanner Engine:**\n• Custom TLS probe (Node tls module)\n• Quantum classifier algorithm\n• CBOM generator (CycloneDX format)\n\n**Security:**\n• Helmet headers, rate limiting\n• Audit logging, integrity hashing` };
  },

  // ── Page-specific guides ──────────────────────────────────
  async page_guide_dashboard() {
    return { answer: `📖 **Dashboard — Page Guide**\n\nYour command center for quantum readiness.\n\n**Features:**\n• 📊 4 stat cards — Total Scans, Assets, PQC Score, Critical Alerts (animated counters)\n• 🍩 Donut chart — Quantum safety breakdown (Critical/Vulnerable/Hybrid/Safe)\n• 📈 Score trend line chart — PQC readiness over time\n• 📋 Recent scans table — Last 5 scan results\n• ⚡ Risk distribution bar — At-a-glance vulnerability status\n\n**Key Terms:**\n• **PQC Score** — 0-100 rating of quantum readiness\n• **Quantum Safe** — Using NIST-standardized PQC algorithms\n\n💡 Click any card to navigate to its detailed page.` };
  },

  async page_guide_scan() {
    return { answer: `📖 **New Scan — Page Guide**\n\nRun cryptographic assessments on your infrastructure.\n\n**Features:**\n• 🎯 Target input — Enter hosts in \`host:port\` format\n• 📁 CSV upload — Bulk import targets from file\n• ⚙️ Configuration — Custom port (default 443), timeout, delay\n• ▶️ Start Scan button — Launches assessment\n• 📊 Live progress — Real-time status during scan\n\n**How to use:**\n1. Enter targets (e.g., \`example.com:443\`)\n2. Click "Start Scan"\n3. Wait for results (~10-30s per target)\n4. View results in Scan History\n\n**What it scans:** TLS handshake, cipher suites, certificates, protocol versions` };
  },

  async page_guide_history() {
    return { answer: `📖 **Scan History — Page Guide**\n\nView all past scans and track progress.\n\n**Features:**\n• 🔍 Searchable table — Filter by hostname\n• 📅 Date/time stamps — When each scan ran\n• ✅ Status badges — Completed, Running, Failed\n• 🎯 Target count — Number of hosts per scan\n• 🔗 Click to drill down — View per-host CBOM details\n\n**Use cases:**\n• Track scan frequency over time\n• Re-examine past results\n• Compare results between scans` };
  },

  async page_guide_cbom() {
    return { answer: `📖 **CBOM — Page Guide**\n\nYour Cryptographic Bill of Materials dashboard.\n\n**Features:**\n• 📊 Algorithm distribution charts — Which crypto is used where\n• 🔐 Cipher suite details — For each scanned host\n• 📜 Certificate information — Validity, issuer, key type\n• 🏷️ Quantum safety labels — Critical/Vulnerable/Hybrid/Safe\n• 📥 Export — Download CBOM in CycloneDX format\n\n**Key Terms:**\n• **CBOM** — A complete inventory of all cryptographic assets\n• **Cipher Suite** — The set of algorithms used for a TLS connection` };
  },

  async page_guide_heatmap() {
    return { answer: `📖 **Risk Heatmap — Page Guide**\n\nVisual overview of quantum risk across all assets.\n\n**Features:**\n• 🗺️ Color-coded grid — Each cell = one host\n• 🔴🟠🟡🟢 Color scale — Critical → Safe\n• 🖱️ Hover details — Score and host info on mouseover\n• 📊 Summary stats — Counts per risk level\n• 🔍 Zoom & filter — Focus on critical areas\n\n**How to read it:**\n• Red = immediate migration needed\n• Orange = vulnerable, plan migration\n• Yellow = hybrid protection in place\n• Green = quantum-safe ✅` };
  },

  async page_guide_compliance() {
    return { answer: `📖 **Compliance Mapping — Page Guide**\n\nRegulatory compliance assessment against multiple frameworks.\n\n**Features:**\n• 🏦 RBI — Reserve Bank of India compliance mapping\n• 📈 SEBI — Securities board compliance\n• 🏛️ NIST — US PQC standards (FIPS 203/204/205)\n• 📊 Compliance gauges — Visual percentage meters\n• ⚠️ Gap analysis — What requirements are unmet\n\n**Frameworks assessed:**\n• RBI IT Framework for banking\n• SEBI Cybersecurity Guidelines\n• NIST Post-Quantum Cryptography Standards` };
  },

  async page_guide_remediation() {
    return { answer: `📖 **Remediation Tracker — Page Guide**\n\nTrack and manage cryptographic migration tasks.\n\n**Features:**\n• 📋 Task list — All pending remediation items\n• 🏷️ Priority levels — Critical, High, Medium, Low\n• 📊 Progress bars — Completion percentage\n• ✅ Status tracking — Pending → In Progress → Completed\n• 📌 Action items — Specific steps to fix each issue\n\n**Statuses:**\n• ⏳ Pending — Not started\n• 🔄 In Progress — Being addressed\n• ✅ Completed — Fixed and verified\n• ⏸️ Deferred — Postponed with justification` };
  },

  async page_guide_roadmap() {
    return { answer: `📖 **Migration Roadmap — Page Guide**\n\nStrategic plan for post-quantum migration.\n\n**Features:**\n• 📅 4-Phase timeline — Immediate → Short-term → Medium-term → Ongoing\n• 🎯 Priority matrix — Which algorithms to replace first\n• 📊 Progress tracking — Phase completion status\n• 📋 Algorithm replacement map — Classical → PQC equivalents\n\n**Phases:**\n1. 🚨 Immediate — Replace critical/deprecated algorithms\n2. 📅 Short-term (0-6 months) — Upgrade high-risk systems\n3. 📋 Medium-term (6-18 months) — Full PQC adoption\n4. 🔄 Ongoing — Monitor and maintain` };
  },

  async page_guide_reports() {
    return { answer: `📖 **Reports — Page Guide**\n\nGenerate and download assessment reports.\n\n**Features:**\n• 📊 Scan selection — Choose which scan to report on\n• 📄 PDF export — Executive summary with charts\n• 📗 CSV export — Raw data for analysis\n• 📘 JSON export — Machine-readable format\n• ✉️ Email scheduling — Send reports automatically\n\n**Report contents:**\n• Executive summary\n• PQC readiness scores\n• Algorithm assessment details\n• Compliance mapping results\n• Remediation recommendations` };
  },

  async page_guide_schedules() {
    return { answer: `📖 **Scheduling — Page Guide**\n\nAutomate recurring scans.\n\n**Features:**\n• 📅 Schedule manager — Create/edit/delete schedules\n• 🔄 Recurring scans — Daily, weekly, monthly\n• 🎯 Target configuration — Which hosts to scan\n• 📊 History — View past scheduled scan results\n• ⚡ Cron-style timing — Precise scheduling control\n\n**Use cases:**\n• Monitor certificate expiry monthly\n• Weekly security posture checks\n• Help ensure continuous compliance` };
  },

  async page_guide_compare() {
    return { answer: `📖 **Scan Comparison — Page Guide**\n\nCompare two scans side by side.\n\n**Features:**\n• 📊 Score delta — See improvement/degradation\n• 🔍 Per-host comparison — Individual host changes\n• 📈 Trend analysis — Are you getting safer?\n• 🏷️ Label changes — Track safety category shifts\n\n**How to use:**\n1. Select two completed scans\n2. View the comparison dashboard\n3. Check which hosts improved or degraded\n4. Use insights to plan remediation` };
  },

  async page_guide_cyber_rating() {
    return { answer: `📖 **Cyber Rating — Page Guide**\n\nOverall cybersecurity rating and benchmarking.\n\n**Features:**\n• ⭐ Overall rating — Composite security score\n• 📊 Category breakdown — Scores by security domain\n• 📈 Trending — Rating changes over time\n• 🏢 Industry benchmark — Compare against standards\n\n**Rating factors:**\n• PQC readiness score\n• Certificate health\n• Compliance status\n• Algorithm diversity` };
  },

  async page_guide_pqc_posture() {
    return { answer: `📖 **PQC Posture — Page Guide**\n\nDetailed post-quantum readiness assessment.\n\n**Features:**\n• 📊 Algorithm inventory — All algorithms in use\n• 🏷️ Safety classification — Per-algorithm rating\n• 📈 Readiness percentage — Overall PQC adoption\n• 🔄 Migration status — What's been upgraded\n• 📋 Recommendations — Next steps for each algorithm\n\n**Algorithm categories:**\n• ✅ Quantum-Safe — ML-KEM, ML-DSA, AES-256\n• 🟡 Hybrid — Classical + PQC combined\n• 🔴 Vulnerable — RSA, ECC, DH` };
  },

  async page_guide_admin() {
    return { answer: `📖 **Admin Panel — Page Guide**\n\nUser and system management (Admin only).\n\n**Features:**\n• 👥 User management — Create, edit, delete users\n• 🔑 Role assignment — Admin, Analyst, Viewer\n• 📋 Audit log — Track all user actions\n• ⚙️ System settings — Configure application\n• 📊 Usage stats — Active users and activity\n\n**Roles:**\n• **Admin** — Full access, user management, audit\n• **Analyst** — Scan, view, export (no admin)\n• **Viewer** — Read-only access to all data` };
  },

  // ── New general intents ───────────────────────────────────
  async target_users() {
    return { answer: `🎯 **Who Should Use QuantumShield?**\n\n**Primary Users:**\n• 🏦 **Banks & Financial Institutions** — RBI compliance for digital banking\n• 📈 **Securities Firms** — SEBI cybersecurity requirements\n• 🏢 **Large Enterprises** — Protecting sensitive data from quantum threats\n• 🏛️ **Government Agencies** — National security infrastructure\n\n**Roles that benefit:**\n• **CISOs** — Strategic security posture overview\n• **Security Engineers** — Technical vulnerability details\n• **Compliance Officers** — Regulatory mapping\n• **IT Administrators** — Certificate and infrastructure management\n\n**Use Cases:**\n• Quantum readiness assessments\n• Cryptographic inventory auditing\n• Regulatory compliance reporting\n• Migration planning and tracking` };
  },

  async unique_features() {
    return { answer: `⭐ **What Makes QuantumShield Unique?**\n\n1. 🔐 **First-of-its-kind PQC Scanner** — Purpose-built for quantum threat assessment\n2. 📋 **CBOM Generation** — Automatic Cryptographic Bill of Materials (CycloneDX)\n3. 🏦 **Indian Compliance Focus** — RBI + SEBI mapping (rare in global tools)\n4. 🗺️ **Risk Heatmap** — Visual quantum vulnerability overview\n5. 📊 **4-Phase Migration Roadmap** — Actionable remediation plan\n6. 🔄 **Scan Comparison** — Track improvement over time\n7. 🤖 **AI Assistant** — Built-in chatbot with live data (that's me! 👋)\n8. 👥 **Role-Based Access** — Admin/Analyst/Viewer\n9. 📧 **Scheduled Scans & Reports** — Automation support\n10. 🎨 **Premium Enterprise UI** — Glassmorphism design system` };
  },

  async security_features() {
    return { answer: `🔒 **Security Features**\n\n**Authentication:**\n• JWT token-based authentication\n• bcrypt password hashing (12 salt rounds)\n• Secure HTTP-only cookies\n\n**Authorization:**\n• Role-Based Access Control (RBAC)\n• Admin, Analyst, Viewer roles\n• Route-level permission checks\n\n**Infrastructure:**\n• Helmet.js security headers\n• Rate limiting (brute force protection)\n• CORS configuration\n• Input validation and sanitization\n\n**Audit:**\n• Complete audit logging\n• Action tracking per user\n• Data integrity hashing\n• Tamper detection` };
  },

  async roles_explained() {
    return { answer: `👥 **User Roles in QuantumShield**\n\n**🔴 Admin** (Full Access)\n• Manage users (create, edit, delete)\n• Run scans and view all data\n• Access audit logs\n• Configure system settings\n• Export reports\n\n**🟡 Analyst** (Operational Access)\n• Run new scans\n• View all scan results and analytics\n• Export reports\n• No user management or audit access\n\n**🟢 Viewer** (Read-Only)\n• View dashboards and analytics\n• Browse scan history\n• No scanning or management capabilities\n\nRoles are assigned by Admins in the **Admin Panel**.` };
  },

  async scan_results_explained() {
    return { answer: `📊 **Understanding Scan Results**\n\n**Color Coding:**\n• 🔴 **Critical** (0-25) — Using only quantum-vulnerable algorithms. Immediate migration needed.\n• 🟠 **Vulnerable** (26-50) — Weak cryptographic posture. Plan migration soon.\n• 🟡 **Hybrid** (51-75) — Mix of classical and PQC. Partial protection.\n• 🟢 **Safe** (76-100) — Using quantum-resistant algorithms. Well protected!\n\n**What's assessed per host:**\n• TLS protocol version (1.2 vs 1.3)\n• Key exchange algorithm (RSA vs ECDH vs ML-KEM)\n• Signature algorithm (RSA vs ECDSA vs ML-DSA)\n• Bulk cipher (AES-128 vs AES-256)\n• Certificate key type and size` };
  },

  async how_to_login() {
    return { answer: `🔑 **How to Login**\n\n1. Go to the QuantumShield login page\n2. Enter your **username** and **password**\n3. Click **Sign In**\n4. You'll be redirected to the Dashboard\n\n**Forgot password?** Contact your Admin — they can reset it from the Admin Panel.\n\n**Default credentials** (if applicable): Check with your system administrator.\n\n**Session:** Your login session uses JWT tokens and will expire after the configured timeout.` };
  },

  async how_to_create_user() {
    return { answer: `👤 **How to Create a New User** (Admin only)\n\n1. Go to **Admin Panel** in the sidebar\n2. Click **Add User** or the ➕ button\n3. Fill in details:\n   • Full Name\n   • Username\n   • Email\n   • Password\n   • Role (Admin / Analyst / Viewer)\n4. Click **Create**\n\nThe new user can immediately login with their credentials.` };
  },

  async how_to_schedule() {
    return { answer: `📅 **How to Schedule a Scan**\n\n1. Go to **Scheduling** in the sidebar\n2. Click **Create Schedule**\n3. Configure:\n   • Target hosts\n   • Frequency (daily, weekly, monthly)\n   • Time of day\n   • Notification preferences\n4. Click **Save**\n\nScheduled scans run automatically and results appear in Scan History. You can edit or delete schedules anytime.` };
  },

  async how_to_interpret() {
    return { answer: `📖 **How to Interpret Your Data**\n\n**Scores (0-100):**\n• Higher = better quantum readiness\n• 75+ means you're in good shape\n• Below 50 means urgent action needed\n\n**Charts:**\n• Donut charts show category distribution\n• Line charts show trends over time\n• Bar charts compare values across hosts\n\n**Tables:**\n• Click any row for detailed drill-down\n• Use search to filter specific hosts\n• Sort columns to find worst/best performers\n\n**General tip:** Start with the Dashboard for the big picture, then drill into specific pages for details.` };
  },

  async deployment() {
    return { answer: `🚀 **Deployment Guide**\n\n**Current Setup:**\n• Frontend: Vite dev server (development)\n• Backend: Node.js/Express on port 5000\n• Database: MongoDB Atlas (cloud)\n\n**For Production:**\n1. Build frontend: \`cd client && npm run build\`\n2. Serve the \`dist/\` folder via Express or Nginx\n3. Set environment variables (MONGO_URI, JWT_SECRET, PORT)\n4. Use PM2 or Docker for process management\n5. Configure HTTPS with reverse proxy\n\n**Environment Variables:**\n• \`MONGO_URI\` — MongoDB connection string\n• \`JWT_SECRET\` — Token signing secret\n• \`PORT\` — Server port (default 5000)` };
  },

  async troubleshooting() {
    return { answer: `🔧 **Troubleshooting Guide**\n\n**Scan not working?**\n• Check target format: \`hostname:port\`\n• Ensure the target is reachable\n• Check server logs for errors\n\n**Page not loading?**\n• Clear browser cache\n• Check if dev server is running\n• Look for console errors (F12)\n\n**Data not showing?**\n• Run a scan first if no data exists\n• Check MongoDB connection\n• Verify you're logged in with correct role\n\n**Login issues?**\n• Check username/password\n• Clear cookies and try again\n• Contact Admin for password reset\n\n**API errors?**\n• Restart the backend server\n• Check server terminal for error logs` };
  },
};

// ── Dynamic Suggestions per Page ────────────────────────────────

async function getSuggestions(page) {
  const cleanPage = (page || '').replace(/^\//, '').replace(/\//g, '-');

  const baseSuggestions = {
    'dashboard': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'What\'s my PQC score?', icon: 'shield' },
      { text: 'How many assets are vulnerable?', icon: 'alert-triangle' },
      { text: 'Any critical actions needed?', icon: 'zap' },
    ],
    'history': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'When was the last scan?', icon: 'clock' },
      { text: 'How many scans completed?', icon: 'check-circle' },
      { text: 'Any failed scans?', icon: 'x-circle' },
    ],
    'scan': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'How do I run a scan?', icon: 'play' },
      { text: 'What targets can I scan?', icon: 'target' },
      { text: 'How long does a scan take?', icon: 'clock' },
    ],
    'asset-inventory': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'How many domains scanned?', icon: 'globe' },
      { text: 'Any certificates expiring?', icon: 'alert-triangle' },
      { text: 'What is asset inventory?', icon: 'help-circle' },
    ],
    'cbom': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'What is CBOM?', icon: 'help-circle' },
      { text: 'Most common cipher suites?', icon: 'lock' },
      { text: 'How many critical algorithms?', icon: 'alert-triangle' },
    ],
    'cyber-rating': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'What\'s my PQC score?', icon: 'star' },
      { text: 'What is PQC?', icon: 'help-circle' },
    ],
    'pqc-posture': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'How many assets are quantum-safe?', icon: 'shield' },
      { text: 'What is hybrid cryptography?', icon: 'help-circle' },
    ],
    'risk-heatmap': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'How many critical assets?', icon: 'alert-triangle' },
      { text: 'What percentage is safe?', icon: 'pie-chart' },
      { text: 'Worst scoring host?', icon: 'trending-down' },
    ],
    'compliance': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'Am I RBI compliant?', icon: 'check-circle' },
      { text: 'What\'s my NIST score?', icon: 'shield' },
      { text: 'Show compliance gaps', icon: 'alert-triangle' },
    ],
    'compare': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'What is scan comparison?', icon: 'git-compare' },
    ],
    'roadmap': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'What needs immediate migration?', icon: 'zap' },
      { text: 'What is FIPS 203?', icon: 'help-circle' },
      { text: 'Why do we need PQC?', icon: 'help-circle' },
    ],
    'remediation': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'How many pending fixes?', icon: 'clock' },
      { text: 'Remediation progress?', icon: 'bar-chart' },
      { text: 'Critical actions remaining?', icon: 'zap' },
    ],
    'reports': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'How to export a PDF?', icon: 'file-text' },
      { text: 'What formats are available?', icon: 'download' },
    ],
    'schedules': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'How to schedule a scan?', icon: 'calendar' },
      { text: 'How many scans total?', icon: 'hash' },
    ],
    'admin': [
      { text: '📖 Page Guide', icon: 'book-open' },
      { text: 'What roles are available?', icon: 'users' },
      { text: 'What can I do here?', icon: 'help-circle' },
    ],
  };

  const suggestions = baseSuggestions[cleanPage] || [
    { text: '📖 Page Guide', icon: 'book-open' },
    { text: 'What can you help with?', icon: 'help-circle' },
    { text: 'What\'s my PQC score?', icon: 'shield' },
    { text: 'What is PQC?', icon: 'help-circle' },
  ];

  // Add dynamic data-driven suggestions
  try {
    const stats = await getCbomStats();
    if (stats.totalAssets > 0 && stats.critical > 0) {
      suggestions.push({ text: `🚨 ${stats.critical} critical assets!`, icon: 'alert-triangle', priority: true });
    }
  } catch (e) { /* ignore */ }

  return suggestions.slice(0, 5);
}

// ── API Endpoints ───────────────────────────────────────────────

// POST /api/chatbot/ask
router.post('/ask', async (req, res) => {
  try {
    const { question, page } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    const trimmedQ = question.trim();
    const cleanPage = (page || '').replace(/^\//, '').replace(/\//g, '-');

    // ── LAYER 1: Phrase Pattern Match (highest priority, exact substring) ──
    const phraseMatch = matchPhrase(trimmedQ);
    if (phraseMatch && responseBuilders[phraseMatch.intent]) {
      const builder = responseBuilders[phraseMatch.intent];
      const result = await builder(cleanPage);
      const suggestions = await getSuggestions(page);
      return res.json({
        ...result,
        confidence: phraseMatch.confidence,
        intent: phraseMatch.intent,
        responseType: result.data ? 'stat' : 'text',
        suggestions,
      });
    }

    // ── LAYER 2: Glossary match (for "what is X" questions) ──
    const glossaryMatch = matchGlossary(trimmedQ, glossary);
    if (glossaryMatch) {
      const suggestions = await getSuggestions(page);
      return res.json({
        answer: `**${glossaryMatch.term.toUpperCase()}**: ${glossaryMatch.definition}`,
        confidence: 0.9,
        intent: 'glossary',
        responseType: 'text',
        suggestions,
      });
    }

    // ── LAYER 3: Intent classification (TF-IDF cosine similarity) ──
    const ranked = classifyIntent(trimmedQ, cleanPage);
    const topIntent = ranked[0];

    if (topIntent.confidence >= 0.2 && responseBuilders[topIntent.intent]) {
      const builder = responseBuilders[topIntent.intent];
      const result = await builder(cleanPage);
      const suggestions = await getSuggestions(page);
      return res.json({
        ...result,
        confidence: Math.round(topIntent.confidence * 100) / 100,
        intent: topIntent.intent,
        responseType: result.data ? 'stat' : 'text',
        suggestions,
      });
    }

    // ── LAYER 4: FAQ match (only if intent didn't match well) ──
    const faqMatch = matchFAQ(trimmedQ, faq);
    if (faqMatch) {
      const suggestions = await getSuggestions(page);
      return res.json({
        answer: faqMatch.a,
        confidence: 0.7,
        intent: 'faq',
        responseType: 'text',
        suggestions,
      });
    }

    // ── LAYER 5: Partial glossary match (term appears anywhere) ──
    const qLower = trimmedQ.toLowerCase();
    for (const [term, definition] of Object.entries(glossary)) {
      if (qLower.includes(term)) {
        const suggestions = await getSuggestions(page);
        return res.json({
          answer: `📚 **${term.toUpperCase()}**: ${definition}`,
          confidence: 0.5,
          intent: 'glossary_partial',
          responseType: 'text',
          suggestions,
        });
      }
    }

    // ── FALLBACK ──
    const suggestions = await getSuggestions(page);
    return res.json({
      answer: '🤔 I\'m not sure I understand that question. Try asking about:\n\n• 📊 **"What\'s my PQC score?"** — Security data\n• 🔍 **"When was the last scan?"** — Scan history\n• 📋 **"Am I RBI compliant?"** — Compliance\n• 📖 **"What is PQC?"** — Terminology\n• 🛡️ **"About QuantumShield"** — Project overview\n\nOr click one of the quick suggestions below! 👇',
      confidence: 0,
      intent: 'fallback',
      responseType: 'text',
      suggestions,
    });

  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ error: 'Failed to process question', answer: 'Sorry, something went wrong. Please try again.' });
  }
});

// GET /api/chatbot/suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { page } = req.query;
    const suggestions = await getSuggestions(page);
    res.json({ suggestions });
  } catch (err) {
    console.error('Suggestions error:', err);
    res.status(500).json({ suggestions: [] });
  }
});

module.exports = router;
