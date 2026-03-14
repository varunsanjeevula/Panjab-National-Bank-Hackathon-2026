const express = require('express');
const { protect } = require('../middleware/auth');
const CbomRecord = require('../models/CbomRecord');

const router = express.Router();

// @route   GET /api/cbom/:scanId
// @desc    Get all CBOM records for a scan
// @access  Private
router.get('/:scanId', protect, async (req, res) => {
  try {
    const records = await CbomRecord.find({ scanId: req.params.scanId }).lean();
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
    const record = await CbomRecord.findById(req.params.id).lean();
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
let statsCache = { data: null, ts: 0 };
const STATS_TTL = 60 * 1000; // 1-minute cache

router.get('/stats/overview', protect, async (req, res) => {
  try {
    if (statsCache.data && Date.now() - statsCache.ts < STATS_TTL) {
      return res.json(statsCache.data);
    }

    const agg = await CbomRecord.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$quantumAssessment.label',
          count: { $sum: 1 },
          totalScore: { $sum: '$quantumAssessment.score.score' }
        }
      }
    ]);

    let totalAssets = 0;
    let totalScore = 0;
    const labelDistribution = {};
    for (const item of agg) {
      labelDistribution[item._id] = item.count;
      totalAssets += item.count;
      totalScore += item.totalScore;
    }

    const result = {
      totalAssets,
      labelDistribution,
      averageScore: totalAssets > 0 ? Math.round(totalScore / totalAssets) : 0
    };

    statsCache = { data: result, ts: Date.now() };
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
