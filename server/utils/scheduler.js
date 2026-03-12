const cron = require('node-cron');
const ScheduledScan = require('../models/ScheduledScan');
const Scan = require('../models/Scan');
const CbomRecord = require('../models/CbomRecord');
const AuditLog = require('../models/AuditLog');
const { scanEndpoint } = require('../../scanner');
const crypto = require('crypto');
const { getNextRun } = require('./cronUtils');

// Store active cron jobs
const activeJobs = new Map();

/**
 * Execute a scheduled scan
 */
async function executeScheduledScan(schedule) {
  console.log(`[Scheduler] Running scheduled scan: ${schedule.name} (${schedule._id})`);

  try {
    // Create a scan record
    const scan = await Scan.create({
      initiatedBy: schedule.createdBy,
      targets: schedule.targets,
      status: 'running',
      progress: { completed: 0, total: schedule.targets.length, failed: 0 },
      config: { scheduled: true, scheduleName: schedule.name },
      startedAt: new Date()
    });

    // Run scans
    let completed = 0, failed = 0;
    const labelCounts = {};

    for (const target of schedule.targets) {
      try {
        const result = await scanEndpoint(target.host, target.port);

        // Compute integrity hash
        const hashPayload = JSON.stringify({
          host: target.host, port: target.port,
          keyAlgorithm: result.certificate?.keyAlgorithm,
          keySize: result.certificate?.keySize,
          signatureAlgorithm: result.certificate?.signatureAlgorithm,
          serialNumber: result.certificate?.serialNumber,
          bestVersion: result.tlsVersions?.bestVersion,
          quantumLabel: result.quantumAssessment?.label
        });
        const integrityHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

        await CbomRecord.create({
          scanId: scan._id,
          host: target.host,
          port: target.port,
          status: result.status || 'completed',
          scanDuration: result.scanDuration,
          tlsVersions: result.tlsVersions,
          negotiatedCipher: result.negotiatedCipher,
          certificate: result.certificate,
          certificateChain: result.certificateChain,
          cipherSuites: result.cipherSuites,
          ephemeralKeyInfo: result.ephemeralKeyInfo,
          quantumAssessment: result.quantumAssessment,
          recommendations: result.recommendations,
          executiveSummary: result.executiveSummary,
          integrityHash,
          integrityPayload: hashPayload
        });

        completed++;
        const lbl = result.quantumAssessment?.label || 'Unknown';
        labelCounts[lbl] = (labelCounts[lbl] || 0) + 1;
      } catch (err) {
        failed++;
        await CbomRecord.create({
          scanId: scan._id, host: target.host, port: target.port,
          status: 'error', error: err.message
        });
      }

      await Scan.findByIdAndUpdate(scan._id, {
        progress: { completed: completed + failed, total: schedule.targets.length, failed }
      });
    }

    // Finalize scan
    await Scan.findByIdAndUpdate(scan._id, {
      status: failed === schedule.targets.length ? 'failed' : 'completed',
      completedAt: new Date(),
      progress: { completed, total: schedule.targets.length, failed },
      summary: { averageScore: 0, labelDistribution: labelCounts }
    });

    // Update schedule
    await ScheduledScan.findByIdAndUpdate(schedule._id, {
      lastRun: new Date(),
      lastScanId: scan._id,
      nextRun: getNextRun(schedule.cronExpression),
      $inc: { runCount: 1 }
    });

    await AuditLog.create({
      userId: schedule.createdBy,
      username: 'Scheduler',
      action: 'SCHEDULED_SCAN_COMPLETED',
      details: { scheduleId: schedule._id, scanId: scan._id, completed, failed }
    });

    console.log(`[Scheduler] Scan completed: ${completed} ok, ${failed} failed`);
  } catch (err) {
    console.error(`[Scheduler] Error running scheduled scan:`, err);
  }
}

/**
 * Start a cron job for a scheduled scan
 */
function startJob(schedule) {
  if (activeJobs.has(schedule._id.toString())) {
    activeJobs.get(schedule._id.toString()).stop();
  }

  if (!schedule.enabled) return;

  const job = cron.schedule(schedule.cronExpression, () => {
    executeScheduledScan(schedule);
  });

  activeJobs.set(schedule._id.toString(), job);
  console.log(`[Scheduler] Job started: ${schedule.name} (${schedule.cronExpression})`);
}

/**
 * Stop a cron job
 */
function stopJob(scheduleId) {
  const id = scheduleId.toString();
  if (activeJobs.has(id)) {
    activeJobs.get(id).stop();
    activeJobs.delete(id);
    console.log(`[Scheduler] Job stopped: ${id}`);
  }
}

/**
 * Initialize all enabled scheduled scans on server start
 */
async function initScheduler() {
  try {
    const schedules = await ScheduledScan.find({ enabled: true });
    console.log(`[Scheduler] Initializing ${schedules.length} scheduled scan(s)`);
    for (const schedule of schedules) {
      startJob(schedule);
    }
  } catch (err) {
    console.error('[Scheduler] Init error:', err);
  }
}

module.exports = { initScheduler, startJob, stopJob, executeScheduledScan, getNextRun };
