const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const { scanEndpoint } = require('../../scanner');
const CbomRecord = require('../models/CbomRecord');
const Scan = require('../models/Scan');
const User = require('../models/User');
const { generateCBOMReport, generatePQCLabel } = require('../utils/pdfGenerator');
const { sendReportEmail } = require('../utils/emailService');
const { PassThrough } = require('stream');

let bot = null;

/**
 * Collect a PDFKit doc (piped to a stream) into a Buffer.
 */
function pdfToBuffer(generatorFn, ...args) {
  return new Promise((resolve, reject) => {
    const passThrough = new PassThrough();
    const chunks = [];
    passThrough.on('data', c => chunks.push(c));
    passThrough.on('end', () => resolve(Buffer.concat(chunks)));
    passThrough.on('error', reject);
    generatorFn(...args, passThrough);
  });
}

/**
 * Run a scan for a single host and save to DB. Returns the CbomRecord.
 */
async function runScanForBot(host, port = 443) {
  // Find or create a system user for bot scans
  let systemUser = await User.findOne({ username: 'telegram-bot' });
  if (!systemUser) {
    systemUser = await User.create({
      username: 'telegram-bot',
      email: 'telegram-bot@quantumshield.local',
      password: crypto.randomBytes(32).toString('hex'),
      role: 'analyst',
    });
  }

  // Create a scan record
  const scan = await Scan.create({
    initiatedBy: systemUser._id,
    targets: [{ host, port }],
    status: 'running',
    progress: { completed: 0, total: 1, failed: 0 },
    startedAt: new Date(),
  });

  // Run the scan
  const result = await scanEndpoint(host, port);

  // Save CBOM record
  const cbomRecord = await CbomRecord.create({
    scanId: scan._id,
    host,
    port,
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
    statistics: result.statistics,
  });

  // Compute integrity hash
  const integrityPayload = JSON.stringify({
    host, port,
    certFingerprint: result.certificate?.fingerprint256 || '',
    certSerial: result.certificate?.serialNumber || '',
    certIssuer: result.certificate?.issuerOrg || '',
    certCN: result.certificate?.commonName || '',
    tlsBestVersion: result.tlsVersions?.bestVersion || '',
    cipherName: result.negotiatedCipher?.standardName || result.negotiatedCipher?.name || '',
    keyAlgorithm: result.certificate?.keyAlgorithm || '',
    keySize: result.certificate?.keySize || 0,
    quantumScore: result.quantumAssessment?.score?.score || 0,
    quantumLabel: result.quantumAssessment?.label || '',
    scanTimestamp: cbomRecord.createdAt.toISOString(),
  });
  const integrityHash = crypto.createHash('sha256').update(integrityPayload).digest('hex');
  await CbomRecord.findByIdAndUpdate(cbomRecord._id, { integrityHash, integrityPayload });

  // Update scan as completed
  await Scan.findByIdAndUpdate(scan._id, {
    status: 'completed',
    results: [cbomRecord._id],
    completedAt: new Date(),
    'progress.completed': 1,
    summary: {
      totalTargets: 1,
      completedScans: 1,
      failedScans: 0,
      averageScore: result.quantumAssessment?.score?.score || 0,
      labelDistribution: { [result.quantumAssessment?.label || 'Unknown']: 1 },
    },
  });

  // Return both scan & record for PDF generation
  return { scan: await Scan.findById(scan._id).lean(), cbomRecord: await CbomRecord.findById(cbomRecord._id).lean() };
}

/**
 * Format scan results as a Telegram message.
 */
function formatResultMessage(record) {
  const qa = record.quantumAssessment || {};
  const score = qa.score?.score ?? 0;
  const label = qa.label || 'Unknown';
  const cert = record.certificate || {};
  const deductions = qa.score?.deductions || [];
  const recs = record.recommendations || [];

  const scoreEmoji = score >= 80 ? '🟢' : score >= 50 ? '🟡' : '🔴';
  const statusIcon = label.includes('Fully Quantum Safe') ? '✅' : '⚠️';

  let msg = `🛡️ *QuantumShield Scan Results*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🌐 *Target:* \`${record.host}:${record.port}\`\n`;
  msg += `${scoreEmoji} *Score:* ${score}/100\n`;
  msg += `${statusIcon} *Status:* ${label}\n`;
  msg += `⏱ *Duration:* ${record.scanDuration || 0}ms\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Certificate
  if (cert.commonName) {
    msg += `📜 *Certificate:*\n`;
    msg += `  • CN: \`${cert.commonName}\`\n`;
    msg += `  • Issuer: ${cert.issuerOrg || cert.issuer || '—'}\n`;
    msg += `  • Key: ${cert.keyAlgorithm || '—'} (${cert.keySize || 0}-bit)\n`;
    msg += `  • Signature: ${cert.signatureAlgorithm || '—'}\n`;
    msg += `  • Valid to: ${cert.validTo ? new Date(cert.validTo).toLocaleDateString() : '—'}\n\n`;
  }

  // Deductions
  if (deductions.length > 0) {
    msg += `📋 *Issues Found:*\n`;
    deductions.forEach(d => {
      msg += `  ${d.includes('+') ? '✅' : '❌'} ${d}\n`;
    });
    msg += `\n`;
  }

  // Top recommendations
  if (recs.length > 0) {
    msg += `💡 *Recommendations:*\n`;
    recs.slice(0, 5).forEach((r, i) => {
      const title = r.component || r.title || `Issue ${i + 1}`;
      const action = r.recommendation || r.action || r.mitigation || '';
      msg += `${i + 1}. \\[${r.severity || 'Medium'}\\] *${title}*\n`;
      if (action) msg += `    → ${action}\n`;
    });
    if (recs.length > 5) msg += `   _...and ${recs.length - 5} more_\n`;
  }

  msg += `\n🔗 _Full report PDF attached below_`;
  return msg;
}

/**
 * Initialize the Telegram Bot.
 */
function initTelegramBot() {
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TOKEN) {
    console.log('[Telegram] ⚠️ TELEGRAM_BOT_TOKEN not set. Bot disabled.');
    return;
  }

  bot = new TelegramBot(TOKEN, { polling: true });
  console.log('[Telegram] ✅ Bot started — listening for commands');

  // ── /start ───────────────────────────────────────────
  bot.onText(/\/start/, (msg) => {
    const welcome = `🛡️ *Welcome to QuantumShield Scanner Bot!*\n\n` +
      `I can scan any domain for post-quantum cryptographic readiness.\n\n` +
      `*Available Commands:*\n` +
      `🔍 \`scan <domain>\` — Run a PQC scan\n` +
      `📧 \`mail to <email> <domain>\` — Scan & email results\n` +
      `ℹ️ \`/help\` — Show this help message\n\n` +
      `*Examples:*\n` +
      `• \`scan google.com\`\n` +
      `• \`scan github.com:443\`\n` +
      `• \`mail to admin@company.com google.com\`\n\n` +
      `_Powered by QuantumShield — PQC Readiness Platform_`;
    bot.sendMessage(msg.chat.id, welcome, { parse_mode: 'Markdown' });
  });

  // ── /help ────────────────────────────────────────────
  bot.onText(/\/help/, (msg) => {
    const help = `🛡️ *QuantumShield Bot — Commands*\n\n` +
      `🔍 \`scan <domain>\` — Scan a domain (e.g. \`scan google.com\`)\n` +
      `🔍 \`scan <domain>:<port>\` — Scan with custom port\n` +
      `📧 \`mail to <email> <domain>\` — Scan & send results via email\n` +
      `ℹ️ \`/help\` — Show this message\n\n` +
      `The bot will:\n` +
      `1. Connect to the target via TLS\n` +
      `2. Analyze certificates, cipher suites, and key exchange\n` +
      `3. Score quantum readiness (0-100)\n` +
      `4. Send you the results + PDF report`;
    bot.sendMessage(msg.chat.id, help, { parse_mode: 'Markdown' });
  });

  // ── scan <domain> ────────────────────────────────────
  bot.onText(/^scan\s+(.+)$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1].trim();

    // Parse host:port
    let host = input.replace(/^https?:\/\//i, '').split('/')[0];
    let port = 443;
    if (host.includes(':')) {
      const parts = host.split(':');
      host = parts[0];
      port = parseInt(parts[1]) || 443;
    }

    if (!host || host.length < 3) {
      return bot.sendMessage(chatId, '❌ Please provide a valid domain. Example: `scan google.com`', { parse_mode: 'Markdown' });
    }

    // Send "scanning" status
    const statusMsg = await bot.sendMessage(chatId,
      `⏳ *Scanning* \`${host}:${port}\`...\n\n_This may take 10-30 seconds._`,
      { parse_mode: 'Markdown' }
    );

    try {
      // Run the scan
      const { scan, cbomRecord } = await runScanForBot(host, port);

      // Delete the "scanning" message
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});

      // Send results text
      const resultText = formatResultMessage(cbomRecord);
      await bot.sendMessage(chatId, resultText, { parse_mode: 'Markdown' });

      // Generate & send PDF
      try {
        const pdfBuffer = await pdfToBuffer(generateCBOMReport, scan, [cbomRecord]);
        await bot.sendDocument(chatId, pdfBuffer, {
          caption: `📄 PQC Report — ${host} (Score: ${cbomRecord.quantumAssessment?.score?.score ?? 0}/100)`,
        }, {
          filename: `pqc_report_${host}.pdf`,
          contentType: 'application/pdf',
        });
      } catch (pdfErr) {
        console.error('[Telegram] PDF generation error:', pdfErr.message);
        bot.sendMessage(chatId, '⚠️ _Scan completed but PDF generation failed._', { parse_mode: 'Markdown' });
      }

    } catch (err) {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
      console.error('[Telegram] Scan error:', err.message);
      bot.sendMessage(chatId, `❌ *Scan failed for* \`${host}\`\n\nError: ${err.message}`, { parse_mode: 'Markdown' });
    }
  });

  // ── mail to <email> <domain> ─────────────────────────
  bot.onText(/^mail\s+to\s+([\w.%+-]+@[\w.-]+\.\w{2,})\s+(.+)$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const recipientEmail = match[1].trim();
    const input = match[2].trim();

    // Parse host:port
    let host = input.replace(/^https?:\/\//i, '').split('/')[0];
    let port = 443;
    if (host.includes(':')) {
      const parts = host.split(':');
      host = parts[0];
      port = parseInt(parts[1]) || 443;
    }

    if (!host || host.length < 3) {
      return bot.sendMessage(chatId, '❌ Invalid domain. Example: `mail to admin@gmail.com google.com`', { parse_mode: 'Markdown' });
    }

    const statusMsg = await bot.sendMessage(chatId,
      `⏳ *Scanning* \`${host}:${port}\` and preparing email for *${recipientEmail}*...\n\n_This may take 30-60 seconds._`,
      { parse_mode: 'Markdown' }
    );

    try {
      // Run the scan
      const { scan, cbomRecord } = await runScanForBot(host, port);
      const record = cbomRecord;
      const score = record.quantumAssessment?.score?.score ?? 0;
      const label = record.quantumAssessment?.label || 'Unknown';

      // Generate PDF buffer
      let pdfBuffer;
      try {
        pdfBuffer = await pdfToBuffer(generateCBOMReport, scan, [record]);
      } catch (pdfErr) {
        console.error('[Telegram] PDF gen failed for email:', pdfErr.message);
      }

      // Build email summary
      const summary = {
        totalAssets: 1,
        pqcReady: label.includes('Fully Quantum Safe') ? 1 : 0,
        vulnerable: label.includes('Fully Quantum Safe') ? 0 : 1,
        avgScore: score,
      };

      // Send email
      await sendReportEmail({
        to: recipientEmail,
        reportName: `PQC Scan Report — ${host}`,
        frequency: 'on-demand',
        format: 'PDF',
        attachment: pdfBuffer || null,
        attachmentName: pdfBuffer ? `pqc_report_${host}.pdf` : undefined,
        summary,
      });

      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});

      // Also send results in Telegram
      const resultText = formatResultMessage(record);
      await bot.sendMessage(chatId, resultText, { parse_mode: 'Markdown' });

      // Send PDF in Telegram too
      if (pdfBuffer) {
        await bot.sendDocument(chatId, pdfBuffer, {
          caption: `📄 PQC Report — ${host} (Score: ${score}/100)`,
        }, {
          filename: `pqc_report_${host}.pdf`,
          contentType: 'application/pdf',
        });
      }

      await bot.sendMessage(chatId,
        `✅ *Email sent successfully!*\n\n📧 To: \`${recipientEmail}\`\n📄 Attachment: pqc\\_report\\_${host.replace(/\./g, '\\.')}.pdf`,
        { parse_mode: 'Markdown' }
      );

    } catch (err) {
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
      console.error('[Telegram] Mail scan error:', err.message);
      bot.sendMessage(chatId, `❌ *Failed*\n\nError: ${err.message}`, { parse_mode: 'Markdown' });
    }
  });

  // ── Catch-all for unrecognized commands ──────────────
  bot.on('message', (msg) => {
    const text = (msg.text || '').trim();
    // Skip if it's a command we already handle
    if (!text || text.startsWith('/start') || text.startsWith('/help') ||
        /^scan\s+/i.test(text) || /^mail\s+to\s+/i.test(text)) return;

    bot.sendMessage(msg.chat.id,
      `🤔 I didn't understand that.\n\nTry:\n• \`scan google.com\`\n• \`mail to user@gmail.com google.com\`\n• \`/help\` for all commands`,
      { parse_mode: 'Markdown' }
    );
  });

  // Handle polling errors
  bot.on('polling_error', (err) => {
    console.error('[Telegram] Polling error:', err.code, err.message);
  });
}

module.exports = { initTelegramBot };
