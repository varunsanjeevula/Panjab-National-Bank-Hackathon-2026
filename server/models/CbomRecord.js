const mongoose = require('mongoose');

const cbomRecordSchema = new mongoose.Schema({
  scanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scan',
    required: true
  },
  // Target info
  host: { type: String, required: true },
  port: { type: Number, default: 443 },
  status: { type: String, enum: ['completed', 'failed', 'error'], default: 'completed' },
  error: String,
  scanDuration: Number,

  // TLS Versions
  tlsVersions: {
    supported: [String],
    unsupported: [String],
    deprecated: [mongoose.Schema.Types.Mixed],
    hasTLS13: Boolean,
    hasDeprecated: Boolean,
    bestVersion: String
  },

  // Certificate
  certificate: {
    subject: String,
    commonName: String,
    issuer: String,
    issuerOrg: String,
    keyAlgorithm: String,
    keySize: Number,
    signatureAlgorithm: String,
    validFrom: String,
    validTo: String,
    isExpired: Boolean,
    daysUntilExpiry: Number,
    serialNumber: String,
    sans: [String],
    fingerprint256: String,
    selfSigned: Boolean,
    keyClassification: mongoose.Schema.Types.Mixed,
    signatureClassification: mongoose.Schema.Types.Mixed
  },

  certificateChain: [mongoose.Schema.Types.Mixed],

  // Negotiated Cipher
  negotiatedCipher: mongoose.Schema.Types.Mixed,

  // Cipher Suites
  cipherSuites: [mongoose.Schema.Types.Mixed],

  // Ephemeral Key
  ephemeralKeyInfo: mongoose.Schema.Types.Mixed,

  // Cleartext Services
  cleartextServices: [mongoose.Schema.Types.Mixed],

  // Quantum Assessment
  quantumAssessment: {
    label: String,
    labelDescription: String,
    issues: [String],
    score: {
      score: Number,
      deductions: [String]
    }
  },

  // Recommendations
  recommendations: [mongoose.Schema.Types.Mixed],
  executiveSummary: mongoose.Schema.Types.Mixed,

  // Statistics
  statistics: mongoose.Schema.Types.Mixed,

  // Integrity verification
  integrityHash: String,
  integrityPayload: String
}, {
  timestamps: true
});

// Index for efficient queries
cbomRecordSchema.index({ scanId: 1 });
cbomRecordSchema.index({ host: 1 });
cbomRecordSchema.index({ 'quantumAssessment.label': 1 });

module.exports = mongoose.model('CbomRecord', cbomRecordSchema);
