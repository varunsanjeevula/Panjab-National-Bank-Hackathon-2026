/**
 * QuantumShield Scanner — Remediation Recommendations Engine
 * 
 * Generates specific, actionable migration recommendations
 * for each quantum-vulnerable cryptographic component.
 */

const { QUANTUM_STATUS, classifyAlgorithm } = require('./quantumClassifier');

/**
 * Generate recommendations for a scanned endpoint.
 * 
 * @param {object} scanResult - Complete scan result from the scanner orchestrator
 * @returns {object[]} Array of recommendation objects
 */
function generateRecommendations(scanResult) {
  const recommendations = [];
  const seen = new Set(); // Avoid duplicate recommendations

  // ── Certificate Recommendations ─────────────────────────
  if (scanResult.certificate) {
    const cert = scanResult.certificate;

    // Key algorithm
    const keyClass = classifyAlgorithm(cert.keyAlgorithm);
    if (keyClass.quantumStatus === QUANTUM_STATUS.VULNERABLE && !seen.has('cert-key')) {
      seen.add('cert-key');
      recommendations.push({
        id: 'CERT-KEY-001',
        category: 'Certificate',
        severity: 'Critical',
        component: `Certificate Key Algorithm: ${cert.keyAlgorithm} (${cert.keySize}-bit)`,
        vulnerability: keyClass.reason,
        recommendation: `Migrate certificate to use ML-DSA-65 (NIST FIPS 204) for the public key. Contact your Certificate Authority (CA) about PQC certificate issuance timelines.`,
        nistReference: 'FIPS 204 (ML-DSA)',
        priority: 1,
        effort: 'Medium — requires CA support for PQC certificates'
      });
    }

    // Signature algorithm
    if (cert.signatureAlgorithm) {
      const sigParts = cert.signatureAlgorithm.toUpperCase();
      if (sigParts.includes('RSA') || sigParts.includes('ECDSA')) {
        if (!seen.has('cert-sig')) {
          seen.add('cert-sig');
          recommendations.push({
            id: 'CERT-SIG-001',
            category: 'Certificate',
            severity: 'High',
            component: `Certificate Signature: ${cert.signatureAlgorithm}`,
            vulnerability: 'Certificate signature uses a quantum-vulnerable algorithm. A quantum attacker could forge certificates.',
            recommendation: `Request certificates signed with ML-DSA (NIST FIPS 204) or SLH-DSA (NIST FIPS 205) from your CA. In the interim, ensure certificates have short validity periods (≤1 year).`,
            nistReference: 'FIPS 204 (ML-DSA) / FIPS 205 (SLH-DSA)',
            priority: 2,
            effort: 'Medium — dependent on CA PQC readiness'
          });
        }
      }
    }

    // Certificate expiry
    if (cert.isExpired) {
      recommendations.push({
        id: 'CERT-EXP-001',
        category: 'Certificate',
        severity: 'Critical',
        component: 'Certificate Validity',
        vulnerability: 'Certificate has expired. This is a security issue regardless of quantum concerns.',
        recommendation: 'Immediately renew the certificate.',
        nistReference: 'N/A',
        priority: 0,
        effort: 'Low'
      });
    } else if (cert.daysUntilExpiry !== undefined && cert.daysUntilExpiry < 30) {
      recommendations.push({
        id: 'CERT-EXP-002',
        category: 'Certificate',
        severity: 'High',
        component: 'Certificate Validity',
        vulnerability: `Certificate expires in ${cert.daysUntilExpiry} days.`,
        recommendation: 'Renew the certificate soon. Consider requesting a PQC certificate during renewal.',
        nistReference: 'N/A',
        priority: 1,
        effort: 'Low'
      });
    }
  }

  // ── Key Exchange Recommendations ────────────────────────
  if (scanResult.cipherSuiteAnalysis) {
    const keyExchanges = new Set();

    for (const suite of scanResult.cipherSuiteAnalysis) {
      if (suite.keyExchange && !keyExchanges.has(suite.keyExchange)) {
        keyExchanges.add(suite.keyExchange);
        const keClass = classifyAlgorithm(suite.keyExchange);

        if (keClass.quantumStatus === QUANTUM_STATUS.VULNERABLE) {
          if (!seen.has(`kex-${suite.keyExchange}`)) {
            seen.add(`kex-${suite.keyExchange}`);
            recommendations.push({
              id: `KEX-${suite.keyExchange}-001`,
              category: 'Key Exchange',
              severity: 'Critical',
              component: `Key Exchange: ${suite.keyExchange}`,
              vulnerability: keClass.reason,
              recommendation: getKeyExchangeRecommendation(suite.keyExchange),
              nistReference: 'FIPS 203 (ML-KEM)',
              priority: 1,
              effort: 'High — requires server configuration and library updates'
            });
          }
        }
      }
    }
  }

  // ── Symmetric Cipher Recommendations ────────────────────
  if (scanResult.cipherSuiteAnalysis) {
    const ciphers = new Set();

    for (const suite of scanResult.cipherSuiteAnalysis) {
      if (suite.bulkCipher && !ciphers.has(suite.bulkCipher)) {
        ciphers.add(suite.bulkCipher);
        const cipherClass = classifyAlgorithm(suite.bulkCipher);

        if (cipherClass.quantumStatus === QUANTUM_STATUS.BROKEN) {
          if (!seen.has(`cipher-${suite.bulkCipher}`)) {
            seen.add(`cipher-${suite.bulkCipher}`);
            recommendations.push({
              id: `CIPHER-${suite.bulkCipher.replace(/[^A-Z0-9]/g, '')}-001`,
              category: 'Symmetric Cipher',
              severity: 'Critical',
              component: `Bulk Cipher: ${suite.bulkCipher}`,
              vulnerability: cipherClass.reason,
              recommendation: `Immediately disable ${suite.bulkCipher}. Migrate to AES-256-GCM or ChaCha20-Poly1305.`,
              nistReference: 'NIST SP 800-131A',
              priority: 0,
              effort: 'Low — server configuration change'
            });
          }
        } else if (cipherClass.quantumStatus === QUANTUM_STATUS.WEAKENED) {
          if (!seen.has(`cipher-${suite.bulkCipher}`)) {
            seen.add(`cipher-${suite.bulkCipher}`);
            recommendations.push({
              id: `CIPHER-${suite.bulkCipher.replace(/[^A-Z0-9]/g, '')}-001`,
              category: 'Symmetric Cipher',
              severity: 'Medium',
              component: `Bulk Cipher: ${suite.bulkCipher}`,
              vulnerability: cipherClass.reason,
              recommendation: `Upgrade from ${suite.bulkCipher} to AES-256-GCM for post-quantum symmetric strength (256-bit key → 128-bit effective post-quantum, still secure).`,
              nistReference: 'NIST SP 800-131A',
              priority: 3,
              effort: 'Low — server configuration change'
            });
          }
        }
      }
    }
  }

  // ── TLS Version Recommendations ─────────────────────────
  if (scanResult.supportedVersions) {
    const versions = scanResult.supportedVersions;

    if (versions.includes('TLS 1.0')) {
      recommendations.push({
        id: 'TLS-VER-001',
        category: 'Protocol Version',
        severity: 'Critical',
        component: 'TLS 1.0 Enabled',
        vulnerability: 'TLS 1.0 is deprecated (RFC 8996). Known vulnerabilities include BEAST, POODLE. No quantum safety.',
        recommendation: 'Immediately disable TLS 1.0. Minimum supported version should be TLS 1.2.',
        nistReference: 'NIST SP 800-52 Rev 2',
        priority: 0,
        effort: 'Low — server configuration change'
      });
    }

    if (versions.includes('TLS 1.1')) {
      recommendations.push({
        id: 'TLS-VER-002',
        category: 'Protocol Version',
        severity: 'Critical',
        component: 'TLS 1.1 Enabled',
        vulnerability: 'TLS 1.1 is deprecated (RFC 8996). Lacks modern cipher suites.',
        recommendation: 'Immediately disable TLS 1.1. Minimum supported version should be TLS 1.2.',
        nistReference: 'NIST SP 800-52 Rev 2',
        priority: 0,
        effort: 'Low — server configuration change'
      });
    }

    if (!versions.includes('TLS 1.3')) {
      recommendations.push({
        id: 'TLS-VER-003',
        category: 'Protocol Version',
        severity: 'Medium',
        component: 'TLS 1.3 Not Supported',
        vulnerability: 'TLS 1.3 provides improved security and is required for post-quantum key exchange support (hybrid key exchange).',
        recommendation: 'Enable TLS 1.3 on the server. This is a prerequisite for deploying PQC key exchange.',
        nistReference: 'RFC 8446',
        priority: 2,
        effort: 'Medium — may require server software update'
      });
    }
  }

  // ── Hash Algorithm Recommendations ──────────────────────
  if (scanResult.cipherSuiteAnalysis) {
    const hashes = new Set();

    for (const suite of scanResult.cipherSuiteAnalysis) {
      if (suite.hash && !hashes.has(suite.hash)) {
        hashes.add(suite.hash);
        const hashClass = classifyAlgorithm(suite.hash);

        if (hashClass.quantumStatus === QUANTUM_STATUS.BROKEN) {
          if (!seen.has(`hash-${suite.hash}`)) {
            seen.add(`hash-${suite.hash}`);
            recommendations.push({
              id: `HASH-${suite.hash.replace(/[^A-Z0-9]/g, '')}-001`,
              category: 'Hash Algorithm',
              severity: hashClass.severity,
              component: `Hash/MAC: ${suite.hash}`,
              vulnerability: hashClass.reason,
              recommendation: `Disable cipher suites using ${suite.hash}. Use SHA-256 or SHA-384 instead.`,
              nistReference: 'NIST SP 800-131A',
              priority: 1,
              effort: 'Low — server configuration change'
            });
          }
        }
      }
    }
  }

  // Sort by priority (lowest number = highest priority)
  recommendations.sort((a, b) => a.priority - b.priority);

  return recommendations;
}

/**
 * Get specific recommendation text for a key exchange algorithm.
 */
function getKeyExchangeRecommendation(algorithm) {
  const recs = {
    'RSA': 'Disable static RSA key exchange (no forward secrecy). Migrate to ECDHE in the short term, then to ML-KEM-768 (NIST FIPS 203) for quantum safety. Server must support ephemeral key exchange.',
    'ECDHE': 'ECDHE is currently best practice for classical security but is broken by Shor\'s algorithm. Migrate to ML-KEM-768 (NIST FIPS 203) or deploy hybrid key exchange (X25519+ML-KEM-768) as a transitional step. Requires OpenSSL 3.2+ or equivalent PQC-capable library.',
    'DHE': 'DHE is broken by Shor\'s algorithm. Migrate to ECDHE (short-term) then ML-KEM-768 (NIST FIPS 203). DHE also has performance issues compared to ECDHE.',
    'ECDH': 'Static ECDH lacks forward secrecy AND is broken by Shor\'s algorithm. Immediately migrate to ECDHE, then to ML-KEM-768.',
    'DH': 'Static DH lacks forward secrecy AND is broken by Shor\'s algorithm. Migrate to ML-KEM-768.',
    'X25519': 'X25519 is an excellent classical key exchange but is broken by Shor\'s algorithm. Deploy hybrid key exchange (X25519+ML-KEM-768) as a transition. Requires TLS 1.3 and PQC-capable TLS library.',
    'X448': 'X448 is broken by Shor\'s algorithm. Migrate to ML-KEM-1024 or hybrid X448+ML-KEM-1024.',
    'TLS1.3-Negotiated': 'TLS 1.3 key exchange (typically X25519 or P-256) is vulnerable to quantum attacks. Configure TLS 1.3 to use hybrid key exchange groups (X25519+ML-KEM-768). Requires server and library support.'
  };

  return recs[algorithm] || `Migrate ${algorithm} to ML-KEM-768 (NIST FIPS 203) for quantum-safe key exchange.`;
}

/**
 * Generate an executive summary of all recommendations.
 */
function generateExecutiveSummary(recommendations) {
  const critical = recommendations.filter(r => r.severity === 'Critical').length;
  const high = recommendations.filter(r => r.severity === 'High').length;
  const medium = recommendations.filter(r => r.severity === 'Medium').length;
  const low = recommendations.filter(r => r.severity === 'Low').length;

  const categories = {};
  for (const rec of recommendations) {
    categories[rec.category] = (categories[rec.category] || 0) + 1;
  }

  return {
    totalRecommendations: recommendations.length,
    bySeverity: { critical, high, medium, low },
    byCategory: categories,
    immediateActions: recommendations.filter(r => r.priority === 0).map(r => r.recommendation),
    shortTermActions: recommendations.filter(r => r.priority === 1 || r.priority === 2).map(r => r.recommendation),
    longTermActions: recommendations.filter(r => r.priority >= 3).map(r => r.recommendation)
  };
}

module.exports = { generateRecommendations, generateExecutiveSummary };
