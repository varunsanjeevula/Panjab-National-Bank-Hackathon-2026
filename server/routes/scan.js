const express = require('express');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const Scan = require('../models/Scan');
const CbomRecord = require('../models/CbomRecord');
const AuditLog = require('../models/AuditLog');
const { scanEndpoint } = require('../../scanner');

const router = express.Router();

// @route   POST /api/scan
// @desc    Initiate a new scan
// @access  Private (admin, analyst)
router.post('/', protect, authorize('admin', 'analyst'), async (req, res) => {
  try {
    const { targets, config } = req.body;

    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one target' });
    }

    // Normalize targets — strip protocol, paths, trailing slashes
    const normalizedTargets = targets.map(t => {
      let host, port = 443;
      if (typeof t === 'string') {
        host = t.trim();
      } else {
        host = t.host?.trim();
        port = t.port || 443;
      }
      if (!host) return null;

      // Strip protocol (https://, http://)
      host = host.replace(/^https?:\/\//i, '');
      // Strip trailing path and query string
      host = host.split('/')[0];
      // Extract port if present (e.g., example.com:8443)
      if (host.includes(':')) {
        const parts = host.split(':');
        host = parts[0];
        port = parseInt(parts[1]) || 443;
      }

      return { host, port };
    }).filter(t => t && t.host);

    // Create scan record
    const scan = await Scan.create({
      initiatedBy: req.user._id,
      targets: normalizedTargets,
      status: 'running',
      progress: { completed: 0, total: normalizedTargets.length, failed: 0 },
      config: config || {},
      startedAt: new Date()
    });

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      username: req.user.username,
      action: 'SCAN_INITIATED',
      details: { scanId: scan._id, targetCount: normalizedTargets.length, targets: normalizedTargets.map(t => t.host) },
      ipAddress: req.ip
    });

    // On Vercel (serverless), run scan synchronously before responding
    // because the function terminates after the response is sent
    if (process.env.VERCEL) {
      await runScanInBackground(scan, normalizedTargets, req.user);
      const updatedScan = await Scan.findById(scan._id);
      res.status(201).json({
        scanId: scan._id,
        status: updatedScan.status,
        targets: normalizedTargets.length,
        message: 'Scan completed.'
      });
    } else {
      // Return immediately — scanning happens asynchronously
      res.status(201).json({
        scanId: scan._id,
        status: 'running',
        targets: normalizedTargets.length,
        message: 'Scan initiated. Use GET /api/scan/:id to check progress.'
      });
      runScanInBackground(scan, normalizedTargets, req.user);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Execute scans asynchronously in the background.
 */
async function runScanInBackground(scan, targets, user) {
  const results = [];
  let completed = 0;
  let failed = 0;

  for (const target of targets) {
    try {
      const result = await scanEndpoint(target.host, target.port);

      // Save CBOM record to DB
      const cbomRecord = await CbomRecord.create({
        scanId: scan._id,
        host: target.host,
        port: target.port,
        status: result.status || 'completed',
        scanDuration: result.scanDuration,
        tlsVersions: result.tlsVersions,
        negotiatedCipher: result.negotiatedCipher,
        certificate: result.certificate,
        certificateChain: result.certificateChain,
        cipherSuites: result.cipherSuites,
        ephemeralKeyInfo: result.ephemeralKeyInfo,
        quantumAssessment: result.quantumAssessment,
        recommendations: result.recommendations,
        executiveSummary: result.executiveSummary,
        statistics: result.statistics
      });

      // Compute integrity hash from key verifiable fields
      const integrityPayload = JSON.stringify({
        host: target.host,
        port: target.port,
        certFingerprint: result.certificate?.fingerprint256 || '',
        certSerial: result.certificate?.serialNumber || '',
        certIssuer: result.certificate?.issuerOrg || '',
        certCN: result.certificate?.commonName || '',
        tlsBestVersion: result.tlsVersions?.bestVersion || '',
        cipherName: result.negotiatedCipher?.standardName || result.negotiatedCipher?.name || '',
        keyAlgorithm: result.certificate?.keyAlgorithm || '',
        keySize: result.certificate?.keySize || 0,
        quantumScore: result.quantumAssessment?.score?.score || 0,
        quantumLabel: result.quantumAssessment?.label || '',
        scanTimestamp: cbomRecord.createdAt.toISOString()
      });
      const integrityHash = crypto.createHash('sha256').update(integrityPayload).digest('hex');
      await CbomRecord.findByIdAndUpdate(cbomRecord._id, { integrityHash, integrityPayload });

      results.push(cbomRecord._id);
      completed++;
    } catch (err) {
      // Save failed record
      const failedRecord = await CbomRecord.create({
        scanId: scan._id,
        host: target.host,
        port: target.port,
        status: 'failed',
        error: err.message
      });
      results.push(failedRecord._id);
      failed++;
    }

    // Update progress
    await Scan.findByIdAndUpdate(scan._id, {
      'progress.completed': completed,
      'progress.failed': failed,
      results
    });

    // Small delay between scans
    if (targets.indexOf(target) < targets.length - 1) {
      await new Promise(resolve => setTimeout(resolve, scan.config?.delayBetweenScans || 500));
    }
  }

  // Compute summary
  const cbomRecords = await CbomRecord.find({ scanId: scan._id, status: 'completed' });
  const labelCounts = {};
  let totalScore = 0;

  for (const record of cbomRecords) {
    const label = record.quantumAssessment?.label || 'Unknown';
    labelCounts[label] = (labelCounts[label] || 0) + 1;
    totalScore += record.quantumAssessment?.score?.score || 0;
  }

  // Update scan as completed
  await Scan.findByIdAndUpdate(scan._id, {
    status: failed === targets.length ? 'failed' : (failed > 0 ? 'partial' : 'completed'),
    results,
    completedAt: new Date(),
    summary: {
      totalTargets: targets.length,
      completedScans: completed,
      failedScans: failed,
      averageScore: cbomRecords.length > 0 ? Math.round(totalScore / cbomRecords.length) : 0,
      labelDistribution: labelCounts
    }
  });

  // Audit log
  await AuditLog.create({
    userId: user._id,
    username: user.username,
    action: 'SCAN_COMPLETED',
    details: { scanId: scan._id, completed, failed, labelDistribution: labelCounts }
  });
}

// @route   GET /api/scan
// @desc    List all scans
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const scans = await Scan.find({ initiatedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('initiatedBy', 'username');
    res.json(scans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/scan/:id
// @desc    Get scan details with results
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id).populate('initiatedBy', 'username');
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Get CBOM records
    const cbomRecords = await CbomRecord.find({ scanId: scan._id });

    res.json({ scan, cbomRecords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
