const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
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
    const scans = await Scan.find()
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
router.get('/:scanId/json', protect, authorize('admin', 'analyst'), async (req, res) => {
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
router.get('/:scanId/csv', protect, authorize('admin', 'analyst'), async (req, res) => {
  try {
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
router.get('/:scanId/pdf', protect, authorize('admin', 'analyst'), async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.scanId).lean();
    if (!scan) return res.status(404).json({ error: 'Scan not found' });

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
router.get('/label/:cbomId', protect, authorize('admin', 'analyst'), async (req, res) => {
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

// ═══════════════════════════════════════════════════════════
// EMAIL DELIVERY ROUTES
// ═══════════════════════════════════════════════════════════

const { sendReportEmail, sendTestEmail, getTransporter, getSenderEmail } = require('../utils/emailService');

// @route   GET /api/reports/email-status
// @desc    Check if email service is configured (Gmail + Outlook)
// @access  Private
router.get('/email-status', protect, (req, res) => {
  const gmailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
  const outlookConfigured = !!(process.env.OUTLOOK_USER && process.env.OUTLOOK_PASS);
  res.json({
    configured: gmailConfigured || outlookConfigured,
    gmail: {
      configured: gmailConfigured,
      emailUser: gmailConfigured ? process.env.EMAIL_USER.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null,
    },
    outlook: {
      configured: outlookConfigured,
      emailUser: outlookConfigured ? process.env.OUTLOOK_USER.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null,
    },
    // Legacy support
    emailUser: gmailConfigured ? process.env.EMAIL_USER.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null,
  });
});

// @route   POST /api/reports/test-email
// @desc    Send a test email to verify configuration
// @access  Private (admin only)
router.post('/test-email', protect, authorize('admin'), async (req, res) => {
  try {
    const { to, provider = 'gmail' } = req.body;
    if (!to) return res.status(400).json({ error: 'Recipient email required' });

    const info = await sendTestEmail(to, provider);

    await AuditLog.create({
      userId: req.user._id, username: req.user.username,
      action: 'TEST_EMAIL_SENT', details: { to, provider, messageId: info.messageId },
      ipAddress: req.ip
    }).catch(() => {});

    res.json({ success: true, message: `Test email sent via ${provider === 'outlook' ? 'Outlook' : 'Gmail'} to ${to}`, messageId: info.messageId });
  } catch (err) {
    console.error('[Email] Test email failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/reports/send-email
// @desc    Send a report email with attachment to specified recipients
// @access  Private (admin, analyst)
router.post('/send-email', protect, authorize('admin', 'analyst'), async (req, res) => {
  try {
    const { recipients, reportName, format = 'PDF', scanId, frequency = 'on-demand', provider = 'gmail' } = req.body;

    if (!recipients || (Array.isArray(recipients) && recipients.length === 0)) {
      return res.status(400).json({ error: 'At least one recipient email is required' });
    }

    // Find the scan — use provided scanId or latest completed scan
    let targetScanId = scanId;
    if (!targetScanId) {
      const latestScan = await Scan.findOne({ status: 'completed' }).sort({ completedAt: -1 }).lean();
      if (!latestScan) return res.status(404).json({ error: 'No completed scans found to report on' });
      targetScanId = latestScan._id;
    }

    const scan = await Scan.findById(targetScanId).lean();
    if (!scan) return res.status(404).json({ error: 'Scan not found' });

    const records = await CbomRecord.find({ scanId: targetScanId, status: 'completed' }).lean();
    if (!records.length) return res.status(404).json({ error: 'No completed records found for this scan' });

    // Build summary stats
    const pqcReady = records.filter(r => (r.quantumAssessment?.label || '').includes('Fully Quantum Safe')).length;
    const hybrid = records.filter(r => (r.quantumAssessment?.label || '').includes('Hybrid')).length;
    const vulnerable = records.length - pqcReady - hybrid;
    const avgScore = Math.round(records.reduce((sum, r) => sum + (r.quantumAssessment?.score?.score || 0), 0) / records.length);

    const summary = { totalAssets: records.length, pqcReady, hybrid, vulnerable, avgScore };

    // Generate attachment
    let attachment = null;
    let attachmentName = `quantumshield_report_${targetScanId}`;

    if (format === 'JSON') {
      const jsonData = JSON.stringify({
        cbomVersion: '1.0', generatedAt: new Date().toISOString(),
        generatedBy: 'QuantumShield Scanner v1.0',
        scanId: targetScanId, summary, records
      }, null, 2);
      attachment = Buffer.from(jsonData);
      attachmentName += '.json';

    } else if (format === 'CSV') {
      const csvRows = records.map(r => ({
        host: r.host, port: r.port,
        tlsVersions: r.tlsVersions?.supported?.join('; ') || '',
        certSubject: r.certificate?.commonName || '',
        quantumLabel: r.quantumAssessment?.label || '',
        quantumScore: r.quantumAssessment?.score?.score || '',
      }));
      const headers = Object.keys(csvRows[0]);
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => headers.map(h => {
          const val = String(row[h] || '');
          return val.includes(',') ? `"${val}"` : val;
        }).join(','))
      ].join('\n');
      attachment = Buffer.from(csvContent);
      attachmentName += '.csv';

    } else {
      // PDF — generate into buffer
      try {
        attachment = await new Promise((resolve, reject) => {
          const chunks = [];
          const { generateCBOMReport } = require('../utils/pdfGenerator');
          const stream = new (require('stream').PassThrough)();
          stream.on('data', chunk => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
          generateCBOMReport(scan, records, stream);
        });
        attachmentName += '.pdf';
      } catch (pdfErr) {
        console.error('[Email] PDF generation failed, sending without attachment:', pdfErr.message);
        // Send without attachment if PDF fails
      }
    }

    // Parse recipients
    const recipientList = Array.isArray(recipients)
      ? recipients
      : recipients.split(',').map(e => e.trim()).filter(Boolean);

    const info = await sendReportEmail({
      to: recipientList,
      reportName: reportName || 'PQC Assessment Report',
      frequency,
      attachment,
      attachmentName,
      format,
      summary,
      provider,
    });

    // Audit log
    await AuditLog.create({
      userId: req.user._id, username: req.user.username,
      action: 'REPORT_EMAILED',
      details: { scanId: targetScanId, recipients: recipientList, format, provider, messageId: info.messageId },
      ipAddress: req.ip
    }).catch(() => {});

    res.json({
      success: true,
      message: `Report sent to ${recipientList.length} recipient(s)`,
      recipients: recipientList,
      messageId: info.messageId,
    });

  } catch (err) {
    console.error('[Email] Send report failed:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

