/**
 * QuantumShield Scanner — Quantum Safety Classifier
 * 
 * Classifies cryptographic algorithms as:
 * - QUANTUM_SAFE: Resistant to known quantum attacks (NIST PQC, AES-256, etc.)
 * - QUANTUM_VULNERABLE: Broken by Shor's algorithm (RSA, ECDHE, ECDSA, etc.)
 * - QUANTUM_WEAKENED: Reduced security by Grover's (AES-128)
 * - CLASSICALLY_BROKEN: Already broken without quantum (MD5, SHA-1, RC4, DES)
 * 
 * References:
 * - NIST FIPS 203 (ML-KEM/Kyber)
 * - NIST FIPS 204 (ML-DSA/Dilithium)
 * - NIST FIPS 205 (SLH-DSA/SPHINCS+)
 * - NIST FIPS 206 (FN-DSA/FALCON)
 */

const QUANTUM_STATUS = {
  SAFE: 'Quantum-Safe',
  VULNERABLE: 'Quantum-Vulnerable',
  WEAKENED: 'Quantum-Weakened',
  BROKEN: 'Classically-Broken',
  HYBRID: 'Hybrid',
  UNKNOWN: 'Unknown'
};

const SEVERITY = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  NONE: 'None'
};

// ══════════════════════════════════════════════════════════════
// Algorithm Classification Database
// ══════════════════════════════════════════════════════════════

const ALGORITHM_CLASSIFICATIONS = {
  // ── Key Exchange Algorithms ─────────────────────────────
  'RSA': {
    type: 'Key Exchange / Authentication',
    quantumStatus: QUANTUM_STATUS.VULNERABLE,
    severity: SEVERITY.CRITICAL,
    reason: 'RSA is based on integer factorization, broken by Shor\'s algorithm in polynomial time on a quantum computer.',
    nistGuidance: 'Migrate to ML-KEM (FIPS 203) for key encapsulation.'
  },
  'ECDHE': {
    type: 'Key Exchange',
    quantumStatus: QUANTUM_STATUS.VULNERABLE,
    severity: SEVERITY.CRITICAL,
    reason: 'ECDHE relies on Elliptic Curve Discrete Logarithm Problem (ECDLP), broken by Shor\'s algorithm.',
    nistGuidance: 'Migrate to ML-KEM-768 (FIPS 203) or use hybrid X25519+ML-KEM-768.'
  },
  'ECDH': {
    type: 'Key Exchange',
    quantumStatus: QUANTUM_STATUS.VULNERABLE,
    severity: SEVERITY.CRITICAL,
    reason: 'Static ECDH is broken by Shor\'s algorithm. Also lacks forward secrecy.',
    nistGuidance: 'Migrate to ML-KEM (FIPS 203).'
  },
  'DHE': {
    type: 'Key Exchange',
    quantumStatus: QUANTUM_STATUS.VULNERABLE,
    severity: SEVERITY.CRITICAL,
    reason: 'DHE relies on Discrete Logarithm Problem (DLP), broken by Shor\'s algorithm.',
    nistGuidance: 'Migrate to ML-KEM (FIPS 203).'
  },
  'DH': {
    type: 'Key Exchange',
    quantumStatus: QUANTUM_STATUS.VULNERABLE,
    severity: SEVERITY.CRITICAL,
    reason: 'Static DH is broken by Shor\'s algorithm. Also lacks forward secrecy.',
    nistGuidance: 'Migrate to ML-KEM (FIPS 203).'
  },
  'X25519': {
    type: 'Key Exchange',
    quantumStatus: QUANTUM_STATUS.VULNERABLE,
    severity: SEVERITY.CRITICAL,
    reason: 'X25519 is an elliptic curve key exchange, broken by Shor\'s algorithm.',
    nistGuidance: 'Migrate to ML-KEM-768 or use hybrid X25519+ML-KEM-768.'
  },
  'X448': {
    type: 'Key Exchange',
    quantumStatus: QUANTUM_STATUS.VULNERABLE,
    severity: SEVERITY.CRITICAL,
    reason: 'X448 is an elliptic curve key exchange, broken by Shor\'s algorithm.',
    nistGuidance: 'Migrate to ML-KEM-1024 or hybrid X448+ML-KEM-1024.'
  },
  'PSK': {
    type: 'Key Exchange',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.LOW,
    reason: 'Pre-Shared Key is symmetric, not broken by quantum algorithms.',
    nistGuidance: 'Ensure PSK length is ≥256 bits for post-quantum security.'
  },
  'TLS1.3-Negotiated': {
    type: 'Key Exchange',
    quantumStatus: QUANTUM_STATUS.VULNERABLE,
    severity: SEVERITY.HIGH,
    reason: 'TLS 1.3 negotiates key exchange separately (typically X25519 or x25519_kyber768). Check the specific key exchange group.',
    nistGuidance: 'Ensure TLS 1.3 is configured with ML-KEM-768 or hybrid key exchange groups.'
  },

  // ── Post-Quantum Key Exchange (NIST Standards) ──────────
  'ML-KEM': {
    type: 'Key Exchange (Post-Quantum)',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.NONE,
    reason: 'ML-KEM (Kyber) is a NIST-standardized lattice-based key encapsulation mechanism resistant to quantum attacks.',
    nistGuidance: 'NIST FIPS 203 — fully quantum-safe.'
  },
  'ML-KEM-512': {
    type: 'Key Exchange (Post-Quantum)',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.NONE,
    reason: 'ML-KEM-512 provides NIST Security Level 1 (128-bit post-quantum security).',
    nistGuidance: 'NIST FIPS 203 — quantum-safe. Consider ML-KEM-768 for higher security.'
  },
  'ML-KEM-768': {
    type: 'Key Exchange (Post-Quantum)',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.NONE,
    reason: 'ML-KEM-768 provides NIST Security Level 3 (192-bit post-quantum security). Recommended for most applications.',
    nistGuidance: 'NIST FIPS 203 — fully quantum-safe. Recommended parameter set.'
  },
  'ML-KEM-1024': {
    type: 'Key Exchange (Post-Quantum)',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.NONE,
    reason: 'ML-KEM-1024 provides NIST Security Level 5 (256-bit post-quantum security). Highest security.',
    nistGuidance: 'NIST FIPS 203 — fully quantum-safe.'
  },
  'X25519_KYBER768': {
    type: 'Key Exchange (Hybrid PQC)',
    quantumStatus: QUANTUM_STATUS.HYBRID,
    severity: SEVERITY.LOW,
    reason: 'Hybrid key exchange combining classical X25519 with post-quantum ML-KEM-768. Provides transitional quantum safety.',
    nistGuidance: 'Transitional — safe against both classical and quantum attacks.'
  },

  // ── Authentication / Signature Algorithms ───────────────
  'ECDSA': {
    type: 'Digital Signature',
    quantumStatus: QUANTUM_STATUS.VULNERABLE,
    severity: SEVERITY.CRITICAL,
    reason: 'ECDSA relies on ECDLP, broken by Shor\'s algorithm.',
    nistGuidance: 'Migrate to ML-DSA (FIPS 204) for digital signatures.'
  },
  'EdDSA': {
    type: 'Digital Signature',
    quantumStatus: QUANTUM_STATUS.VULNERABLE,
    severity: SEVERITY.CRITICAL,
    reason: 'EdDSA (Ed25519/Ed448) relies on ECDLP, broken by Shor\'s algorithm.',
    nistGuidance: 'Migrate to ML-DSA (FIPS 204) for digital signatures.'
  },
  'DSS': {
    type: 'Digital Signature',
    quantumStatus: QUANTUM_STATUS.VULNERABLE,
    severity: SEVERITY.CRITICAL,
    reason: 'DSS/DSA relies on DLP, broken by Shor\'s algorithm.',
    nistGuidance: 'Migrate to ML-DSA (FIPS 204).'
  },

  // ── Post-Quantum Signatures (NIST Standards) ────────────
  'ML-DSA': {
    type: 'Digital Signature (Post-Quantum)',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.NONE,
    reason: 'ML-DSA (Dilithium) is a NIST-standardized lattice-based digital signature algorithm.',
    nistGuidance: 'NIST FIPS 204 — fully quantum-safe.'
  },
  'SLH-DSA': {
    type: 'Digital Signature (Post-Quantum)',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.NONE,
    reason: 'SLH-DSA (SPHINCS+) is a NIST-standardized hash-based digital signature algorithm.',
    nistGuidance: 'NIST FIPS 205 — fully quantum-safe.'
  },
  'FN-DSA': {
    type: 'Digital Signature (Post-Quantum)',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.NONE,
    reason: 'FN-DSA (FALCON) is a NIST-standardized lattice-based digital signature algorithm.',
    nistGuidance: 'NIST FIPS 206 — fully quantum-safe.'
  },

  // ── Symmetric Ciphers ───────────────────────────────────
  'AES-256-GCM': {
    type: 'Symmetric Cipher (AEAD)',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.NONE,
    reason: 'AES-256 with GCM mode. Grover\'s algorithm reduces effective security to 128-bit, which remains strong.',
    nistGuidance: 'No action needed. AES-256 is quantum-resistant.'
  },
  'AES-256-CBC': {
    type: 'Symmetric Cipher',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.LOW,
    reason: 'AES-256 is quantum-resistant. CBC mode is less preferred than GCM but cipher strength is fine.',
    nistGuidance: 'Consider upgrading to AES-256-GCM for authenticated encryption.'
  },
  'AES-192-GCM': {
    type: 'Symmetric Cipher (AEAD)',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.NONE,
    reason: 'AES-192 with GCM. Grover reduces to 96-bit effective, still considered safe.',
    nistGuidance: 'No action required, but AES-256 preferred.'
  },
  'AES-128-GCM': {
    type: 'Symmetric Cipher (AEAD)',
    quantumStatus: QUANTUM_STATUS.WEAKENED,
    severity: SEVERITY.MEDIUM,
    reason: 'AES-128 with GCM. Grover\'s algorithm reduces effective security to 64-bit, which may be insufficient for long-term security.',
    nistGuidance: 'Upgrade to AES-256-GCM for post-quantum symmetric strength.'
  },
  'AES-128-CBC': {
    type: 'Symmetric Cipher',
    quantumStatus: QUANTUM_STATUS.WEAKENED,
    severity: SEVERITY.MEDIUM,
    reason: 'AES-128 is weakened by Grover\'s algorithm (64-bit effective). CBC mode also lacks authentication.',
    nistGuidance: 'Upgrade to AES-256-GCM.'
  },
  'AES-128-CCM': {
    type: 'Symmetric Cipher (AEAD)',
    quantumStatus: QUANTUM_STATUS.WEAKENED,
    severity: SEVERITY.MEDIUM,
    reason: 'AES-128 with CCM. Grover\'s reduces to 64-bit effective security.',
    nistGuidance: 'Upgrade to AES-256-GCM.'
  },
  'AES-128-CCM-8': {
    type: 'Symmetric Cipher (AEAD)',
    quantumStatus: QUANTUM_STATUS.WEAKENED,
    severity: SEVERITY.MEDIUM,
    reason: 'AES-128 with CCM-8 (truncated tag). Weakened by Grover\'s and short authentication tag.',
    nistGuidance: 'Upgrade to AES-256-GCM.'
  },
  'CHACHA20-POLY1305': {
    type: 'Symmetric Cipher (AEAD)',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.NONE,
    reason: 'ChaCha20-Poly1305 uses 256-bit key. Grover reduces to 128-bit effective, which remains strong.',
    nistGuidance: 'No action needed. Quantum-resistant.'
  },
  '3DES-EDE-CBC': {
    type: 'Symmetric Cipher',
    quantumStatus: QUANTUM_STATUS.BROKEN,
    severity: SEVERITY.CRITICAL,
    reason: '3DES has only 112-bit effective security classically, further reduced by Grover\'s. Deprecated by NIST since 2023.',
    nistGuidance: 'Immediately disable. Migrate to AES-256-GCM.'
  },
  'RC4-128': {
    type: 'Stream Cipher',
    quantumStatus: QUANTUM_STATUS.BROKEN,
    severity: SEVERITY.CRITICAL,
    reason: 'RC4 is classically broken with known biases and vulnerabilities. Prohibited by RFC 7465.',
    nistGuidance: 'Immediately disable. Migrate to AES-256-GCM or ChaCha20-Poly1305.'
  },
  'DES': {
    type: 'Symmetric Cipher',
    quantumStatus: QUANTUM_STATUS.BROKEN,
    severity: SEVERITY.CRITICAL,
    reason: 'DES uses 56-bit key, trivially broken by brute force.',
    nistGuidance: 'Immediately disable.'
  },

  // ── Hash Algorithms ─────────────────────────────────────
  'SHA-256': {
    type: 'Hash Function',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.NONE,
    reason: 'SHA-256 outputs 256 bits. Grover\'s reduces preimage resistance to 128-bit, still secure.',
    nistGuidance: 'No action needed.'
  },
  'SHA-384': {
    type: 'Hash Function',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.NONE,
    reason: 'SHA-384 outputs 384 bits. Very strong against quantum attacks.',
    nistGuidance: 'No action needed.'
  },
  'SHA-512': {
    type: 'Hash Function',
    quantumStatus: QUANTUM_STATUS.SAFE,
    severity: SEVERITY.NONE,
    reason: 'SHA-512 outputs 512 bits. Extremely strong against quantum attacks.',
    nistGuidance: 'No action needed.'
  },
  'SHA-1': {
    type: 'Hash Function',
    quantumStatus: QUANTUM_STATUS.BROKEN,
    severity: SEVERITY.HIGH,
    reason: 'SHA-1 is classically broken — collision attacks demonstrated in 2017 (SHAttered). Deprecated.',
    nistGuidance: 'Immediately migrate to SHA-256 or SHA-384.'
  },
  'MD5': {
    type: 'Hash Function',
    quantumStatus: QUANTUM_STATUS.BROKEN,
    severity: SEVERITY.CRITICAL,
    reason: 'MD5 is classically broken — collision attacks are trivial. Completely insecure.',
    nistGuidance: 'Immediately migrate to SHA-256 or SHA-384.'
  }
};

/**
 * Classify a single algorithm name.
 * Returns the classification object with quantum status, severity, and guidance.
 */
function classifyAlgorithm(algorithmName) {
  if (!algorithmName || algorithmName === 'Unknown' || algorithmName === 'None') {
    return {
      algorithm: algorithmName,
      quantumStatus: QUANTUM_STATUS.UNKNOWN,
      severity: SEVERITY.LOW,
      reason: 'Algorithm could not be identified.',
      nistGuidance: 'Manual inspection required.'
    };
  }

  const normalized = algorithmName.toUpperCase().replace(/[_\s]/g, '-');

  // Direct lookup
  if (ALGORITHM_CLASSIFICATIONS[algorithmName]) {
    return { algorithm: algorithmName, ...ALGORITHM_CLASSIFICATIONS[algorithmName] };
  }

  // Try normalized lookup
  for (const [key, value] of Object.entries(ALGORITHM_CLASSIFICATIONS)) {
    if (key.toUpperCase().replace(/[_\s]/g, '-') === normalized) {
      return { algorithm: algorithmName, ...value };
    }
  }

  // Pattern matching for partial hits
  if (normalized.includes('ML-KEM') || normalized.includes('KYBER')) {
    return { algorithm: algorithmName, ...ALGORITHM_CLASSIFICATIONS['ML-KEM'] };
  }
  if (normalized.includes('ML-DSA') || normalized.includes('DILITHIUM')) {
    return { algorithm: algorithmName, ...ALGORITHM_CLASSIFICATIONS['ML-DSA'] };
  }
  if (normalized.includes('SLH-DSA') || normalized.includes('SPHINCS')) {
    return { algorithm: algorithmName, ...ALGORITHM_CLASSIFICATIONS['SLH-DSA'] };
  }
  if (normalized.includes('FN-DSA') || normalized.includes('FALCON')) {
    return { algorithm: algorithmName, ...ALGORITHM_CLASSIFICATIONS['FN-DSA'] };
  }

  return {
    algorithm: algorithmName,
    type: 'Unknown',
    quantumStatus: QUANTUM_STATUS.UNKNOWN,
    severity: SEVERITY.MEDIUM,
    reason: `Algorithm "${algorithmName}" is not in the classification database.`,
    nistGuidance: 'Manual review required.'
  };
}

/**
 * Classify a complete cipher suite (decomposed into components).
 * Returns classification for each component and an overall assessment.
 */
function classifyCipherSuite(suiteComponents) {
  const classifications = {
    keyExchange: classifyAlgorithm(suiteComponents.keyExchange),
    authentication: classifyAlgorithm(suiteComponents.authentication),
    bulkCipher: classifyAlgorithm(suiteComponents.bulkCipher),
    hash: classifyAlgorithm(suiteComponents.hash)
  };

  // Overall status = worst of all components
  const statuses = Object.values(classifications).map(c => c.quantumStatus);
  let overallStatus;

  if (statuses.includes(QUANTUM_STATUS.BROKEN)) {
    overallStatus = QUANTUM_STATUS.BROKEN;
  } else if (statuses.includes(QUANTUM_STATUS.VULNERABLE)) {
    overallStatus = QUANTUM_STATUS.VULNERABLE;
  } else if (statuses.includes(QUANTUM_STATUS.WEAKENED)) {
    overallStatus = QUANTUM_STATUS.WEAKENED;
  } else if (statuses.includes(QUANTUM_STATUS.HYBRID)) {
    overallStatus = QUANTUM_STATUS.HYBRID;
  } else if (statuses.every(s => s === QUANTUM_STATUS.SAFE || s === QUANTUM_STATUS.UNKNOWN)) {
    overallStatus = QUANTUM_STATUS.SAFE;
  } else {
    overallStatus = QUANTUM_STATUS.UNKNOWN;
  }

  // Overall severity = worst of all components
  const severityOrder = [SEVERITY.NONE, SEVERITY.LOW, SEVERITY.MEDIUM, SEVERITY.HIGH, SEVERITY.CRITICAL];
  const severities = Object.values(classifications).map(c => severityOrder.indexOf(c.severity));
  const overallSeverity = severityOrder[Math.max(...severities)];

  return {
    components: classifications,
    overallStatus,
    overallSeverity
  };
}

/**
 * Determine the overall quantum-safety label for an entire endpoint.
 * Considers all cipher suites, certificate, and TLS versions.
 */
function determineEndpointLabel(scanResult) {
  const issues = [];
  let hasPQC = false;
  let hasVulnerable = false;
  let hasBroken = false;
  let hasWeakened = false;

  // Check certificate
  if (scanResult.certificate) {
    const certKeyClassification = classifyAlgorithm(scanResult.certificate.keyAlgorithm);
    const certSigClassification = classifyAlgorithm(scanResult.certificate.signatureAlgorithm);

    if (certKeyClassification.quantumStatus === QUANTUM_STATUS.VULNERABLE) {
      hasVulnerable = true;
      issues.push(`Certificate key algorithm (${scanResult.certificate.keyAlgorithm}) is vulnerable to quantum attacks`);
    }
    if (certSigClassification.quantumStatus === QUANTUM_STATUS.VULNERABLE || certSigClassification.quantumStatus === QUANTUM_STATUS.BROKEN) {
      hasVulnerable = true;
      issues.push(`Certificate signature algorithm is vulnerable`);
    }
    if (certKeyClassification.quantumStatus === QUANTUM_STATUS.SAFE) hasPQC = true;
  }

  // Check cipher suites
  if (scanResult.cipherSuiteAnalysis) {
    for (const suite of scanResult.cipherSuiteAnalysis) {
      if (suite.classification) {
        if (suite.classification.overallStatus === QUANTUM_STATUS.VULNERABLE) hasVulnerable = true;
        if (suite.classification.overallStatus === QUANTUM_STATUS.BROKEN) hasBroken = true;
        if (suite.classification.overallStatus === QUANTUM_STATUS.WEAKENED) hasWeakened = true;
        if (suite.classification.overallStatus === QUANTUM_STATUS.SAFE) hasPQC = true;
      }
    }
  }

  // Check TLS versions
  if (scanResult.supportedVersions) {
    if (scanResult.supportedVersions.includes('TLS 1.0')) {
      hasBroken = true;
      issues.push('TLS 1.0 is enabled — deprecated and insecure');
    }
    if (scanResult.supportedVersions.includes('TLS 1.1')) {
      hasBroken = true;
      issues.push('TLS 1.1 is enabled — deprecated and insecure');
    }
  }

  // Determine label
  let label, labelDescription;

  if (!hasVulnerable && !hasBroken && !hasWeakened && hasPQC) {
    label = 'Fully Quantum Safe';
    labelDescription = 'This asset exclusively uses NIST-standardized post-quantum cryptographic algorithms. It is protected against both classical and quantum cryptanalytic attacks.';
  } else if (hasPQC && (hasVulnerable || hasWeakened)) {
    label = 'Hybrid Mode';
    labelDescription = 'This asset uses a combination of classical and post-quantum algorithms. It provides transitional protection but should complete PQC migration.';
  } else if (hasBroken) {
    label = 'Critical — Not PQC Ready';
    labelDescription = 'This asset uses deprecated or classically-broken cryptographic algorithms AND is not quantum-safe. Immediate remediation required.';
  } else {
    label = 'Not PQC Ready';
    labelDescription = 'This asset uses only classical cryptographic algorithms that are vulnerable to quantum computer attacks. PQC migration recommended.';
  }

  return { label, labelDescription, issues };
}

module.exports = {
  QUANTUM_STATUS,
  SEVERITY,
  ALGORITHM_CLASSIFICATIONS,
  classifyAlgorithm,
  classifyCipherSuite,
  determineEndpointLabel
};
