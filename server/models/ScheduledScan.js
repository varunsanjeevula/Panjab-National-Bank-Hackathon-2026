const mongoose = require('mongoose');

const scheduledScanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  targets: [{
    host: { type: String, required: true },
    port: { type: Number, default: 443 }
  }],
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    default: 'weekly'
  },
  cronExpression: {
    type: String,
    default: '0 2 * * 1' // Default: Monday 2 AM
  },
  enabled: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastRun: Date,
  nextRun: Date,
  lastScanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scan'
  },
  runCount: {
    type: Number,
    default: 0
  },
  config: {
    scanVpn: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('ScheduledScan', scheduledScanSchema);
