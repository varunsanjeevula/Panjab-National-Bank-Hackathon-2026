const express = require('express');
const { protect } = require('../middleware/auth');
const CbomRecord = require('../models/CbomRecord');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// @route   GET /api/reports/:scanId/json
// @desc    Export CBOM as JSON
// @access  Private
router.get('/:scanId/json', protect, async (req, res) => {
  try {
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
    const records = await CbomRecord.find({ scanId: req.params.scanId, status: 'completed' }).lean();
    if (!records.length) {
      return res.status(404).json({ error: 'No records found' });
    }

    // Flatten CBOM data for CSV
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

    // Generate CSV
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

module.exports = router;
