const express = require('express');
const { protect } = require('../middleware/auth');
const CbomRecord = require('../models/CbomRecord');

const router = express.Router();

// @route   GET /api/assets/domains
// @desc    Get domain assets aggregated from all CBOM records
// @access  Private
router.get('/domains', protect, async (req, res) => {
  try {
    const records = await CbomRecord.find(
      { status: 'completed' },
      {
        host: 1,
        createdAt: 1,
        'certificate.validFrom': 1,
        'certificate.issuerOrg': 1,
        'certificate.subject': 1,
        'certificate.commonName': 1,
      }
    ).sort({ createdAt: -1 });

    const domains = records.map((r) => ({
      id: r._id,
      detectionDate: r.createdAt,
      domainName: r.host,
      // Best-available proxy from TLS scan data:
      // certificate.validFrom is the SSL cert issuance date (closest to registration date)
      // certificate.issuerOrg is the Certificate Authority (closest to registrar)
      // certificate.subject / commonName is the cert subject (closest to company name)
      registrationDate: r.certificate?.validFrom || null,
      registrar: r.certificate?.issuerOrg || null,
      companyName: r.certificate?.subject || r.certificate?.commonName || null,
    }));

    res.json(domains);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
