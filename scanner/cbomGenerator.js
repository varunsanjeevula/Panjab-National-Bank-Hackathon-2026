/**
 * QuantumShield Scanner — CBOM Generator
 * 
 * Compiles all scan results into a structured Cryptographic Bill of Materials (CBOM).
 * 
 * A CBOM is analogous to an SBOM (Software Bill of Materials) but for cryptography.
 * It inventories every cryptographic algorithm, protocol, certificate, and key
 * used by a system — enabling quantum-readiness assessment.
 */

const { classifyAlgorithm, classifyCipherSuite, determineEndpointLabel, QUANTUM_STATUS } = require('./quantumClassifier');
const { generateRecommendations, generateExecutiveSummary } = require('./recommendations');

/**
 * Generate a complete CBOM document for a scanned endpoint.
 * 
 * @param {object} scanData - Raw scan data from tlsProbe
 * @param {object[]} cipherSuites - Enumerated cipher suites
 * @param {object[]} supportedVersions - TLS version probe results
 * @returns {object} Complete CBOM document
 */
function generateCBOM(scanData, cipherSuites, supportedVersions) {
  const cbom = {
    // ── CBOM Metadata ─────────────────────────────────────
    cbomVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'QuantumShield Scanner v1.0',

    // ── Target Information ────────────────────────────────
    target: {
      host: scanData.host,
      port: scanData.port,
      handshakeTimeMs: scanData.handshakeTimeMs
    },

    // ── TLS Protocol Versions ─────────────────────────────
    tlsVersions: processTLSVersions(supportedVersions),

    // ── Certificate Analysis ──────────────────────────────
    certificate: processCertificate(scanData.certificate),
    certificateChain: scanData.certificateChain || [],

    // ── Negotiated Cipher ─────────────────────────────────
    negotiatedCipher: scanData.negotiatedCipher || null,

    // ── Cipher Suite Inventory ────────────────────────────
    cipherSuites: processCipherSuites(cipherSuites),

    // ── Ephemeral Key Exchange ────────────────────────────
    ephemeralKeyInfo: processEphemeralKey(scanData.ephemeralKeyInfo),

    // ── Quantum Safety Assessment ─────────────────────────
    quantumAssessment: null,

    // ── Recommendations ───────────────────────────────────
    recommendations: [],
    executiveSummary: null
  };

  // Build the intermediate scan result for classification
  const scanResult = {
    certificate: cbom.certificate,
    cipherSuiteAnalysis: cbom.cipherSuites,
    supportedVersions: cbom.tlsVersions.supported
  };

  // Determine overall quantum-safety label
  cbom.quantumAssessment = determineEndpointLabel(scanResult);

  // Compute quantum-safety score (0-100)
  cbom.quantumAssessment.score = calculateQuantumScore(cbom);

  // Generate recommendations
  cbom.recommendations = generateRecommendations(scanResult);
  cbom.executiveSummary = generateExecutiveSummary(cbom.recommendations);

  // Add statistics
  cbom.statistics = generateStatistics(cbom);

  return cbom;
}

/**
 * Process TLS version probe results.
 */
function processTLSVersions(versions) {
  const supported = [];
  const unsupported = [];
  const deprecated = [];

  for (const v of versions) {
    if (v.supported) {
      supported.push(v.version);
      if (v.version === 'TLS 1.0' || v.version === 'TLS 1.1') {
        deprecated.push({
          version: v.version,
          status: 'Deprecated',
          severity: 'Critical',
          reason: `${v.version} is deprecated by RFC 8996 and has known vulnerabilities.`
        });
      }
    } else {
      unsupported.push(v.version);
    }
  }

  return {
    supported,
    unsupported,
    deprecated,
    hasTLS13: supported.includes('TLS 1.3'),
    hasDeprecated: deprecated.length > 0,
    bestVersion: supported.includes('TLS 1.3') ? 'TLS 1.3' :
      supported.includes('TLS 1.2') ? 'TLS 1.2' :
        supported[0] || 'None'
  };
}

/**
 * Process certificate data with quantum-safety classification.
 */
function processCertificate(cert) {
  if (!cert) return null;

  const keyClassification = classifyAlgorithm(cert.keyAlgorithm);

  // Determine signature algorithm classification
  let sigAlgo = 'Unknown';
  if (cert.signatureAlgorithm) {
    const upper = cert.signatureAlgorithm.toUpperCase();
    if (upper.includes('RSA')) sigAlgo = 'RSA';
    else if (upper.includes('ECDSA')) sigAlgo = 'ECDSA';
    else if (upper.includes('EDDSA') || upper.includes('ED25519')) sigAlgo = 'EdDSA';
    else if (upper.includes('ML-DSA') || upper.includes('DILITHIUM')) sigAlgo = 'ML-DSA';
    else if (upper.includes('SLH-DSA') || upper.includes('SPHINCS')) sigAlgo = 'SLH-DSA';
    else sigAlgo = cert.signatureAlgorithm;
  }
  const sigClassification = classifyAlgorithm(sigAlgo);

  return {
    ...cert,
    keyClassification: {
      algorithm: cert.keyAlgorithm,
      quantumStatus: keyClassification.quantumStatus,
      severity: keyClassification.severity,
      reason: keyClassification.reason
    },
    signatureClassification: {
      algorithm: sigAlgo,
      fullName: cert.signatureAlgorithm,
      quantumStatus: sigClassification.quantumStatus,
      severity: sigClassification.severity,
      reason: sigClassification.reason
    }
  };
}

/**
 * Process cipher suites with decomposition and quantum classification.
 */
function processCipherSuites(suites) {
  return suites.map(suite => {
    const classification = classifyCipherSuite({
      keyExchange: suite.keyExchange,
      authentication: suite.authentication,
      bulkCipher: suite.bulkCipher,
      hash: suite.hash
    });

    return {
      ...suite,
      classification
    };
  });
}

/**
 * Process ephemeral key exchange information.
 */
function processEphemeralKey(keyInfo) {
  if (!keyInfo) return null;

  const classification = classifyAlgorithm(keyInfo.name || keyInfo.type);

  return {
    ...keyInfo,
    quantumStatus: classification.quantumStatus,
    severity: classification.severity,
    reason: classification.reason
  };
}

/**
 * Calculate a quantum-safety score (0-100) for the endpoint.
 * 100 = fully quantum safe, 0 = critically vulnerable
 */
function calculateQuantumScore(cbom) {
  let score = 100;
  let deductions = [];

  // Certificate key algorithm
  if (cbom.certificate?.keyClassification?.quantumStatus === QUANTUM_STATUS.VULNERABLE) {
    score -= 25;
    deductions.push('Certificate key algorithm is quantum-vulnerable (-25)');
  }
  if (cbom.certificate?.keyClassification?.quantumStatus === QUANTUM_STATUS.BROKEN) {
    score -= 35;
    deductions.push('Certificate key algorithm is classically broken (-35)');
  }

  // Certificate signature
  if (cbom.certificate?.signatureClassification?.quantumStatus === QUANTUM_STATUS.VULNERABLE) {
    score -= 15;
    deductions.push('Certificate signature is quantum-vulnerable (-15)');
  }

  // TLS versions
  if (cbom.tlsVersions?.hasDeprecated) {
    score -= 20;
    deductions.push('Deprecated TLS versions enabled (-20)');
  }
  if (!cbom.tlsVersions?.hasTLS13) {
    score -= 5;
    deductions.push('TLS 1.3 not supported (-5)');
  }

  // Cipher suites — check for vulnerable key exchange
  const hasVulnerableKex = cbom.cipherSuites?.some(
    s => s.classification?.components?.keyExchange?.quantumStatus === QUANTUM_STATUS.VULNERABLE
  );
  if (hasVulnerableKex) {
    score -= 20;
    deductions.push('Quantum-vulnerable key exchange in cipher suites (-20)');
  }

  // Cipher suites — check for broken ciphers
  const hasBrokenCipher = cbom.cipherSuites?.some(
    s => s.classification?.components?.bulkCipher?.quantumStatus === QUANTUM_STATUS.BROKEN
  );
  if (hasBrokenCipher) {
    score -= 15;
    deductions.push('Classically broken cipher in cipher suites (-15)');
  }

  // Bonus for PQC adoption
  const hasPQCKeyExchange = cbom.cipherSuites?.some(
    s => s.classification?.components?.keyExchange?.quantumStatus === QUANTUM_STATUS.SAFE ||
      s.classification?.overallStatus === QUANTUM_STATUS.HYBRID
  );
  if (hasPQCKeyExchange) {
    score += 10;
    deductions.push('PQC key exchange detected (+10 bonus)');
  }

  score = Math.max(0, Math.min(100, score));

  return { score, deductions };
}

/**
 * Generate statistics summary for the CBOM.
 */
function generateStatistics(cbom) {
  const totalSuites = cbom.cipherSuites?.length || 0;
  const safeSuites = cbom.cipherSuites?.filter(s => s.classification?.overallStatus === QUANTUM_STATUS.SAFE).length || 0;
  const vulnerableSuites = cbom.cipherSuites?.filter(s => s.classification?.overallStatus === QUANTUM_STATUS.VULNERABLE).length || 0;
  const brokenSuites = cbom.cipherSuites?.filter(s => s.classification?.overallStatus === QUANTUM_STATUS.BROKEN).length || 0;
  const weakenedSuites = cbom.cipherSuites?.filter(s => s.classification?.overallStatus === QUANTUM_STATUS.WEAKENED).length || 0;

  // Collect all unique algorithms
  const algorithms = new Set();
  if (cbom.certificate) {
    algorithms.add(cbom.certificate.keyAlgorithm);
  }
  cbom.cipherSuites?.forEach(s => {
    algorithms.add(s.keyExchange);
    algorithms.add(s.authentication);
    algorithms.add(s.bulkCipher);
    algorithms.add(s.hash);
  });
  algorithms.delete('Unknown');
  algorithms.delete('TLS1.3-Negotiated');

  return {
    totalCipherSuites: totalSuites,
    quantumSafeSuites: safeSuites,
    quantumVulnerableSuites: vulnerableSuites,
    classicallyBrokenSuites: brokenSuites,
    weakenedSuites: weakenedSuites,
    totalUniqueAlgorithms: algorithms.size,
    uniqueAlgorithms: [...algorithms],
    supportedTlsVersions: cbom.tlsVersions?.supported?.length || 0,
    deprecatedTlsVersions: cbom.tlsVersions?.deprecated?.length || 0,
    totalRecommendations: cbom.recommendations?.length || 0,
    criticalRecommendations: cbom.recommendations?.filter(r => r.severity === 'Critical').length || 0
  };
}

module.exports = { generateCBOM };
