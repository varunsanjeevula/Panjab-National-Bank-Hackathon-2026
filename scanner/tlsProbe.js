/**
 * QuantumShield Scanner — TLS Probe
 * 
 * Performs TLS handshakes to target endpoints and extracts:
 * - Certificate chain (leaf, intermediate, root)
 * - Negotiated cipher suite
 * - TLS version
 * - Key exchange group
 * - Server certificate details (key algo, key size, sig algo, validity, SANs)
 * 
 * Uses Node.js built-in `tls` module — zero external TLS dependencies.
 */

const tls = require('tls');
const crypto = require('crypto');
const { lookupCipherSuite } = require('./cipherSuiteData');

/**
 * Perform a TLS handshake to a target and extract all cryptographic details.
 * 
 * @param {string} host - Target hostname or IP
 * @param {number} port - Target port (default 443)
 * @param {object} options - Additional options
 * @returns {Promise<object>} TLS connection details
 */
async function probeTLS(host, port = 443, options = {}) {
  const {
    timeout = 10000,
    minVersion = undefined,
    maxVersion = undefined,
    servername = host,
    ciphers = undefined
  } = options;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const tlsOptions = {
      host,
      port,
      servername,
      rejectUnauthorized: false, // We want to inspect ALL certs, even self-signed
      timeout,
      requestCert: false,
      ...(minVersion && { minVersion }),
      ...(maxVersion && { maxVersion }),
      ...(ciphers && { ciphers })
    };

    const socket = tls.connect(tlsOptions, () => {
      try {
        const result = extractConnectionDetails(socket, host, port, startTime);
        socket.end();
        resolve(result);
      } catch (err) {
        socket.destroy();
        reject(new Error(`Failed to extract TLS details: ${err.message}`));
      }
    });

    socket.on('error', (err) => {
      reject(new Error(`TLS connection failed to ${host}:${port}: ${err.message}`));
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`TLS connection timed out to ${host}:${port} after ${timeout}ms`));
    });
  });
}

/**
 * Extract all cryptographic details from an established TLS connection.
 */
function extractConnectionDetails(socket, host, port, startTime) {
  const cipher = socket.getCipher();
  const protocol = socket.getProtocol();
  const peerCert = socket.getPeerCertificate(true); // true = include full chain
  const handshakeTime = Date.now() - startTime;

  // Parse the certificate chain
  const certChain = parseCertificateChain(peerCert);

  // Parse the leaf certificate in detail
  const leafCert = parseLeafCertificate(peerCert);

  // Look up and decompose the negotiated cipher suite
  const cipherSuiteInfo = cipher ? lookupCipherSuite(cipher.name) : null;

  return {
    host,
    port,
    tlsVersion: protocol || 'Unknown',
    handshakeTimeMs: handshakeTime,
    negotiatedCipher: {
      name: cipher?.name || 'Unknown',
      standardName: cipher?.standardName || cipher?.name || 'Unknown',
      version: cipher?.version || 'Unknown',
      bits: cipher?.bits || 0
    },
    cipherSuiteDecomposition: cipherSuiteInfo,
    certificate: leafCert,
    certificateChain: certChain,
    ephemeralKeyInfo: getEphemeralKeyInfo(socket)
  };
}

/**
 * Parse the full certificate chain.
 */
function parseCertificateChain(cert) {
  const chain = [];
  let current = cert;
  const visited = new Set();

  while (current && !visited.has(current.serialNumber)) {
    visited.add(current.serialNumber);

    chain.push({
      subject: formatDN(current.subject),
      issuer: formatDN(current.issuer),
      serialNumber: current.serialNumber,
      validFrom: current.valid_from,
      validTo: current.valid_to,
      fingerprint: current.fingerprint,
      fingerprint256: current.fingerprint256
    });

    // Follow the chain
    if (current.issuerCertificate &&
      current.issuerCertificate !== current &&
      current.issuerCertificate.serialNumber !== current.serialNumber) {
      current = current.issuerCertificate;
    } else {
      break;
    }
  }

  return chain;
}

/**
 * Parse leaf certificate in full detail.
 */
function parseLeafCertificate(cert) {
  if (!cert || !cert.subject) {
    return {
      subject: 'Unknown',
      issuer: 'Unknown',
      keyAlgorithm: 'Unknown',
      keySize: 0,
      signatureAlgorithm: 'Unknown',
      validFrom: 'Unknown',
      validTo: 'Unknown',
      isExpired: true,
      daysUntilExpiry: 0,
      serialNumber: 'Unknown',
      sans: [],
      fingerprint256: 'Unknown'
    };
  }

  const now = new Date();
  const validTo = new Date(cert.valid_to);
  const validFrom = new Date(cert.valid_from);
  const daysUntilExpiry = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));
  const isExpired = validTo < now;

  // Extract key algorithm and size — use Node.js cert properties as primary
  let keyAlgorithm = 'Unknown';
  let keySize = 0;

  if (cert.asn1Curve || cert.nistCurve) {
    keyAlgorithm = 'ECDSA';
    keySize = cert.bits || 256;
  } else if (cert.modulus) {
    keyAlgorithm = 'RSA';
    keySize = cert.bits || (cert.modulus.length * 4);
  } else if (cert.bits) {
    keySize = cert.bits;
    if (keySize >= 1024) keyAlgorithm = 'RSA';
    else keyAlgorithm = 'ECDSA';
  }

  // Extract signature algorithm from raw DER certificate ASN.1 structure
  let signatureAlgorithm = 'Unknown';
  try {
    const forge = require('node-forge');
    if (cert.raw) {
      const asn1Cert = forge.asn1.fromDer(forge.util.createBuffer(cert.raw));
      // Certificate ASN.1: SEQUENCE { tbsCertificate, signatureAlgorithm, signatureValue }
      if (asn1Cert.value && asn1Cert.value.length >= 2) {
        const sigAlgSeq = asn1Cert.value[1];
        if (sigAlgSeq.value && sigAlgSeq.value.length >= 1) {
          const oid = forge.asn1.derToOid(sigAlgSeq.value[0].value);
          signatureAlgorithm = forge.pki.oids[oid] || oid;
        }
      }
    }
  } catch (e) {
    // Fallback: infer from key algorithm
    if (keyAlgorithm === 'RSA') signatureAlgorithm = 'SHA256withRSA';
    else if (keyAlgorithm === 'ECDSA') signatureAlgorithm = 'SHA256withECDSA';
  }

  // Extract Subject Alternative Names
  const sans = [];
  if (cert.subjectaltname) {
    const parts = cert.subjectaltname.split(',').map(s => s.trim());
    for (const part of parts) {
      if (part.startsWith('DNS:')) {
        sans.push(part.substring(4));
      } else if (part.startsWith('IP Address:')) {
        sans.push(part.substring(11));
      }
    }
  }

  return {
    subject: formatDN(cert.subject),
    commonName: cert.subject?.CN || 'Unknown',
    issuer: formatDN(cert.issuer),
    issuerOrg: cert.issuer?.O || 'Unknown',
    keyAlgorithm,
    keySize,
    signatureAlgorithm,
    validFrom: cert.valid_from,
    validTo: cert.valid_to,
    isExpired,
    daysUntilExpiry,
    serialNumber: cert.serialNumber,
    sans,
    fingerprint256: cert.fingerprint256 || 'Unknown',
    selfSigned: formatDN(cert.subject) === formatDN(cert.issuer)
  };
}

/**
 * Get ephemeral key exchange info (available in TLS 1.3 and ECDHE connections).
 */
function getEphemeralKeyInfo(socket) {
  try {
    const ephemeral = socket.getEphemeralKeyInfo && socket.getEphemeralKeyInfo();
    if (ephemeral) {
      return {
        type: ephemeral.type || 'Unknown',
        name: ephemeral.name || 'Unknown',
        size: ephemeral.size || 0
      };
    }
  } catch (e) {
    // Not all connections have ephemeral key info
  }
  return null;
}

/**
 * Infer signature algorithm from cert properties.
 */
function inferSignatureAlgorithm(cert) {
  // Check fingerprint to guess algorithm
  if (cert.fingerprint256) {
    // Most modern certs use SHA-256 based signatures
    return 'SHA256withRSA'; // Default assumption
  }
  return 'Unknown';
}

/**
 * Format a Distinguished Name object to a readable string.
 */
function formatDN(dn) {
  if (!dn) return 'Unknown';
  if (typeof dn === 'string') return dn;

  const parts = [];
  if (dn.CN) parts.push(`CN=${dn.CN}`);
  if (dn.O) parts.push(`O=${dn.O}`);
  if (dn.OU) parts.push(`OU=${dn.OU}`);
  if (dn.L) parts.push(`L=${dn.L}`);
  if (dn.ST) parts.push(`ST=${dn.ST}`);
  if (dn.C) parts.push(`C=${dn.C}`);

  return parts.join(', ') || 'Unknown';
}

/**
 * Detect all TLS versions supported by a target.
 * Probes TLS 1.0, 1.1, 1.2, and 1.3 separately.
 */
async function detectSupportedVersions(host, port = 443) {
  const versions = [
    { name: 'TLS 1.0', min: 'TLSv1', max: 'TLSv1' },
    { name: 'TLS 1.1', min: 'TLSv1.1', max: 'TLSv1.1' },
    { name: 'TLS 1.2', min: 'TLSv1.2', max: 'TLSv1.2' },
    { name: 'TLS 1.3', min: 'TLSv1.3', max: 'TLSv1.3' }
  ];

  const supported = [];

  for (const ver of versions) {
    try {
      await probeTLS(host, port, {
        minVersion: ver.min,
        maxVersion: ver.max,
        timeout: 5000
      });
      supported.push({ version: ver.name, supported: true });
    } catch (err) {
      supported.push({ version: ver.name, supported: false, error: err.message });
    }
  }

  return supported;
}

/**
 * Enumerate cipher suites by attempting connections with individual suites.
 * Returns list of supported cipher suites with their decomposition.
 */
async function enumerateCipherSuites(host, port = 443) {
  // Common cipher suites to test (OpenSSL names)
  const cipherList = [
    // TLS 1.3 (these are always enabled when TLS 1.3 is supported)
    'TLS_AES_256_GCM_SHA384',
    'TLS_AES_128_GCM_SHA256',
    'TLS_CHACHA20_POLY1305_SHA256',
    // TLS 1.2 ECDHE
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA',
    'ECDHE-RSA-AES128-SHA',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-ECDSA-AES256-SHA384',
    'ECDHE-ECDSA-AES128-SHA256',
    // DHE
    'DHE-RSA-AES256-GCM-SHA384',
    'DHE-RSA-AES128-GCM-SHA256',
    'DHE-RSA-AES256-SHA256',
    'DHE-RSA-AES128-SHA256',
    'DHE-RSA-AES256-SHA',
    'DHE-RSA-AES128-SHA',
    // RSA (static)
    'AES256-GCM-SHA384',
    'AES128-GCM-SHA256',
    'AES256-SHA256',
    'AES128-SHA256',
    'AES256-SHA',
    'AES128-SHA',
    // Legacy/weak (important to detect)
    'DES-CBC3-SHA',
    'RC4-SHA',
    'RC4-MD5'
  ];

  const supported = [];

  for (const cipher of cipherList) {
    try {
      const result = await probeTLS(host, port, {
        ciphers: cipher,
        timeout: 5000,
        maxVersion: cipher.startsWith('TLS_') ? 'TLSv1.3' : 'TLSv1.2',
        minVersion: cipher.startsWith('TLS_') ? 'TLSv1.3' : undefined
      });

      const decomposition = lookupCipherSuite(cipher);
      supported.push({
        opensslName: cipher,
        ianaName: decomposition?.ianaName || cipher,
        negotiated: true,
        ...decomposition
      });
    } catch (err) {
      // Cipher not supported — this is expected for most
    }
  }

  return supported;
}

module.exports = {
  probeTLS,
  detectSupportedVersions,
  enumerateCipherSuites,
  parseLeafCertificate,
  parseCertificateChain
};
