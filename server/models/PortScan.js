const mongoose = require('mongoose');

const portResultSchema = new mongoose.Schema({
  port: Number,
  state: { type: String, enum: ['open', 'closed', 'filtered'] },
  service: String,
  protocol: String,
  riskLevel: { type: String, enum: ['critical', 'high', 'medium', 'low', 'info'] },
  description: String,
  quantumNote: String,
  banner: String,
  responseTime: Number,
}, { _id: false });

const vulnerabilitySchema = new mongoose.Schema({
  cveId: String,
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
  cvss: Number,
  description: String,
  affectedPort: Number,
  affectedService: String,
  exploitAvailable: Boolean,
  recommendation: String,
  quantumRelevance: String,
}, { _id: false });

const portScanSchema = new mongoose.Schema({
  target: { type: String, required: true, index: true },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed'],
    default: 'running',
  },
  profile: {
    type: String,
    enum: ['quick', 'standard', 'full', 'custom'],
    default: 'standard',
  },
  portsScanned: { type: Number, default: 0 },
  progress: {
    scanned: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    openCount: { type: Number, default: 0 },
  },
  openPorts: [portResultSchema],
  filteredCount: { type: Number, default: 0 },
  closedCount: { type: Number, default: 0 },
  scanDuration: Number,

  // Vulnerability Assessment
  vulnAssessment: {
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    riskScore: { type: Number, default: 0 },
    riskLevel: { type: String, default: 'LOW' },
    totalVulnerabilities: { type: Number, default: 0 },
    criticalCount: { type: Number, default: 0 },
    highCount: { type: Number, default: 0 },
    mediumCount: { type: Number, default: 0 },
    lowCount: { type: Number, default: 0 },
    summary: String,
    vulnerabilities: [vulnerabilitySchema],
  },

  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  error: String,
}, { timestamps: true });

module.exports = mongoose.model('PortScan', portScanSchema);
