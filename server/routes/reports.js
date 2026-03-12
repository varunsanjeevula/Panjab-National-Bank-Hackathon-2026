const express = require('express');
const { protect } = require('../middleware/auth');
const CbomRecord = require('../models/CbomRecord');
const Scan = require('../models/Scan');
const AuditLog = require('../models/AuditLog');
const { generateCBOMReport, generatePQCLabel } = require('../utils/pdfGenerator');

const router = express.Router();

// @route   GET /api/reports/list
// @desc    List all scans for the reports page
// @access  Private
router.get('/list', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { initiatedBy: req.user._id };
    const scans = await Scan.find(filter)
      .sort({ createdAt: -1 })
      .populate('initiatedBy', 'username')
      .lean();

    // Attach record count and summary stats per scan
    const enriched = await Promise.all(scans.map(async (scan) => {
      const records = await CbomRecord.find({ scanId: scan._id }).lean();
      const completed = records.filter(r => r.status === 'completed');
      const pqcReady = completed.filter(r => (r.quantumAssessment?.label || '').includes('Fully Quantum Safe')).length;
      const hybrid = completed.filter(r => (r.quantumAssessment?.label || '').includes('Hybrid')).length;
      const notReady = completed.length - pqcReady - hybrid;
      const avgScore = completed.length > 0
        ? Math.round(completed.reduce((sum, r) => sum + (r.quantumAssessment?.score?.score || 0), 0) / completed.length)
        : 0;

      return {
        _id: scan._id,
        status: scan.status,
        targets: scan.targets,
        targetCount: scan.targets?.length || 0,
        completedCount: completed.length,
        failedCount: records.filter(r => r.status === 'error').length,
        pqcReady,
        hybrid,
        notReady,
        avgScore,
        initiatedBy: scan.initiatedBy?.username || 'Unknown',
        startedAt: scan.startedAt,
        completedAt: scan.completedAt,
        createdAt: scan.createdAt,
      };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/reports/:scanId/json
// @desc    Export CBOM as JSON
// @access  Private
router.get('/:scanId/json', protect, async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.scanId).lean();
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    if (req.user.role !== 'admin' && scan.initiatedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to export this scan' });
    }

    const records = await CbomRecord.find({ scanId: req.params.scanId }).lean();
    if (!records.length) {
      return res.status(404).json({ error: 'No records found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      username: req.user.username,
      action: 'REPORT_EXPORTED',
      details: { scanId: req.params.scanId, format: 'JSON' },
      ipAddress: req.ip
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=cbom_${req.params.scanId}.json`);
    res.json({
      cbomVersion: '1.0',
      generatedAt: new Date().toISOString(),
      generatedBy: 'QuantumShield Scanner v1.0',
      scanId: req.params.scanId,
      totalEndpoints: records.length,
      records
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/reports/:scanId/csv
// @desc    Export CBOM as CSV  
// @access  Private
router.get('/:scanId/csv', protect, async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.scanId).lean();
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    if (req.user.role !== 'admin' && scan.initiatedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to export this scan' });
    }

    const records = await CbomRecord.find({ scanId: req.params.scanId, status: 'completed' }).lean();
    if (!records.length) {
      return res.status(404).json({ error: 'No records found' });
    }

    const csvRows = records.map(r => ({
      host: r.host,
      port: r.port,
      tlsVersions: r.tlsVersions?.supported?.join('; ') || '',
      bestTlsVersion: r.tlsVersions?.bestVersion || '',
      certSubject: r.certificate?.commonName || '',
      certIssuer: r.certificate?.issuerOrg || '',
      certKeyAlgorithm: r.certificate?.keyAlgorithm || '',
      certKeySize: r.certificate?.keySize || '',
      certSignatureAlgorithm: r.certificate?.signatureAlgorithm || '',
      certValidTo: r.certificate?.validTo || '',
      certIsExpired: r.certificate?.isExpired ? 'Yes' : 'No',
      certDaysUntilExpiry: r.certificate?.daysUntilExpiry || '',
      cipherSuiteCount: r.cipherSuites?.length || 0,
      topCipherSuite: r.cipherSuites?.[0]?.name || '',
      quantumLabel: r.quantumAssessment?.label || '',
      quantumScore: r.quantumAssessment?.score?.score || '',
      totalRecommendations: r.recommendations?.length || 0,
      criticalRecommendations: r.recommendations?.filter(rec => rec.severity === 'Critical').length || 0,
      scanDuration: r.scanDuration || ''
    }));

    const headers = Object.keys(csvRows[0]);
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => headers.map(h => {
        const val = String(row[h] || '');
        return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(','))
    ].join('\n');

    await AuditLog.create({
      userId: req.user._id,
      username: req.user.username,
      action: 'REPORT_EXPORTED',
      details: { scanId: req.params.scanId, format: 'CSV' },
      ipAddress: req.ip
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=cbom_${req.params.scanId}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/reports/:scanId/pdf
// @desc    Export full CBOM report as PDF
// @access  Private
router.get('/:scanId/pdf', protect, async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.scanId).lean();
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    if (req.user.role !== 'admin' && scan.initiatedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to export this scan' });
    }

    const records = await CbomRecord.find({ scanId: req.params.scanId, status: 'completed' }).lean();
    if (!records.length) return res.status(404).json({ error: 'No completed records found' });

    await AuditLog.create({
      userId: req.user._id,
      username: req.user.username,
      action: 'REPORT_EXPORTED',
      details: { scanId: req.params.scanId, format: 'PDF' },
      ipAddress: req.ip
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cbom_report_${req.params.scanId}.pdf`);
    generateCBOMReport(scan, records, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/reports/label/:cbomId
// @desc    Download PQC digital label/certificate for an asset
// @access  Private
router.get('/label/:cbomId', protect, async (req, res) => {
  try {
    const record = await CbomRecord.findById(req.params.cbomId).lean();
    if (!record) return res.status(404).json({ error: 'Record not found' });

    await AuditLog.create({
      userId: req.user._id,
      username: req.user.username,
      action: 'LABEL_DOWNLOADED',
      details: { cbomId: req.params.cbomId, host: record.host },
      ipAddress: req.ip
    }).catch(() => {}); // Don't fail if audit log fails

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=pqc_label_${record.host}.pdf`);
    generatePQCLabel(record, res);
  } catch (err) {
    console.error('Label generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

module.exports = router;
