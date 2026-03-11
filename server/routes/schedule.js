const express = require('express');
const cron = require('node-cron');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ScheduledScan = require('../models/ScheduledScan');
const { startJob, stopJob, executeScheduledScan, getNextRun } = require('../utils/scheduler');

const router = express.Router();

// All schedule routes require admin or analyst
router.use(protect, authorize('admin', 'analyst'));

// Helper: frequency to cron expression
function frequencyToCron(frequency, time = '02:00') {
  const [hour, minute] = time.split(':').map(Number);
  switch (frequency) {
    case 'daily': return `${minute} ${hour} * * *`;
    case 'weekly': return `${minute} ${hour} * * 1`; // Monday
    case 'monthly': return `${minute} ${hour} 1 * *`; // 1st of month
    default: return `${minute} ${hour} * * 1`;
  }
}

// @route   GET /api/schedules
// @desc    List all scheduled scans
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const schedules = await ScheduledScan.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username')
      .populate('lastScanId', 'status completedAt')
      .lean();
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/schedules
// @desc    Create a new scheduled scan
router.post('/', async (req, res) => {
  try {
    const { name, targets, frequency, time, config } = req.body;
    if (!name || !targets || !targets.length) {
      return res.status(400).json({ error: 'Name and targets are required' });
    }

    const cronExpression = frequency === 'custom' ? req.body.cronExpression : frequencyToCron(frequency, time);
    if (!cron.validate(cronExpression)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    const schedule = await ScheduledScan.create({
      name,
      targets: targets.map(t => ({ host: t.host || t, port: t.port || 443 })),
      frequency: frequency || 'weekly',
      cronExpression,
      createdBy: req.user._id,
      nextRun: getNextRun(cronExpression),
      config: config || {}
    });

    startJob(schedule);
    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/schedules/:id
// @desc    Update a scheduled scan
router.put('/:id', async (req, res) => {
  try {
    const { name, targets, frequency, time, enabled, config } = req.body;
    const update = {};
    if (name) update.name = name;
    if (targets) update.targets = targets.map(t => ({ host: t.host || t, port: t.port || 443 }));
    if (frequency) {
      update.frequency = frequency;
      update.cronExpression = frequency === 'custom' ? req.body.cronExpression : frequencyToCron(frequency, time);
      update.nextRun = getNextRun(update.cronExpression);
    }
    if (typeof enabled === 'boolean') update.enabled = enabled;
    if (config) update.config = config;

    const schedule = await ScheduledScan.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

    // Restart or stop job
    if (schedule.enabled) {
      startJob(schedule);
    } else {
      stopJob(schedule._id);
    }

    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   DELETE /api/schedules/:id
// @desc    Delete a scheduled scan
router.delete('/:id', async (req, res) => {
  try {
    const schedule = await ScheduledScan.findByIdAndDelete(req.params.id);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    stopJob(schedule._id);
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/schedules/:id/run
// @desc    Manually trigger a scheduled scan
router.post('/:id/run', async (req, res) => {
  try {
    const schedule = await ScheduledScan.findById(req.params.id);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    executeScheduledScan(schedule);
    res.json({ message: 'Scan triggered', scheduleName: schedule.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
