const nodemailer = require('nodemailer');

/**
 * Email Service for QuantumShield Scanner
 * Uses Gmail SMTP with App Password authentication
 *
 * Setup: Add these to your server/.env file:
 *   EMAIL_USER=your-email@gmail.com
 *   EMAIL_PASS=your-16-char-app-password
 */

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn('[Email] EMAIL_USER or EMAIL_PASS not configured in .env');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  // Verify connection on first use
  transporter.verify()
    .then(() => console.log('[Email] ✅ SMTP connection verified'))
    .catch(err => console.error('[Email] ❌ SMTP verification failed:', err.message));

  return transporter;
}

/**
 * Send a report email with attachment
 * @param {Object} options
 * @param {string|string[]} options.to - recipient email(s)
 * @param {string} options.reportName - name of the report
 * @param {string} options.frequency - schedule frequency (daily/weekly/monthly)
 * @param {Buffer} [options.attachment] - PDF/CSV buffer
 * @param {string} [options.attachmentName] - filename for attachment
 * @param {string} [options.format] - PDF, CSV, or JSON
 * @param {Object} [options.summary] - scan summary data
 */
async function sendReportEmail({ to, reportName, frequency, attachment, attachmentName, format = 'PDF', summary = {} }) {
  const mailer = getTransporter();
  if (!mailer) {
    throw new Error('Email not configured. Add EMAIL_USER and EMAIL_PASS to .env');
  }

  const recipients = Array.isArray(to) ? to.join(', ') : to;
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 32px 28px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">
          🛡️ QuantumShield Scanner
        </h1>
        <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">
          Post-Quantum Cryptography Readiness Platform
        </p>
      </div>

      <!-- Body -->
      <div style="padding: 28px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="margin: 0 0 6px; color: #111827; font-size: 18px; font-weight: 600;">
          📄 ${reportName}
        </h2>
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 20px;">
          ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} report generated on ${now}
        </p>

        <!-- Summary Stats -->
        ${summary.totalAssets ? `
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 12px; font-size: 14px; color: #374151; font-weight: 600;">📊 Scan Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Total Assets Scanned</td>
              <td style="padding: 6px 0; color: #111827; font-weight: 600; text-align: right;">${summary.totalAssets}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">PQC Ready</td>
              <td style="padding: 6px 0; color: #059669; font-weight: 600; text-align: right;">${summary.pqcReady || 0}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Vulnerable</td>
              <td style="padding: 6px 0; color: #dc2626; font-weight: 600; text-align: right;">${summary.vulnerable || 0}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Average PQC Score</td>
              <td style="padding: 6px 0; color: #2563eb; font-weight: 600; text-align: right;">${summary.avgScore || 0}/100</td>
            </tr>
          </table>
        </div>
        ` : ''}

        <!-- Attachment Notice -->
        ${attachment ? `
        <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 13px; color: #374151;">
            📎 <strong>${attachmentName || `report.${format.toLowerCase()}`}</strong> is attached to this email.
          </p>
        </div>
        ` : ''}

        <!-- CTA -->
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/reports"
             style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #2563eb, #4f46e5);
                    color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            View Full Report →
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

        <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">
          This is an automated report from QuantumShield Scanner.<br/>
          You are receiving this because your email was added to a scheduled report.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f9fafb; padding: 16px 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
          © ${new Date().getFullYear()} QuantumShield Scanner — PQC Readiness Assessment Platform
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"QuantumShield Scanner" <${process.env.EMAIL_USER}>`,
    to: recipients,
    subject: `📄 ${reportName} — ${now}`,
    html: htmlBody,
  };

  // Attach file if provided
  if (attachment) {
    const mimeTypes = {
      PDF: 'application/pdf',
      CSV: 'text/csv',
      JSON: 'application/json',
    };
    mailOptions.attachments = [{
      filename: attachmentName || `report.${format.toLowerCase()}`,
      content: attachment,
      contentType: mimeTypes[format] || 'application/octet-stream',
    }];
  }

  const info = await mailer.sendMail(mailOptions);
  console.log(`[Email] ✅ Report sent to ${recipients} — MessageId: ${info.messageId}`);
  return info;
}

/**
 * Send a quick test email to verify configuration
 */
async function sendTestEmail(to) {
  const mailer = getTransporter();
  if (!mailer) throw new Error('Email not configured');

  const info = await mailer.sendMail({
    from: `"QuantumShield Scanner" <${process.env.EMAIL_USER}>`,
    to,
    subject: '✅ QuantumShield Email Configuration Test',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111827;">✅ Email Configuration Successful!</h2>
        <p style="color: #6b7280;">Your QuantumShield Scanner email delivery is working correctly.</p>
        <p style="color: #6b7280; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `,
  });

  return info;
}

module.exports = { sendReportEmail, sendTestEmail, getTransporter };
