// ── Knowledge Base for QuantumShield Chatbot ────────────────────
// Three layers: Static Glossary, Page Guides, FAQ

const glossary = {
  'pqc': 'Post-Quantum Cryptography (PQC) refers to cryptographic algorithms that are secure against attacks by quantum computers. NIST has standardized algorithms like ML-KEM (FIPS 203), ML-DSA (FIPS 204), and SLH-DSA (FIPS 205).',
  'cbom': 'Cryptographic Bill of Materials (CBOM) is an inventory of all cryptographic assets in a system — algorithms, keys, certificates, and protocols. It follows the OWASP CycloneDX standard for crypto transparency.',
  'tls': 'Transport Layer Security (TLS) is a protocol that provides privacy and data integrity between applications. TLS 1.3 is the latest version and removes legacy insecure cipher suites.',
  'cipher suite': 'A cipher suite is a set of algorithms used to secure a network connection — typically includes key exchange, authentication, bulk encryption, and MAC algorithms.',
  'quantum safe': 'An algorithm is quantum-safe if it cannot be broken by a sufficiently powerful quantum computer. RSA-2048 and ECC are NOT quantum-safe. ML-KEM and ML-DSA ARE quantum-safe.',
  'hybrid': 'Hybrid cryptography combines a classical algorithm (like RSA or ECDH) with a post-quantum algorithm. This provides backward compatibility while adding quantum resistance.',
  'nist': 'The National Institute of Standards and Technology (NIST) is a US agency that has standardized post-quantum cryptographic algorithms through a multi-year competition.',
  'fips 203': 'FIPS 203 standardizes ML-KEM (Module-Lattice-Based Key Encapsulation Mechanism), a quantum-safe key exchange algorithm. Replaces classical Diffie-Hellman.',
  'fips 204': 'FIPS 204 standardizes ML-DSA (Module-Lattice-Based Digital Signature Algorithm), a quantum-safe digital signature. Replaces RSA and ECDSA signatures.',
  'fips 205': 'FIPS 205 standardizes SLH-DSA (Stateless Hash-Based Digital Signature Algorithm), another quantum-safe signature scheme based on hash functions.',
  'rsa': 'RSA is a classical public-key algorithm. RSA-2048 can be broken by a quantum computer using Shor\'s algorithm in polynomial time. Migration to PQC is required.',
  'ecc': 'Elliptic Curve Cryptography (ECC) provides strong security with smaller keys than RSA. However, ECC (ECDH, ECDSA) is vulnerable to quantum attacks via Shor\'s algorithm.',
  'aes': 'Advanced Encryption Standard (AES) is a symmetric cipher. AES-256 is considered quantum-safe (Grover\'s algorithm only halves the effective key length). AES-128 should be upgraded to AES-256.',
  'sha': 'Secure Hash Algorithm. SHA-256 and SHA-384 are considered quantum-resistant. SHA-1 is deprecated and insecure even against classical attacks.',
  'rbi': 'Reserve Bank of India — the banking regulator for India. RBI mandates strong cryptographic standards for banking infrastructure, aligning with global PQC timelines.',
  'sebi': 'Securities and Exchange Board of India — regulates securities markets. SEBI requires cryptographic compliance for financial data protection.',
  'scan': 'A scan connects to target hosts, negotiates TLS, extracts cipher suites and certificates, then classifies each for quantum safety. Results include a PQC readiness score (0-100).',
  'score': 'PQC Readiness Score (0-100): 0-25 = Critical (immediate action), 26-50 = Vulnerable, 51-75 = Hybrid (partial protection), 76-100 = Safe (quantum-ready).',
  'certificate': 'An X.509 digital certificate binds a public key to an identity. Key algorithm strength and signature algorithm are assessed for quantum safety.',
  'asset inventory': 'A comprehensive inventory of all network assets discovered through scans — domains, SSL certificates, IP addresses, and software/protocols.',
  'remediation': 'The process of fixing identified vulnerabilities. For PQC, this means migrating from classical algorithms (RSA, ECC) to NIST-standardized post-quantum algorithms.',
  'migration roadmap': 'A phased plan for transitioning to quantum-safe cryptography: Phase 1 (Immediate), Phase 2 (Short-term), Phase 3 (Medium-term), Phase 4 (Ongoing maintenance).',
  'risk heatmap': 'A visual grid where each cell represents one scanned asset, color-coded by quantum risk level: Red = Critical, Orange = Vulnerable, Yellow = Hybrid, Green = Safe.',
  'compliance': 'Assessment of how well your cryptographic posture meets regulatory requirements (RBI, SEBI, NIST). Expressed as a percentage for each framework.',
  // Algorithm vulnerability entries
  'diffie hellman': 'Diffie-Hellman (DH) is a classical key exchange protocol. It relies on the discrete logarithm problem, which Shor\'s algorithm can solve in polynomial time on a quantum computer. Migrate to ML-KEM (FIPS 203).',
  'dsa': 'Digital Signature Algorithm (DSA) relies on the discrete logarithm problem. Quantum computers using Shor\'s algorithm can break DSA completely. Migrate to ML-DSA (FIPS 204).',
  '3des': 'Triple DES (3DES) uses 168-bit keys but provides only 112-bit security. Already deprecated by NIST (2023). Broken even classically — should be replaced with AES-256 immediately.',
  'rc4': 'RC4 is a stream cipher with known statistical biases. Completely broken even by classical attacks (2015). Banned in TLS 1.3. Replace with AES-256-GCM or ChaCha20-Poly1305.',
  'md5': 'MD5 is a hash function with 128-bit output. Collision attacks demonstrated in 2004. Completely broken for security purposes. Replace with SHA-256 or SHA-384.',
  'chacha20': 'ChaCha20 is a symmetric stream cipher (256-bit key). With Poly1305 MAC, it forms ChaCha20-Poly1305 used in TLS 1.3. Considered quantum-safe since Grover\'s only reduces effective security to 128 bits.',
  'x25519': 'X25519 is an ECDH key exchange using Curve25519. While very efficient classically, it relies on the elliptic curve discrete logarithm problem and is vulnerable to Shor\'s algorithm.',
  'shor algorithm': 'Shor\'s algorithm (1994) can factor large integers and solve discrete logarithms in polynomial time on a quantum computer. It breaks RSA, ECC, DH, DSA, and all public-key cryptography based on these problems.',
  'grover algorithm': 'Grover\'s algorithm (1996) provides quadratic speedup for brute-force search. It effectively halves the key length of symmetric ciphers — AES-128 → 64-bit security, AES-256 → 128-bit security.',
  'ml-kem': 'ML-KEM (Module-Lattice-Based Key Encapsulation Mechanism), standardized as FIPS 203. Quantum-safe replacement for RSA/DH/ECDH key exchange. Based on the hardness of the Module Learning With Errors problem.',
  'ml-dsa': 'ML-DSA (Module-Lattice-Based Digital Signature Algorithm), standardized as FIPS 204. Quantum-safe replacement for RSA/ECDSA/DSA signatures. Also known as CRYSTALS-Dilithium.',
  'slh-dsa': 'SLH-DSA (Stateless Hash-Based Digital Signature Algorithm), standardized as FIPS 205. Quantum-safe signatures based purely on hash functions. Also known as SPHINCS+. Conservative but larger signatures.',
  'fn-dsa': 'FN-DSA (FALCON) is a lattice-based digital signature algorithm standardized as FIPS 206. It provides compact signatures and is suitable for constrained environments.',
  'falcon': 'FALCON (Fast-Fourier Lattice-based Compact Signatures over NTRU) is a PQC signature scheme standardized as FIPS 206 (FN-DSA). Offers smaller signatures than ML-DSA but more complex implementation.',
};

const pageGuides = {
  'dashboard': {
    description: 'The Dashboard shows an overview of your quantum readiness posture — total assets scanned, PQC-ready count, average scores, and recent scan activity.',
    features: ['Stat cards with animated counters', 'Quantum readiness donut chart', 'PQC score trend line chart', 'Recent scans table'],
  },
  'scan': {
    description: 'New Scan lets you initiate a cryptographic assessment against TLS endpoints. Enter host:port targets or upload a CSV file of targets.',
    features: ['Single or multi-target input', 'CSV bulk upload', 'Configurable port, timeout, delay', 'Real-time progress tracking'],
  },
  'history': {
    description: 'Scan History shows all past scans with their status, target count, average PQC score, and timestamps. Click any scan for full results.',
    features: ['Sortable scan table', 'Status badges (running/completed/partial/failed)', 'Quick navigation to results'],
  },
  'asset-inventory': {
    description: 'Asset Inventory provides a comprehensive view of all discovered network assets across 4 categories: Domains, SSL Certificates, IP Addresses, and Software.',
    features: ['4-tab interface', 'Domain registrar info', 'Certificate fingerprints & validity', 'IP geolocation via ipinfo.io', 'TLS/cipher software listing'],
  },
  'cbom': {
    description: 'CBOM Dashboard shows your Cryptographic Bill of Materials — a complete inventory of algorithms, keys, and protocols found across your infrastructure.',
    features: ['Asset-level crypto inventory', 'Quantum safety distribution', 'Click to asset detail'],
  },
  'cyber-rating': {
    description: 'Cyber Rating provides an overall cybersecurity posture score with category breakdowns, trend analysis, and industry benchmark comparison.',
    features: ['Overall posture score', 'Category breakdown', 'Trend analysis', 'Benchmark comparison'],
  },
  'pqc-posture': {
    description: 'Posture of PQC shows your migration readiness — which algorithms are quantum-safe, which need replacement, and your overall PQC compliance status.',
    features: ['Algorithm inventory with safety status', 'Compliance gap analysis', 'Migration priority matrix'],
  },
  'risk-heatmap': {
    description: 'Risk Heatmap visualizes all scanned assets in a color-coded grid — Red (Critical), Orange (Vulnerable), Yellow (Hybrid), Green (Safe).',
    features: ['Color-coded grid cells', 'Hover tooltips with host/score', 'Click to navigate to detail'],
  },
  'compliance': {
    description: 'Compliance Mapping assesses your cryptographic posture against 3 regulatory frameworks: RBI, SEBI, and NIST PQC standards.',
    features: ['Per-regulation scores (0-100%)', 'Overall composite score', 'Expandable requirement checklists', 'Pass/fail indicators'],
  },
  'compare': {
    description: 'Scan Comparison lets you select two scans and view side-by-side differences — score deltas, distribution changes, and per-host improvements.',
    features: ['Dropdown scan selection', 'Score delta display', 'Dual pie charts', 'Per-host comparison table'],
  },
  'roadmap': {
    description: 'Migration Roadmap auto-generates a 4-phase plan based on your scan results — showing what to migrate first and which NIST PQC algorithms to adopt.',
    features: ['4-phase timeline', 'Affected hosts per phase', 'Current → target algorithm mapping', 'NIST FIPS references'],
  },
  'remediation': {
    description: 'Remediation Tracker lets you manage the fix process — track each recommendation through Pending → In Progress → Completed → Deferred statuses.',
    features: ['Status cards with counts', 'Progress bar', 'Severity badges', 'Status toggle buttons'],
  },
  'reports': {
    description: 'Reports hub provides 3 report types — On-Demand (export JSON/CSV/PDF), Executive (management summaries), and Scheduled (automated generation).',
    features: ['JSON, CSV, PDF export', 'Client-side PDF via jsPDF', 'Server-side PDF via PDFKit'],
  },
  'schedules': {
    description: 'Schedule Manager lets you automate recurring scans with cron-based scheduling — daily, weekly, or monthly. Includes manual trigger.',
    features: ['Create/edit/delete schedules', 'Cron-based timing', 'Enable/disable toggle', 'Manual trigger button'],
  },
  'admin': {
    description: 'Admin Panel provides user management and audit logging. Create users, assign roles (admin/analyst/viewer), and review all system actions.',
    features: ['User CRUD', 'Role assignment', 'Audit log viewer', 'Action filtering'],
  },
};

const faq = [
  { q: 'how to run a scan', a: 'Go to "New Scan" from the sidebar. Enter one or more targets in host:port format (e.g., example.com:443), or upload a CSV file. Configure options if needed, then click "Start Scan". The scan runs in the background and results appear automatically.' },
  { q: 'how to export a report', a: 'Navigate to "Reports" in the sidebar. Select a completed scan from the dropdown, then choose your format — JSON, CSV, or PDF. The file will download immediately.' },
  { q: 'what does the score mean', a: 'The PQC Readiness Score ranges from 0-100. Scores 0-25 are Critical (immediate migration needed), 26-50 are Vulnerable, 51-75 are Hybrid (partial quantum protection), and 76-100 are Safe (quantum-ready).' },
  { q: 'why is rsa vulnerable', a: 'RSA relies on the difficulty of factoring large integers. Shor\'s algorithm on a quantum computer can factor these in polynomial time, breaking RSA-2048 completely. Migration to ML-KEM (FIPS 203) or ML-DSA (FIPS 204) is recommended.' },
  { q: 'what is quantum safe', a: 'Quantum-safe (or post-quantum) algorithms are designed to resist attacks from both classical and quantum computers. NIST has standardized ML-KEM, ML-DSA, and SLH-DSA as quantum-safe replacements.' },
  { q: 'what roles are available', a: 'QuantumShield has 3 roles: Admin (full access including user management), Analyst (can run scans, view all data), and Viewer (read-only access to dashboards and reports).' },
  { q: 'how to schedule a scan', a: 'Go to "Scheduling" in the sidebar. Click "Add Schedule", enter a name, targets, and pick a frequency (daily/weekly/monthly). The system uses cron to run scans automatically.' },
  { q: 'what is cbom', a: 'CBOM (Cryptographic Bill of Materials) is an inventory of all cryptographic assets — algorithms, keys, certificates, and protocols. It follows the OWASP CycloneDX standard and helps organizations track their crypto exposure.' },
  { q: 'how does compliance work', a: 'The Compliance page evaluates your scan results against 3 regulatory frameworks: RBI, SEBI, and NIST PQC. Each regulation has specific requirements checked against your data. A percentage score shows how compliant you are.' },
  { q: 'what is the heatmap', a: 'The Risk Heatmap is a visual grid where each cell is one scanned asset. Colors indicate quantum risk: Red = Critical, Orange = Vulnerable, Yellow = Hybrid (partial protection), Green = Safe (quantum-ready).' },
  // Algorithm vulnerability FAQ
  { q: 'why is ecc vulnerable', a: 'ECC (Elliptic Curve Cryptography) — including ECDSA, ECDHE, Ed25519, X25519 — relies on the elliptic curve discrete logarithm problem. Shor\'s algorithm can solve this in polynomial time on a quantum computer, completely breaking ECC. Migrate to ML-KEM for key exchange and ML-DSA for signatures.' },
  { q: 'why is diffie hellman vulnerable', a: 'Diffie-Hellman (DH/DHE/ECDHE) relies on the discrete logarithm problem. Shor\'s algorithm on a quantum computer can solve this in polynomial time. All DH variants are quantum-vulnerable. Replace with ML-KEM (FIPS 203).' },
  { q: 'what is shor algorithm', a: 'Shor\'s algorithm (1994, Peter Shor) is a quantum algorithm that can factor large integers and compute discrete logarithms in polynomial time. It breaks RSA (integer factoring), ECC/ECDSA (elliptic curve discrete log), DH (discrete log), and DSA. This is why these algorithms must be replaced with PQC alternatives.' },
  { q: 'what is grover algorithm', a: 'Grover\'s algorithm (1996, Lov Grover) provides a quadratic speedup for unstructured search. For cryptography, it effectively halves symmetric key strength: AES-256 → 128-bit security, AES-128 → 64-bit security. AES-256 remains safe, but AES-128 should be upgraded.' },
  { q: 'is aes quantum safe', a: 'AES-256 is considered quantum-safe. Grover\'s algorithm reduces its effective security to 128 bits, which is still strong. AES-128 drops to 64 bits — too weak. ChaCha20 (256-bit) is also quantum-safe. Both are symmetric ciphers not affected by Shor\'s algorithm.' },
  { q: 'what replaces rsa', a: 'For key exchange: ML-KEM (FIPS 203) replaces RSA key transport. For digital signatures: ML-DSA (FIPS 204) replaces RSA signatures. Both are NIST-standardized, lattice-based, and quantum-safe.' },
  { q: 'is sha 256 quantum safe', a: 'Yes! SHA-256 is considered quantum-resistant. Grover\'s algorithm only provides a quadratic speedup for preimage attacks, meaning SHA-256 retains ~128-bit security against quantum attacks. SHA-1 and MD5 are NOT safe (broken classically).' },
  { q: 'is rc4 safe', a: 'No! RC4 is completely broken even by classical computers. Known statistical biases, practical plaintext recovery attacks (2013-2015). Banned in TLS 1.3 (RFC 7465). Replace with AES-256-GCM or ChaCha20-Poly1305 immediately.' },
  { q: 'is 3des safe', a: 'No! 3DES (Triple DES) has only 112-bit effective security and a 64-bit block size vulnerable to Sweet32 birthday attacks. NIST deprecated it in 2023. Replace with AES-256 immediately.' },
  { q: 'what are pqc ready algorithms', a: 'NIST-standardized PQC algorithms: ML-KEM/CRYSTALS-Kyber (FIPS 203) for key exchange, ML-DSA/CRYSTALS-Dilithium (FIPS 204) for signatures, SLH-DSA/SPHINCS+ (FIPS 205) for hash-based signatures, FN-DSA/FALCON (FIPS 206) for compact signatures. For symmetric: AES-256 and ChaCha20-Poly1305 are quantum-safe.' },
  { q: 'which algorithms are quantum vulnerable', a: 'Quantum-vulnerable algorithms (broken by Shor\'s): RSA (all key sizes), ECDSA, ECDHE, Ed25519, X25519, DH, DHE, DSA. Already-broken classically: RC4, 3DES, DES, MD5, SHA-1. Weakened by Grover\'s: AES-128 (upgrade to AES-256).' },
  { q: 'what is ml-kem', a: 'ML-KEM (Module-Lattice-Based Key Encapsulation Mechanism), FIPS 203, is the NIST-standardized quantum-safe replacement for RSA/DH/ECDH key exchange. Based on the Module Learning With Errors (MLWE) problem. Available in 3 security levels: ML-KEM-512, ML-KEM-768, ML-KEM-1024.' },
];

module.exports = { glossary, pageGuides, faq };
