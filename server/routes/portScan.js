const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const PortScan = require('../models/PortScan');
const AuditLog = require('../models/AuditLog');
const { runPortScan, assessVulnerabilities } = require('../utils/portScanner');

const router = express.Router();

// ─── POST /api/port-scan — Initiate a port scan ────────
router.post('/', protect, authorize('admin', 'analyst'), async (req, res) => {
  try {
    const { target, profile = 'standard', customPorts = [] } = req.body;

    if (!target || !target.trim()) {
      return res.status(400).json({ error: 'Target hostname or IP is required' });
    }

    const cleanTarget = target.trim().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];

    // Validate profile
    const validProfiles = ['quick', 'standard', 'full', 'custom'];
    if (!validProfiles.includes(profile)) {
      return res.status(400).json({ error: `Invalid profile. Use: ${validProfiles.join(', ')}` });
    }

    // Create scan record
    const portScan = await PortScan.create({
      target: cleanTarget,
      initiatedBy: req.user._id,
      profile,
      status: 'running',
      startedAt: new Date(),
    });

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      username: req.user.username,
      action: 'PORT_SCAN_INITIATED',
      details: { scanId: portScan._id, target: cleanTarget, profile },
      ipAddress: req.ip,
    });

    // Return immediately
    res.status(201).json({
      scanId: portScan._id,
      target: cleanTarget,
      profile,
      status: 'running',
      message: 'Port scan initiated. Poll GET /api/port-scan/:id for results.',
    });

    // Run scan in background
    runScanInBackground(portScan, cleanTarget, profile, customPorts, req.user);
  } catch (err) {
    console.error('[PortScan] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

async function runScanInBackground(portScan, target, profile, customPorts, user) {
  try {
    const result = await runPortScan(
      target,
      profile,
      customPorts,
      50,   // concurrency
      3000, // timeout per port
      async (progress) => {
        // Update progress in DB
        await PortScan.findByIdAndUpdate(portScan._id, {
          'progress.scanned': progress.scanned,
          'progress.total': progress.total,
          'progress.openCount': progress.openCount,
        });
      }
    );

    // Run vulnerability assessment on open ports
    const vulnAssessment = assessVulnerabilities(result.openPorts, target);

    // Update with results
    await PortScan.findByIdAndUpdate(portScan._id, {
      status: 'completed',
      portsScanned: result.portsScanned,
      openPorts: result.openPorts.map(p => ({
        port: p.port,
        state: p.state,
        service: p.service,
        protocol: p.protocol,
        riskLevel: p.riskLevel,
        description: p.description,
        quantumNote: p.quantumNote || '',
        banner: p.banner,
        responseTime: p.responseTime,
      })),
      filteredCount: result.filteredPorts,
      closedCount: result.closedPorts,
      scanDuration: result.scanDuration,
      completedAt: new Date(),
      vulnAssessment,
      'progress.scanned': result.portsScanned,
      'progress.total': result.portsScanned,
      'progress.openCount': result.openPorts.length,
    });

    // Audit log
    await AuditLog.create({
      userId: user._id,
      username: user.username,
      action: 'PORT_SCAN_COMPLETED',
      details: {
        scanId: portScan._id,
        target,
        openPorts: result.openPorts.length,
        vulnerabilities: vulnAssessment.totalVulnerabilities,
        riskScore: vulnAssessment.riskScore,
      },
    });

    console.log(`[PortScan] ✅ ${target} — ${result.openPorts.length} open ports, ${vulnAssessment.totalVulnerabilities} vulns, risk: ${vulnAssessment.riskLevel}`);
  } catch (err) {
    console.error('[PortScan] Scan failed:', err.message);
    await PortScan.findByIdAndUpdate(portScan._id, {
      status: 'failed',
      error: err.message,
      completedAt: new Date(),
    });
  }
}

// ─── GET /api/port-scan — List all port scans ──────────
router.get('/', protect, async (req, res) => {
  try {
    const scans = await PortScan.find({}, 'target status profile portsScanned progress openPorts scanDuration vulnAssessment.riskScore vulnAssessment.riskLevel vulnAssessment.totalVulnerabilities createdAt completedAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('initiatedBy', 'username')
      .lean();

    // Simplify response
    const simplified = scans.map(s => ({
      _id: s._id,
      target: s.target,
      status: s.status,
      profile: s.profile,
      portsScanned: s.portsScanned,
      openPortCount: s.openPorts?.length || 0,
      progress: s.progress,
      scanDuration: s.scanDuration,
      riskScore: s.vulnAssessment?.riskScore || 0,
      riskLevel: s.vulnAssessment?.riskLevel || 'N/A',
      vulnCount: s.vulnAssessment?.totalVulnerabilities || 0,
      initiatedBy: s.initiatedBy,
      createdAt: s.createdAt,
      completedAt: s.completedAt,
    }));

    res.json(simplified);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/port-scan/:id — Get scan details ─────────
router.get('/:id', protect, async (req, res) => {
  try {
    const scan = await PortScan.findById(req.params.id)
      .populate('initiatedBy', 'username')
      .lean();

    if (!scan) {
      return res.status(404).json({ error: 'Port scan not found' });
    }

    res.json(scan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
