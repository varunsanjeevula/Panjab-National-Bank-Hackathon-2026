/**
 * QuantumShield Scanner — Cipher Suite Data (IANA Registry Lookup Table)
 * 
 * Maps cipher suite names to their decomposed components:
 * - Key Exchange algorithm
 * - Authentication algorithm
 * - Bulk encryption cipher
 * - Hash / MAC algorithm
 * - Quantum safety status for each component
 * 
 * Reference: https://www.iana.org/assignments/tls-parameters/tls-parameters.xhtml
 */

const CIPHER_SUITE_MAP = {
  // ═══════════════════════════════════════════════════════════════
  // TLS 1.3 Cipher Suites (RFC 8446)
  // TLS 1.3 separates key exchange from cipher suites — these only
  // define bulk cipher + hash. Key exchange is negotiated separately.
  // ═══════════════════════════════════════════════════════════════
  'TLS_AES_128_GCM_SHA256': {
    keyExchange: 'TLS1.3-Negotiated',
    authentication: 'TLS1.3-Negotiated',
    bulkCipher: 'AES-128-GCM',
    hash: 'SHA-256',
    tlsVersion: 'TLS 1.3'
  },
  'TLS_AES_256_GCM_SHA384': {
    keyExchange: 'TLS1.3-Negotiated',
    authentication: 'TLS1.3-Negotiated',
    bulkCipher: 'AES-256-GCM',
    hash: 'SHA-384',
    tlsVersion: 'TLS 1.3'
  },
  'TLS_CHACHA20_POLY1305_SHA256': {
    keyExchange: 'TLS1.3-Negotiated',
    authentication: 'TLS1.3-Negotiated',
    bulkCipher: 'CHACHA20-POLY1305',
    hash: 'SHA-256',
    tlsVersion: 'TLS 1.3'
  },
  'TLS_AES_128_CCM_SHA256': {
    keyExchange: 'TLS1.3-Negotiated',
    authentication: 'TLS1.3-Negotiated',
    bulkCipher: 'AES-128-CCM',
    hash: 'SHA-256',
    tlsVersion: 'TLS 1.3'
  },
  'TLS_AES_128_CCM_8_SHA256': {
    keyExchange: 'TLS1.3-Negotiated',
    authentication: 'TLS1.3-Negotiated',
    bulkCipher: 'AES-128-CCM-8',
    hash: 'SHA-256',
    tlsVersion: 'TLS 1.3'
  },

  // ═══════════════════════════════════════════════════════════════
  // TLS 1.2 ECDHE Cipher Suites
  // ═══════════════════════════════════════════════════════════════
  'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384': {
    keyExchange: 'ECDHE', authentication: 'RSA',
    bulkCipher: 'AES-256-GCM', hash: 'SHA-384'
  },
  'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256': {
    keyExchange: 'ECDHE', authentication: 'RSA',
    bulkCipher: 'AES-128-GCM', hash: 'SHA-256'
  },
  'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384': {
    keyExchange: 'ECDHE', authentication: 'RSA',
    bulkCipher: 'AES-256-CBC', hash: 'SHA-384'
  },
  'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256': {
    keyExchange: 'ECDHE', authentication: 'RSA',
    bulkCipher: 'AES-128-CBC', hash: 'SHA-256'
  },
  'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA': {
    keyExchange: 'ECDHE', authentication: 'RSA',
    bulkCipher: 'AES-256-CBC', hash: 'SHA-1'
  },
  'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA': {
    keyExchange: 'ECDHE', authentication: 'RSA',
    bulkCipher: 'AES-128-CBC', hash: 'SHA-1'
  },
  'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256': {
    keyExchange: 'ECDHE', authentication: 'RSA',
    bulkCipher: 'CHACHA20-POLY1305', hash: 'SHA-256'
  },
  'TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA': {
    keyExchange: 'ECDHE', authentication: 'RSA',
    bulkCipher: '3DES-EDE-CBC', hash: 'SHA-1'
  },

  // ECDHE + ECDSA
  'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384': {
    keyExchange: 'ECDHE', authentication: 'ECDSA',
    bulkCipher: 'AES-256-GCM', hash: 'SHA-384'
  },
  'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256': {
    keyExchange: 'ECDHE', authentication: 'ECDSA',
    bulkCipher: 'AES-128-GCM', hash: 'SHA-256'
  },
  'TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA384': {
    keyExchange: 'ECDHE', authentication: 'ECDSA',
    bulkCipher: 'AES-256-CBC', hash: 'SHA-384'
  },
  'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256': {
    keyExchange: 'ECDHE', authentication: 'ECDSA',
    bulkCipher: 'AES-128-CBC', hash: 'SHA-256'
  },
  'TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA': {
    keyExchange: 'ECDHE', authentication: 'ECDSA',
    bulkCipher: 'AES-256-CBC', hash: 'SHA-1'
  },
  'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA': {
    keyExchange: 'ECDHE', authentication: 'ECDSA',
    bulkCipher: 'AES-128-CBC', hash: 'SHA-1'
  },
  'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256': {
    keyExchange: 'ECDHE', authentication: 'ECDSA',
    bulkCipher: 'CHACHA20-POLY1305', hash: 'SHA-256'
  },

  // ═══════════════════════════════════════════════════════════════
  // TLS 1.2 DHE Cipher Suites
  // ═══════════════════════════════════════════════════════════════
  'TLS_DHE_RSA_WITH_AES_256_GCM_SHA384': {
    keyExchange: 'DHE', authentication: 'RSA',
    bulkCipher: 'AES-256-GCM', hash: 'SHA-384'
  },
  'TLS_DHE_RSA_WITH_AES_128_GCM_SHA256': {
    keyExchange: 'DHE', authentication: 'RSA',
    bulkCipher: 'AES-128-GCM', hash: 'SHA-256'
  },
  'TLS_DHE_RSA_WITH_AES_256_CBC_SHA256': {
    keyExchange: 'DHE', authentication: 'RSA',
    bulkCipher: 'AES-256-CBC', hash: 'SHA-256'
  },
  'TLS_DHE_RSA_WITH_AES_128_CBC_SHA256': {
    keyExchange: 'DHE', authentication: 'RSA',
    bulkCipher: 'AES-128-CBC', hash: 'SHA-256'
  },
  'TLS_DHE_RSA_WITH_AES_256_CBC_SHA': {
    keyExchange: 'DHE', authentication: 'RSA',
    bulkCipher: 'AES-256-CBC', hash: 'SHA-1'
  },
  'TLS_DHE_RSA_WITH_AES_128_CBC_SHA': {
    keyExchange: 'DHE', authentication: 'RSA',
    bulkCipher: 'AES-128-CBC', hash: 'SHA-1'
  },
  'TLS_DHE_RSA_WITH_CHACHA20_POLY1305_SHA256': {
    keyExchange: 'DHE', authentication: 'RSA',
    bulkCipher: 'CHACHA20-POLY1305', hash: 'SHA-256'
  },
  'TLS_DHE_RSA_WITH_3DES_EDE_CBC_SHA': {
    keyExchange: 'DHE', authentication: 'RSA',
    bulkCipher: '3DES-EDE-CBC', hash: 'SHA-1'
  },

  // ═══════════════════════════════════════════════════════════════
  // TLS 1.2 RSA Key Exchange (Static RSA — no forward secrecy)
  // ═══════════════════════════════════════════════════════════════
  'TLS_RSA_WITH_AES_256_GCM_SHA384': {
    keyExchange: 'RSA', authentication: 'RSA',
    bulkCipher: 'AES-256-GCM', hash: 'SHA-384'
  },
  'TLS_RSA_WITH_AES_128_GCM_SHA256': {
    keyExchange: 'RSA', authentication: 'RSA',
    bulkCipher: 'AES-128-GCM', hash: 'SHA-256'
  },
  'TLS_RSA_WITH_AES_256_CBC_SHA256': {
    keyExchange: 'RSA', authentication: 'RSA',
    bulkCipher: 'AES-256-CBC', hash: 'SHA-256'
  },
  'TLS_RSA_WITH_AES_128_CBC_SHA256': {
    keyExchange: 'RSA', authentication: 'RSA',
    bulkCipher: 'AES-128-CBC', hash: 'SHA-256'
  },
  'TLS_RSA_WITH_AES_256_CBC_SHA': {
    keyExchange: 'RSA', authentication: 'RSA',
    bulkCipher: 'AES-256-CBC', hash: 'SHA-1'
  },
  'TLS_RSA_WITH_AES_128_CBC_SHA': {
    keyExchange: 'RSA', authentication: 'RSA',
    bulkCipher: 'AES-128-CBC', hash: 'SHA-1'
  },
  'TLS_RSA_WITH_3DES_EDE_CBC_SHA': {
    keyExchange: 'RSA', authentication: 'RSA',
    bulkCipher: '3DES-EDE-CBC', hash: 'SHA-1'
  },
  'TLS_RSA_WITH_RC4_128_SHA': {
    keyExchange: 'RSA', authentication: 'RSA',
    bulkCipher: 'RC4-128', hash: 'SHA-1'
  },
  'TLS_RSA_WITH_RC4_128_MD5': {
    keyExchange: 'RSA', authentication: 'RSA',
    bulkCipher: 'RC4-128', hash: 'MD5'
  }
};

/**
 * Normalize OpenSSL cipher names to IANA standard names.
 * Node.js TLS module returns OpenSSL-format names like "ECDHE-RSA-AES256-GCM-SHA384"
 * We need to map these to IANA names like "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
 */
const OPENSSL_TO_IANA = {
  // TLS 1.3
  'TLS_AES_128_GCM_SHA256': 'TLS_AES_128_GCM_SHA256',
  'TLS_AES_256_GCM_SHA384': 'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256': 'TLS_CHACHA20_POLY1305_SHA256',

  // ECDHE-RSA
  'ECDHE-RSA-AES256-GCM-SHA384': 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
  'ECDHE-RSA-AES128-GCM-SHA256': 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
  'ECDHE-RSA-AES256-SHA384': 'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384',
  'ECDHE-RSA-AES128-SHA256': 'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256',
  'ECDHE-RSA-AES256-SHA': 'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA',
  'ECDHE-RSA-AES128-SHA': 'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA',
  'ECDHE-RSA-CHACHA20-POLY1305': 'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
  'ECDHE-RSA-DES-CBC3-SHA': 'TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA',

  // ECDHE-ECDSA
  'ECDHE-ECDSA-AES256-GCM-SHA384': 'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
  'ECDHE-ECDSA-AES128-GCM-SHA256': 'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
  'ECDHE-ECDSA-AES256-SHA384': 'TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA384',
  'ECDHE-ECDSA-AES128-SHA256': 'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256',
  'ECDHE-ECDSA-AES256-SHA': 'TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA',
  'ECDHE-ECDSA-AES128-SHA': 'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA',
  'ECDHE-ECDSA-CHACHA20-POLY1305': 'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',

  // DHE-RSA
  'DHE-RSA-AES256-GCM-SHA384': 'TLS_DHE_RSA_WITH_AES_256_GCM_SHA384',
  'DHE-RSA-AES128-GCM-SHA256': 'TLS_DHE_RSA_WITH_AES_128_GCM_SHA256',
  'DHE-RSA-AES256-SHA256': 'TLS_DHE_RSA_WITH_AES_256_CBC_SHA256',
  'DHE-RSA-AES128-SHA256': 'TLS_DHE_RSA_WITH_AES_128_CBC_SHA256',
  'DHE-RSA-AES256-SHA': 'TLS_DHE_RSA_WITH_AES_256_CBC_SHA',
  'DHE-RSA-AES128-SHA': 'TLS_DHE_RSA_WITH_AES_128_CBC_SHA',
  'DHE-RSA-CHACHA20-POLY1305': 'TLS_DHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
  'DHE-RSA-DES-CBC3-SHA': 'TLS_DHE_RSA_WITH_3DES_EDE_CBC_SHA',

  // RSA (static)
  'AES256-GCM-SHA384': 'TLS_RSA_WITH_AES_256_GCM_SHA384',
  'AES128-GCM-SHA256': 'TLS_RSA_WITH_AES_128_GCM_SHA256',
  'AES256-SHA256': 'TLS_RSA_WITH_AES_256_CBC_SHA256',
  'AES128-SHA256': 'TLS_RSA_WITH_AES_128_CBC_SHA256',
  'AES256-SHA': 'TLS_RSA_WITH_AES_256_CBC_SHA',
  'AES128-SHA': 'TLS_RSA_WITH_AES_128_CBC_SHA',
  'DES-CBC3-SHA': 'TLS_RSA_WITH_3DES_EDE_CBC_SHA',
  'RC4-SHA': 'TLS_RSA_WITH_RC4_128_SHA',
  'RC4-MD5': 'TLS_RSA_WITH_RC4_128_MD5'
};

/**
 * Look up a cipher suite by its OpenSSL name or IANA name.
 * Returns the decomposed components or a best-effort parse.
 */
function lookupCipherSuite(name) {
  // Try direct IANA lookup
  if (CIPHER_SUITE_MAP[name]) {
    return { name, ianaName: name, ...CIPHER_SUITE_MAP[name] };
  }

  // Try OpenSSL → IANA mapping
  const ianaName = OPENSSL_TO_IANA[name];
  if (ianaName && CIPHER_SUITE_MAP[ianaName]) {
    return { name, ianaName, ...CIPHER_SUITE_MAP[ianaName] };
  }

  // Best-effort parse from name
  return parseCipherSuiteName(name);
}

/**
 * Best-effort parse of a cipher suite name into components.
 * Handles cases not in our lookup table.
 */
function parseCipherSuiteName(name) {
  const result = {
    name,
    ianaName: name,
    keyExchange: 'Unknown',
    authentication: 'Unknown',
    bulkCipher: 'Unknown',
    hash: 'Unknown'
  };

  const upper = name.toUpperCase();

  // Key Exchange detection
  if (upper.includes('ECDHE') || upper.includes('ECDH-')) result.keyExchange = 'ECDHE';
  else if (upper.includes('DHE') || upper.includes('EDH')) result.keyExchange = 'DHE';
  else if (upper.includes('ECDH')) result.keyExchange = 'ECDH';
  else if (upper.includes('RSA')) result.keyExchange = 'RSA';
  else if (upper.includes('PSK')) result.keyExchange = 'PSK';

  // Authentication detection
  if (upper.includes('ECDSA')) result.authentication = 'ECDSA';
  else if (upper.includes('RSA')) result.authentication = 'RSA';
  else if (upper.includes('DSS')) result.authentication = 'DSS';
  else if (upper.includes('ANON')) result.authentication = 'None';

  // Bulk cipher detection
  if (upper.includes('AES-256-GCM') || upper.includes('AES256-GCM')) result.bulkCipher = 'AES-256-GCM';
  else if (upper.includes('AES-128-GCM') || upper.includes('AES128-GCM')) result.bulkCipher = 'AES-128-GCM';
  else if (upper.includes('AES-256') || upper.includes('AES256')) result.bulkCipher = 'AES-256-CBC';
  else if (upper.includes('AES-128') || upper.includes('AES128')) result.bulkCipher = 'AES-128-CBC';
  else if (upper.includes('CHACHA20')) result.bulkCipher = 'CHACHA20-POLY1305';
  else if (upper.includes('3DES') || upper.includes('DES-CBC3')) result.bulkCipher = '3DES-EDE-CBC';
  else if (upper.includes('RC4')) result.bulkCipher = 'RC4-128';
  else if (upper.includes('DES')) result.bulkCipher = 'DES';

  // Hash detection
  if (upper.includes('SHA384') || upper.includes('SHA-384')) result.hash = 'SHA-384';
  else if (upper.includes('SHA256') || upper.includes('SHA-256')) result.hash = 'SHA-256';
  else if (upper.includes('SHA512') || upper.includes('SHA-512')) result.hash = 'SHA-512';
  else if (upper.includes('SHA') && !upper.includes('SHA2') && !upper.includes('SHA3')) result.hash = 'SHA-1';
  else if (upper.includes('MD5')) result.hash = 'MD5';

  // TLS 1.3 suites start with TLS_ and have no key exchange in name
  if (name.startsWith('TLS_AES') || name.startsWith('TLS_CHACHA')) {
    result.keyExchange = 'TLS1.3-Negotiated';
    result.authentication = 'TLS1.3-Negotiated';
    result.tlsVersion = 'TLS 1.3';
  }

  return result;
}

module.exports = { CIPHER_SUITE_MAP, OPENSSL_TO_IANA, lookupCipherSuite, parseCipherSuiteName };
