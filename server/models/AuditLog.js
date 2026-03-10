const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  action: {
    type: String,
    enum: ['LOGIN', 'LOGOUT', 'SCAN_INITIATED', 'SCAN_COMPLETED', 'REPORT_EXPORTED', 'USER_CREATED', 'CONFIG_CHANGED'],
    required: true
  },
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  result: { type: String, enum: ['success', 'failure'], default: 'success' },
  timestamp: { type: Date, default: Date.now }
});

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
