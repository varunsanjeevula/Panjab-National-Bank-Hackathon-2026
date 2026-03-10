/**
 * QuantumShield Scanner — Orchestrator
 * 
 * Main entry point for the scanner engine.
 * Coordinates TLS probing, cipher enumeration, quantum classification,
 * CBOM generation, and recommendation generation.
 */

const { probeTLS, detectSupportedVersions, enumerateCipherSuites } = require('./tlsProbe');
const { generateCBOM } = require('./cbomGenerator');

/**
 * Scan a single endpoint and generate a complete CBOM.
 * 
 * @param {string} host - Target hostname or IP
 * @param {number} port - Target port (default 443)
 * @param {object} options - Scan options
 * @returns {Promise<object>} Complete CBOM document
 */
async function scanEndpoint(host, port = 443, options = {}) {
  const {
    timeout = 10000,
    enumerateCiphers = true,
    detectVersions = true
  } = options;

  const scanStartTime = Date.now();
  const errors = [];

  console.log(`[QuantumShield] Starting scan of ${host}:${port}...`);

  // ── Step 1: Primary TLS Handshake ───────────────────────
  let primaryScan;
  try {
    console.log(`  [1/3] Performing TLS handshake...`);
    primaryScan = await probeTLS(host, port, { timeout });
    console.log(`  [1/3] ✓ TLS handshake successful (${primaryScan.handshakeTimeMs}ms)`);
    console.log(`         Protocol: ${primaryScan.tlsVersion}`);
    console.log(`         Cipher: ${primaryScan.negotiatedCipher.name}`);
    console.log(`         Certificate: ${primaryScan.certificate.commonName} (${primaryScan.certificate.keyAlgorithm} ${primaryScan.certificate.keySize}-bit)`);
  } catch (err) {
    console.error(`  [1/3] ✗ TLS handshake failed: ${err.message}`);
    errors.push({ phase: 'TLS Handshake', error: err.message });

    return {
      host,
      port,
      status: 'failed',
      error: err.message,
      errors,
      scanDuration: Date.now() - scanStartTime
    };
  }

  // ── Step 2: Detect Supported TLS Versions ───────────────
  let supportedVersions = [];
  if (detectVersions) {
    try {
      console.log(`  [2/3] Detecting supported TLS versions...`);
      supportedVersions = await detectSupportedVersions(host, port);
      const supported = supportedVersions.filter(v => v.supported).map(v => v.version);
      console.log(`  [2/3] ✓ Supported versions: ${supported.join(', ')}`);
    } catch (err) {
      console.warn(`  [2/3] ⚠ TLS version detection failed: ${err.message}`);
      errors.push({ phase: 'Version Detection', error: err.message });
      // Fall back to the version from primary handshake
      supportedVersions = [{ version: primaryScan.tlsVersion, supported: true }];
    }
  }

  // ── Step 3: Enumerate Cipher Suites ─────────────────────
  let cipherSuites = [];
  if (enumerateCiphers) {
    try {
      console.log(`  [3/3] Enumerating cipher suites...`);
      cipherSuites = await enumerateCipherSuites(host, port);
      console.log(`  [3/3] ✓ Found ${cipherSuites.length} supported cipher suites`);
    } catch (err) {
      console.warn(`  [3/3] ⚠ Cipher enumeration failed: ${err.message}`);
      errors.push({ phase: 'Cipher Enumeration', error: err.message });
      // Fall back to the negotiated cipher from primary handshake
      if (primaryScan.cipherSuiteDecomposition) {
        cipherSuites = [primaryScan.cipherSuiteDecomposition];
      }
    }
  }

  // ── Step 4: Generate CBOM ───────────────────────────────
  console.log(`  [CBOM] Generating Cryptographic Bill of Materials...`);
  const cbom = generateCBOM(primaryScan, cipherSuites, supportedVersions);

  const scanDuration = Date.now() - scanStartTime;
  console.log(`  [CBOM] ✓ CBOM generated successfully`);
  console.log(`  [RESULT] Label: ${cbom.quantumAssessment.label}`);
  console.log(`  [RESULT] Score: ${cbom.quantumAssessment.score.score}/100`);
  console.log(`  [RESULT] Recommendations: ${cbom.recommendations.length}`);
  console.log(`[QuantumShield] Scan complete in ${scanDuration}ms`);

  return {
    ...cbom,
    status: 'completed',
    errors,
    scanDuration
  };
}

/**
 * Scan multiple endpoints in sequence with rate limiting.
 * 
 * @param {Array<{host: string, port?: number}>} targets - Array of targets
 * @param {object} options - Scan options
 * @returns {Promise<object>} Aggregate scan results
 */
async function scanMultiple(targets, options = {}) {
  const {
    delayBetweenScans = 1000, // ms between scans to avoid triggering IDS
    ...scanOptions
  } = options;

  const results = [];
  const startTime = Date.now();

  console.log(`\n════════════════════════════════════════════════════`);
  console.log(`  QuantumShield Scanner — Batch Scan`);
  console.log(`  Targets: ${targets.length}`);
  console.log(`════════════════════════════════════════════════════\n`);

  for (let i = 0; i < targets.length; i++) {
    const target = typeof targets[i] === 'string'
      ? { host: targets[i], port: 443 }
      : targets[i];

    console.log(`\n─── Scanning ${i + 1}/${targets.length}: ${target.host}:${target.port || 443} ───\n`);

    try {
      const result = await scanEndpoint(target.host, target.port || 443, scanOptions);
      results.push(result);
    } catch (err) {
      results.push({
        host: target.host,
        port: target.port || 443,
        status: 'failed',
        error: err.message
      });
    }

    // Rate limiting — wait between scans
    if (i < targets.length - 1 && delayBetweenScans > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenScans));
    }
  }

  const totalDuration = Date.now() - startTime;

  // Aggregate statistics
  const completed = results.filter(r => r.status === 'completed');
  const failed = results.filter(r => r.status === 'failed');

  const labelCounts = {};
  for (const r of completed) {
    const label = r.quantumAssessment?.label || 'Unknown';
    labelCounts[label] = (labelCounts[label] || 0) + 1;
  }

  const aggregate = {
    scanId: `scan_${Date.now()}`,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    totalDuration,
    totalTargets: targets.length,
    completedScans: completed.length,
    failedScans: failed.length,
    labelDistribution: labelCounts,
    averageScore: completed.length > 0
      ? Math.round(completed.reduce((sum, r) => sum + (r.quantumAssessment?.score?.score || 0), 0) / completed.length)
      : 0,
    results
  };

  console.log(`\n════════════════════════════════════════════════════`);
  console.log(`  Batch Scan Complete`);
  console.log(`  Duration: ${totalDuration}ms`);
  console.log(`  Completed: ${completed.length}/${targets.length}`);
  console.log(`  Failed: ${failed.length}/${targets.length}`);
  console.log(`  Label Distribution: ${JSON.stringify(labelCounts)}`);
  console.log(`  Average Score: ${aggregate.averageScore}/100`);
  console.log(`════════════════════════════════════════════════════\n`);

  return aggregate;
}

module.exports = { scanEndpoint, scanMultiple };
