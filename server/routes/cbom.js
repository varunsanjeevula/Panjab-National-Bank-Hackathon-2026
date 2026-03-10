const express = require('express');
const { protect } = require('../middleware/auth');
const CbomRecord = require('../models/CbomRecord');

const router = express.Router();

// @route   GET /api/cbom/:scanId
// @desc    Get all CBOM records for a scan
// @access  Private
router.get('/:scanId', protect, async (req, res) => {
  try {
    const records = await CbomRecord.find({ scanId: req.params.scanId });
    if (!records.length) {
      return res.status(404).json({ error: 'No CBOM records found for this scan' });
    }
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/cbom/record/:id
// @desc    Get a single CBOM record (asset detail)
// @access  Private
router.get('/record/:id', protect, async (req, res) => {
  try {
    const record = await CbomRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'CBOM record not found' });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/cbom/stats/overview
// @desc    Get aggregate CBOM statistics across all scans
// @access  Private
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const totalAssets = await CbomRecord.countDocuments({ status: 'completed' });

    const labelAgg = await CbomRecord.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$quantumAssessment.label', count: { $sum: 1 } } }
    ]);

    const labelDistribution = {};
    labelAgg.forEach(l => { labelDistribution[l._id] = l.count; });

    const scoreAgg = await CbomRecord.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, avgScore: { $avg: '$quantumAssessment.score.score' } } }
    ]);

    res.json({
      totalAssets,
      labelDistribution,
      averageScore: Math.round(scoreAgg[0]?.avgScore || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
