# QuantumShield Scanner — Complete Knowledge Roadmap

### Everything you need to know to build it, understand it, and explain it to judges.

---

## 🗺️ How to Read This Document

This document is structured in **layers** — each section builds on the previous one. Read it top-to-bottom the first time. By the end, you'll understand:

- ✅ What the project does
- ✅ WHY it matters (the real-world threat)
- ✅ Every technical concept behind it
- ✅ How the scanner actually works under the hood
- ✅ How to explain it confidently to judges

---

# PART 1: THE "WHY" — Understanding the Problem

## 1.1 What is Encryption?

When you visit a banking website (e.g., `https://mybank.com`), your browser and the bank's server agree to **encrypt** all communication so no one in between (hackers, ISPs, governments) can read it.

This is like putting a letter inside a locked box. Only the sender and receiver have the key.

**Two types of encryption:**

| Type | How it Works | Example | Used For |
|---|---|---|---|
| **Symmetric** | Same key to lock AND unlock | AES-256 | Encrypting the actual data (fast) |
| **Asymmetric** | Different keys — one public (to lock), one private (to unlock) | RSA, ECDSA | Exchanging the symmetric key securely (slow, used once) |

**In practice, BOTH are used together:**
1. Your browser and the server use **asymmetric encryption** to securely agree on a shared secret key.
2. Then they use that shared key with **symmetric encryption** (AES) to encrypt all the actual data.

This is exactly what **TLS** (Transport Layer Security) does.

---

## 1.2 What is TLS? (The Thing We're Scanning)

**TLS** is the protocol that powers the `https://` in every website URL. When you see the 🔒 padlock in your browser, that's TLS working.

**What happens during a TLS connection (simplified):**

```
YOUR BROWSER                                    BANK SERVER
     │                                                │
     │──── 1. "Hello! I support these ciphers" ──────►│   (ClientHello)
     │                                                │
     │◄─── 2. "OK, let's use this cipher + here's ───│   (ServerHello)
     │         my certificate"                        │
     │                                                │
     │──── 3. Browser verifies the certificate ──────►│
     │         (Is this really mybank.com?)            │
     │                                                │
     │◄──► 4. Key Exchange happens ──────────────────►│   (Both sides now
     │         (agree on a shared secret key)          │    have the same key)
     │                                                │
     │◄══► 5. Encrypted communication begins ════════►│   (Using AES with
     │         (all data is now encrypted)             │    the shared key)
```

**This handshake is EXACTLY what our scanner looks at.** We connect to a target, perform steps 1-4, and record every cryptographic detail.

---

## 1.3 What is a Cipher Suite?

A **cipher suite** is a recipe that defines which algorithms to use at each step of TLS. It's like ordering a meal — you pick one item from each category.

**Example cipher suite name:**
```
TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
 │      │     │       │    │     │
 │      │     │       │    │     └── Hash/MAC: SHA-384
 │      │     │       │    └──────── Mode: GCM (authenticated)
 │      │     │       └───────────── Bulk Cipher: AES-256
 │      │     └───────────────────── Authentication: RSA
 │      └─────────────────────────── Key Exchange: ECDHE
 └────────────────────────────────── Protocol: TLS
```

| Component | What it decides | Common options |
|---|---|---|
| **Key Exchange** | How browser & server agree on a shared secret | RSA, DHE, ECDHE, X25519 |
| **Authentication** | How the server proves its identity | RSA, ECDSA, EdDSA |
| **Bulk Cipher** | How the actual data is encrypted | AES-128, AES-256, ChaCha20 |
| **MAC / Hash** | How data integrity is verified | SHA-256, SHA-384 |

**Our scanner decomposes every cipher suite into these parts and checks each one.**

---

## 1.4 What is a TLS Certificate?

When you visit `https://mybank.com`, the server sends you its **TLS certificate**. This is a digital ID card that says:

> "I am mybank.com. My identity is verified by DigiCert (a trusted authority). Here's my public key."

**What's inside a certificate:**

| Field | Example | What our scanner extracts |
|---|---|---|
| Subject | `CN=mybank.com` | ✅ Who the certificate belongs to |
| Issuer | `CN=DigiCert Global G2` | ✅ Who signed/verified it |
| Key Algorithm | `RSA` | ✅ **Critical for quantum-safety** |
| Key Size | `2048 bits` | ✅ Is this strong enough? |
| Signature Algorithm | `SHA256withRSA` | ✅ **Critical for quantum-safety** |
| Validity | `2024-01-01 to 2025-12-31` | ✅ Is it expired? |
| SANs | `mybank.com, www.mybank.com` | ✅ What domains it covers |

---

## 1.5 The Quantum Threat — Why This Project Matters

### What is a Quantum Computer?

Regular computers process information as **bits** (0 or 1). Quantum computers use **qubits** which can be 0, 1, or **both simultaneously** (superposition). This lets them solve certain math problems **exponentially faster**.

### Why should banks care?

All of today's asymmetric encryption (RSA, ECDSA, ECDHE) relies on math problems that are **hard for regular computers but EASY for quantum computers**:

| Math Problem | Used By | Regular Computer | Quantum Computer |
|---|---|---|---|
| Factoring large numbers | RSA | Millions of years | **Hours** (Shor's algorithm) |
| Elliptic curve discrete log | ECDSA, ECDHE | Millions of years | **Hours** (Shor's algorithm) |

### The "Harvest Now, Decrypt Later" (HNDL) Attack

This is the **real threat** your project addresses:

```
TODAY (2026)                           FUTURE (2030-2035?)
┌─────────────────────┐                ┌─────────────────────┐
│ Attacker intercepts  │                │ Quantum computer     │
│ encrypted bank data  │──── stores ───►│ decrypts ALL the     │
│ (can't read it yet)  │   for years    │ stored data!         │
└─────────────────────┘                └─────────────────────┘
      │                                       │
      │ Bank account numbers                  │ All data exposed:
      │ Transaction records                   │ - Account numbers
      │ Personal information                  │ - Transaction history
      │ API credentials                       │ - Customer PII
```

**The attack is happening RIGHT NOW.** Nation-states and sophisticated actors are intercepting encrypted traffic today, storing it in data centers, waiting for quantum computers to mature. This is not science fiction — intelligence agencies have confirmed this is an active threat.

### What's quantum-safe?

**Symmetric ciphers (AES-256)** are mostly safe — quantum computers only halve their security (Grover's algorithm), so AES-256 becomes effectively AES-128, which is still strong.

**Asymmetric algorithms (RSA, ECDHE, ECDSA)** are completely broken by quantum computers. These need to be replaced with **Post-Quantum Cryptography (PQC)** algorithms.

---

## 1.6 NIST Post-Quantum Cryptography (PQC) Standards

NIST (National Institute of Standards and Technology, USA) ran a **7-year competition** (2016-2024) to find quantum-resistant algorithms. The winners are now **official standards**:

| NIST Standard | Algorithm Name | Old Name | What It Does | Based On |
|---|---|---|---|---|
| **FIPS 203** | ML-KEM | Kyber | Key Exchange (replaces ECDHE/RSA key exchange) | Lattice math |
| **FIPS 204** | ML-DSA | Dilithium | Digital Signatures (replaces RSA/ECDSA signatures) | Lattice math |
| **FIPS 205** | SLH-DSA | SPHINCS+ | Digital Signatures (backup option) | Hash functions |
| **FIPS 206** | FN-DSA | FALCON | Digital Signatures (compact signatures) | Lattice math (NTRU) |

**When judges ask "What makes an asset quantum-safe?", your answer is:**
> "If it uses ML-KEM for key exchange and ML-DSA or SLH-DSA for signatures — the NIST FIPS 203/204/205 standardized algorithms — then it's quantum-safe."

---

## 1.7 What is a CBOM? (Cryptographic Bill of Materials)

Think of it like a **nutrition label** but for cryptography.

Just like a food label tells you exactly what's inside your food (calories, sugar, fat), a **CBOM** tells you exactly what cryptographic algorithms are inside your system.

**Example CBOM entry for one endpoint:**

```json
{
  "endpoint": "https://mybank.com",
  "scan_date": "2026-03-10",
  "tls_versions": ["TLS 1.2", "TLS 1.3"],
  "certificate": {
    "subject": "mybank.com",
    "key_algorithm": "RSA",
    "key_size": 2048,
    "signature_algorithm": "SHA256withRSA",
    "issuer": "DigiCert",
    "valid_until": "2027-06-15"
  },
  "cipher_suites": [
    {
      "name": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
      "key_exchange": "ECDHE",
      "authentication": "RSA",
      "bulk_cipher": "AES-256-GCM",
      "hash": "SHA-384"
    }
  ],
  "quantum_safety": {
    "label": "NOT PQC READY",
    "vulnerabilities": [
      "Key exchange (ECDHE) is vulnerable to Shor's algorithm",
      "Certificate signature (RSA) is vulnerable to Shor's algorithm"
    ],
    "recommendations": [
      "Migrate key exchange to ML-KEM-768 (FIPS 203)",
      "Migrate certificate to ML-DSA-65 signatures (FIPS 204)"
    ]
  }
}
```

---

# PART 2: THE "HOW" — How the Scanner Works

## 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        QuantumShield Scanner                         │
│                                                                      │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────┐ │
│  │  React    │    │  Express.js  │    │  Scanner     │    │MongoDB │ │
│  │  Frontend │◄──►│  REST API    │◄──►│  Engine      │◄──►│Database│ │
│  │  (UI)     │    │  (Backend)   │    │  (TLS Probe) │    │        │ │
│  └──────────┘    └──────────────┘    └──────────────┘    └────────┘ │
│       │                                     │                        │
│       │ User sees                           │ Connects to            │
│       │ dashboard                           │ targets                │
│       ▼                                     ▼                        │
│  Browser (Chrome)              Internet-facing bank servers          │
└──────────────────────────────────────────────────────────────────────┘
```

**Think of it in 4 layers:**

| Layer | Technology | Role | Analogy |
|---|---|---|---|
| **Frontend** | React.js | What the user sees and interacts with | The dashboard/display of a car |
| **API** | Express.js | Routes requests between frontend and backend | The steering wheel / pedals |
| **Scanner Engine** | Node.js `tls`/`crypto` | The actual scanning logic | The engine of the car |
| **Database** | MongoDB | Stores all results | The glove box / storage |

---

## 2.2 The Scan Flow — Step by Step

Here's exactly what happens when a user clicks "Scan":

### Step 1: User Inputs Target
```
User enters: "mybank.com" 
(or uploads a CSV with 100 domains)
```
The React frontend sends a `POST /api/scan` request to the Express backend.

### Step 2: TLS Handshake Probing
The Scanner Engine connects to `mybank.com:443` and performs a TLS handshake:

```javascript
// Simplified concept — this is what Node.js does internally
const socket = tls.connect(443, 'mybank.com', options);
// The socket now contains:
// - The server's certificate
// - The negotiated cipher suite
// - The TLS version used
```

**It does this multiple times** with different settings:
- Once with TLS 1.3 → to see if TLS 1.3 is supported
- Once with TLS 1.2 → to see if TLS 1.2 is supported
- Once with TLS 1.1 → to see if (insecure) TLS 1.1 is still enabled
- Once with TLS 1.0 → to see if (insecure) TLS 1.0 is still enabled

### Step 3: Certificate Extraction
From the TLS connection, we extract the certificate chain:

```javascript
const cert = socket.getPeerCertificate(true); // 'true' = full chain
// cert contains:
// - subject (who the cert is for)
// - issuer (who signed it) 
// - valid_from, valid_to (dates)
// - pubkey (the public key — we check if it's RSA, ECDSA, or PQC)
// - serialNumber
// - fingerprint
```

### Step 4: Cipher Suite Enumeration
We check which cipher suites the server supports:

```javascript
// Try connecting with specific cipher suites
const options = { ciphers: 'ECDHE-RSA-AES256-GCM-SHA384' };
const socket = tls.connect(443, 'mybank.com', options);
// If connection succeeds → server supports this cipher suite
// If it fails → server doesn't support it
```

We repeat this for all major cipher suites to build a complete list.

### Step 5: Decomposition
Each cipher suite is broken down into its components:

```
"TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
  → Key Exchange:    ECDHE        → ❌ Quantum Vulnerable
  → Authentication:  RSA          → ❌ Quantum Vulnerable  
  → Bulk Cipher:     AES-256-GCM  → ✅ Quantum Safe
  → Hash:            SHA-384      → ✅ Quantum Safe
```

### Step 6: Quantum-Safety Assessment
Each component is checked against our knowledge base:

```javascript
const quantumVulnerable = ['RSA', 'ECDHE', 'ECDSA', 'DHE', 'ECDH', 'EdDSA'];
const quantumSafe = ['ML-KEM', 'ML-DSA', 'SLH-DSA', 'FN-DSA', 'AES-256', 'ChaCha20'];

// For each algorithm found:
if (quantumSafe.includes(algorithm)) → label = "Quantum Safe"
if (quantumVulnerable.includes(algorithm)) → label = "Not PQC Ready"
```

### Step 7: CBOM Generation & Labeling
All the data is compiled into a structured CBOM document and stored in MongoDB. A quantum-safety label is assigned:

| If... | Then Label = |
|---|---|
| ALL components use PQC algorithms | ✅ **"Fully Quantum Safe"** |
| Mix of classical + PQC algorithms | 🔶 **"Hybrid Mode"** |
| Only classical algorithms (RSA, ECDHE) | ❌ **"Not PQC Ready"** |

### Step 8: Recommendations
For non-PQC-ready assets, the system generates specific recommendations:

```
❌ Key Exchange uses ECDHE → "Migrate to ML-KEM-768 (NIST FIPS 203)"
❌ Certificate uses RSA    → "Migrate to ML-DSA-65 (NIST FIPS 204)"
✅ Bulk cipher uses AES-256 → "No action needed — quantum resistant"
```

---

## 2.3 Why Each Technology Was Chosen

| Technology | Why We Chose It | Judge-Ready Explanation |
|---|---|---|
| **React.js** | Modern, component-based frontend framework. Perfect for building interactive dashboards with charts and real-time updates. | "We used React for a modular, responsive dashboard that updates scan results in real-time." |
| **Node.js** | Has built-in `tls` and `crypto` modules that let us perform TLS handshakes programmatically. JavaScript everywhere (frontend + backend). | "Node.js gives us native TLS handshake capabilities through its built-in modules, plus a unified JavaScript stack." |
| **Express.js** | Lightweight REST API framework. Simple to set up, widely used, good middleware support. | "Express handles our REST API layer — routing scan requests, serving results, and managing authentication." |
| **MongoDB** | CBOM data has variable structure (different endpoints have different numbers of cipher suites, different cert chain lengths). MongoDB's document model handles this naturally without rigid schema. | "MongoDB's flexible document model is ideal for CBOM data where each asset has a different cryptographic profile." |
| **Chart.js/Recharts** | For visualizing quantum-readiness distribution (pie charts, bar charts, trend lines). | "We use Chart.js to create visual dashboards showing quantum-readiness distribution across all assets." |

---

# PART 3: KEY CONCEPTS FOR JUDGES

## 3.1 Questions Judges Will Likely Ask (and your answers)

### Q: "What problem does this solve?"
> **A:** "Banks have hundreds of public-facing applications (websites, APIs, VPN gateways) using TLS encryption. Today's encryption algorithms like RSA and ECDHE will be broken by quantum computers. Our scanner inventories ALL the cryptographic algorithms used across a bank's public-facing infrastructure, tells them exactly which ones are quantum-vulnerable, and gives them a specific migration roadmap to NIST-standardized post-quantum algorithms."

### Q: "How is this different from existing TLS scanners like Qualys SSL Labs?"
> **A:** "Existing tools like SSL Labs check for TLS best practices — expired certs, weak ciphers, protocol versions. Our scanner goes a step further by **assessing quantum-readiness specifically**. We check every cryptographic component against NIST PQC standards (FIPS 203-206), generate a CBOM (Cryptographic Bill of Materials), and issue digital PQC-readiness labels. This is purpose-built for the quantum threat, not general TLS auditing."

### Q: "What are the NIST PQC standards you keep mentioning?"
> **A:** "NIST ran a 7-year global competition to find encryption algorithms that can resist quantum computers. In 2024, they published four official standards:
> - FIPS 203 (ML-KEM/Kyber) — for key exchange
> - FIPS 204 (ML-DSA/Dilithium) — for digital signatures
> - FIPS 205 (SLH-DSA/SPHINCS+) — for digital signatures (hash-based)
> - FIPS 206 (FN-DSA/FALCON) — for digital signatures (compact)
>
> Our scanner checks if any of these are being used. If yes → PQC Ready. If no → Not PQC Ready with migration recommendations."

### Q: "What is a CBOM?"
> **A:** "A Cryptographic Bill of Materials. Just like a software BOM (SBOM) lists all software dependencies, a CBOM lists all cryptographic algorithms, certificates, and protocols used by a system. It's like a nutrition label for cryptography. Our scanner auto-generates this for every scanned endpoint."

### Q: "How does the scanner actually work technically?"
> **A:** "We use Node.js's built-in TLS module to initiate standard TLS handshakes to target servers. During the handshake, the server reveals its certificate, supported cipher suites, and TLS version. We capture all this, decompose each cipher suite into its components (key exchange, cipher, hash), and check each component against our quantum-safety database. No exploitation, no modification — purely passive observation of publicly available TLS information."

### Q: "Does this disrupt the bank's live systems?"
> **A:** "No. Our scanner performs standard TLS handshakes — the exact same thing every browser does when visiting a website. We don't send malicious payloads, we don't try to exploit anything, and we don't modify any configurations. It's completely read-only and non-intrusive."

### Q: "What is Harvest Now, Decrypt Later?"
> **A:** "It's the primary threat model. Adversaries — especially nation-states — are intercepting encrypted data today and storing it. They can't read it now because the encryption is strong for classical computers. But once quantum computers are powerful enough (estimated 2030-2035), they'll decrypt everything they've stored. This is particularly dangerous for banks because financial data remains sensitive for decades."

### Q: "Is AES broken by quantum computers?"
> **A:** "No. AES is a symmetric cipher. Quantum computers can use Grover's algorithm to speed up brute-force attacks, effectively halving the key strength. So AES-256 becomes AES-128 strength, which is still very secure. The real vulnerability is in asymmetric algorithms like RSA, ECDHE, and ECDSA — those are completely broken by Shor's algorithm."

### Q: "Are any systems actually using PQC today?"
> **A:** "Yes, early adopters exist. Google Chrome has supported hybrid key exchange (X25519+ML-KEM-768) since 2024. Cloudflare has deployed PQC on their edge network. Signal messenger uses PQC for its protocol. But the vast majority of banking infrastructure has NOT migrated yet — which is exactly why our scanner is needed. It identifies the gap."

---

## 3.2 Key Terms Cheat Sheet

Print this out or memorize these. If you can casually use these terms, judges will be impressed.

| Term | One-Line Definition |
|---|---|
| **TLS** | The protocol that makes HTTPS secure — encrypts all web traffic |
| **Cipher Suite** | A recipe of algorithms used in a TLS connection (key exchange + cipher + hash) |
| **X.509 Certificate** | A digital ID card that proves a server's identity |
| **Certificate Chain** | The chain of trust: Leaf cert → Intermediate CA → Root CA |
| **Key Exchange** | How two parties agree on a shared secret key (ECDHE, RSA, ML-KEM) |
| **Symmetric Encryption** | Same key to encrypt and decrypt (AES) — fast, used for data |
| **Asymmetric Encryption** | Different keys (public/private) — slow, used for key exchange |
| **RSA** | Most common asymmetric algorithm — BROKEN by quantum computers |
| **ECDHE** | Elliptic curve key exchange — BROKEN by quantum computers |
| **ECDSA** | Elliptic curve digital signatures — BROKEN by quantum computers |
| **Shor's Algorithm** | Quantum algorithm that breaks RSA/ECDHE/ECDSA in hours |
| **Grover's Algorithm** | Quantum algorithm that halves symmetric key strength (AES-256 → 128) |
| **CRQC** | Cryptanalytically Relevant Quantum Computer — the future quantum machine that breaks everything |
| **HNDL** | Harvest Now, Decrypt Later — today's #1 quantum threat |
| **PQC** | Post-Quantum Cryptography — algorithms designed to resist quantum attacks |
| **ML-KEM (Kyber)** | NIST's PQC standard for key exchange (FIPS 203) |
| **ML-DSA (Dilithium)** | NIST's PQC standard for digital signatures (FIPS 204) |
| **SLH-DSA (SPHINCS+)** | NIST's PQC standard for signatures using hashes (FIPS 205) |
| **FN-DSA (FALCON)** | NIST's PQC standard for compact signatures (FIPS 206) |
| **CBOM** | Cryptographic Bill of Materials — inventory of all crypto in a system |
| **OID** | Object Identifier — a unique ID for each algorithm in certificates |
| **Hybrid Mode** | Using classical + PQC algorithms together (transitional approach) |
| **RBAC** | Role-Based Access Control — different users get different permissions |

---

## 3.3 The Innovation Angle

When judges ask "What's innovative about this?", emphasize these points:

1. **CBOM Generation** — The concept of a Cryptographic Bill of Materials is relatively new (analogous to SBOM for software supply chain). Automated CBOM generation is cutting-edge.

2. **Automated PQC Labeling** — No existing tool automatically awards "PQC Ready" or "Fully Quantum Safe" digital certificates. This is a novel contribution.

3. **Banking-Focused** — Purpose-built for banking infrastructure with compliance considerations (RBI, NIST) baked in.

4. **Actionable, Not Just Diagnostic** — Unlike generic TLS scanners that just show results, our scanner tells you **exactly what to do** to become quantum-safe (specific algorithm migrations).

5. **Proactive Defense** — This is a **proactive** tool. Most cybersecurity tools are reactive (detect attacks after they happen). This tool prepares banks for a threat that hasn't fully materialized yet — that's forward-thinking security.

---

# PART 4: PROJECT ROADMAP — Build Sequence

## Phase 1: Scanner Engine (Core — Build First)
```
Priority: 🔴 CRITICAL
What: The TLS scanning logic that connects to targets and extracts crypto info
Why first: Everything else depends on this data
```
- [ ] TLS handshake module (connect to target, extract ServerHello)
- [ ] Certificate parser (extract key algo, key size, signature algo, validity)
- [ ] Cipher suite enumerator (list all supported suites)
- [ ] Cipher suite decomposer (break suite into key exchange, cipher, hash)
- [ ] TLS version detector (probe TLS 1.0-1.3)
- [ ] Quantum-safety classifier (map each algorithm to safe/vulnerable/hybrid)

## Phase 2: Backend API (Structure — Build Second)
```
Priority: 🔴 CRITICAL  
What: Express.js REST API that connects frontend ↔ scanner ↔ database
Why second: Need API before frontend can show anything
```
- [ ] Express.js server setup with routes
- [ ] MongoDB connection and Mongoose schemas
- [ ] `POST /api/scan` — initiate a scan
- [ ] `GET /api/results/:id` — get scan results
- [ ] `GET /api/cbom/:id` — get CBOM for an endpoint
- [ ] User authentication (JWT)
- [ ] RBAC middleware

## Phase 3: Frontend Dashboard (Visual — Build Third)
```
Priority: 🟡 HIGH
What: React.js web interface for scan config, results, and reports
Why third: Backend + scanner must work before UI can display real data
```
- [ ] Login page
- [ ] Dashboard with summary cards and charts
- [ ] Scan configuration form (target input, CSV upload)
- [ ] Scan progress view
- [ ] CBOM report table with filters
- [ ] Asset detail page with quantum-safety label
- [ ] Report export (JSON, CSV, PDF)

## Phase 4: Advanced Features (Polish — Build Last)
```
Priority: 🟢 NICE TO HAVE
What: Extra features that make it impressive
Why last: Core must work first, these are enhancements
```
- [ ] VPN endpoint scanning
- [ ] Scan scheduling (cron jobs)
- [ ] Historical comparison
- [ ] PQC-Ready digital certificate/label (downloadable)
- [ ] Risk heatmap visualization
- [ ] Audit logging

---

# PART 5: PRESENTATION TIPS

## Demo Flow (Suggested)

1. **Open the dashboard** — Show the clean, modern UI
2. **Input a target** — Type in a real domain (e.g., `google.com`, `github.com`)
3. **Start the scan** — Show the real-time progress
4. **Show results** — Highlight the CBOM table, the quantum-safety labels
5. **Drill into an asset** — Show the detailed certificate info, cipher suites
6. **Point out quantum vulnerabilities** — "See, this uses ECDHE for key exchange — vulnerable to Shor's algorithm"
7. **Show recommendations** — "Our scanner recommends migrating to ML-KEM-768"
8. **Show a PQC-Ready label** — If you find an endpoint using PQC, show the digital certificate
9. **Export the report** — Download the CBOM as JSON/PDF

## One-Liner Pitch
> "QuantumShield is a scanner that tells banks if their encryption will survive quantum computers — and exactly what to do if it won't."

## 30-Second Pitch
> "Quantum computers will break RSA and ECDHE encryption within the next decade. Adversaries are already harvesting encrypted bank data today, waiting to decrypt it later. QuantumShield scans every public-facing banking application, creates a complete Cryptographic Bill of Materials, and tells you exactly which assets are quantum-safe and which need to migrate to NIST's new post-quantum algorithms. If it's safe, we issue a PQC-Ready label. If it's not, we give you a specific migration roadmap."

---

*You now know everything you need to build, understand, and present this project confidently. Let's build it.* 🚀
