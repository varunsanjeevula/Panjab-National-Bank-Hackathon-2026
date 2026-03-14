const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targets: [{
    host: { type: String, required: true },
    port: { type: Number, default: 443 }
  }],
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'partial'],
    default: 'pending'
  },
  progress: {
    completed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },
  config: {
    timeout: { type: Number, default: 10000 },
    enumerateCiphers: { type: Boolean, default: true },
    detectVersions: { type: Boolean, default: true },
    delayBetweenScans: { type: Number, default: 1000 }
  },
  results: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CbomRecord'
  }],
  summary: {
    totalTargets: Number,
    completedScans: Number,
    failedScans: Number,
    averageScore: Number,
    labelDistribution: mongoose.Schema.Types.Mixed
  },
  startedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Indexes for fast queries
scanSchema.index({ initiatedBy: 1, status: 1, createdAt: -1 });
scanSchema.index({ status: 1 });

module.exports = mongoose.model('Scan', scanSchema);
