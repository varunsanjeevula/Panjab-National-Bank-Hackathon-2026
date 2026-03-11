const PDFDocument = require('pdfkit');

/**
 * Generate a professional CBOM PDF report for a scan.
 */
function generateCBOMReport(scan, cbomRecords, stream) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(stream);

  // ── Header ─────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 100).fill('#1e40af');
  doc.fontSize(24).fillColor('#ffffff').text('QuantumShield Scanner', 50, 30);
  doc.fontSize(11).fillColor('#93c5fd').text('Post-Quantum Cryptography Readiness Assessment Report', 50, 58);
  doc.fontSize(9).fillColor('#bfdbfe').text(`Report Generated: ${new Date().toISOString()} | Scan ID: ${scan._id}`, 50, 76);

  doc.moveDown(4);
  doc.fillColor('#1e293b');

  // ── Executive Summary ──────────────────────────────────
  doc.fontSize(16).fillColor('#1e40af').text('Executive Summary', { underline: true });
  doc.moveDown(0.5);

  const totalTargets = cbomRecords.length;
  const pqcReady = cbomRecords.filter(r => {
    const label = r.quantumAssessment?.label || '';
    return label.includes('Fully Quantum Safe');
  }).length;
  const hybrid = cbomRecords.filter(r => (r.quantumAssessment?.label || '').includes('Hybrid')).length;
  const notReady = totalTargets - pqcReady - hybrid;

  doc.fontSize(10).fillColor('#334155');
  doc.text(`Total Endpoints Scanned: ${totalTargets}`);
  doc.text(`PQC Ready: ${pqcReady} | Hybrid: ${hybrid} | Not PQC Ready: ${notReady}`);
  doc.text(`Scan Initiated By: ${scan.initiatedBy || 'System'}`);
  doc.text(`Scan Started: ${scan.startedAt ? new Date(scan.startedAt).toLocaleString() : 'N/A'}`);
  doc.text(`Scan Completed: ${scan.completedAt ? new Date(scan.completedAt).toLocaleString() : 'N/A'}`);
  doc.moveDown(1);

  // ── Per-Asset CBOM ─────────────────────────────────────
  cbomRecords.forEach((record, idx) => {
    if (idx > 0) doc.addPage();

    const cert = record.certificate || {};
    const qa = record.quantumAssessment || {};
    const score = qa.score?.score ?? 0;
    const label = qa.label || 'Unknown';

    // Asset Header
    doc.rect(50, doc.y, doc.page.width - 100, 30).fill(score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626');
    const headerY = doc.y + 8;
    doc.fontSize(12).fillColor('#ffffff').text(`${record.host}:${record.port}`, 60, headerY);
    doc.fontSize(10).text(`Score: ${score}/100 — ${label}`, 350, headerY, { align: 'right', width: doc.page.width - 420 });
    doc.y = headerY + 30;
    doc.moveDown(0.5);
    doc.fillColor('#334155');

    // Certificate Info
    doc.fontSize(12).fillColor('#1e40af').text('Certificate Details', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#334155');
    const certFields = [
      ['Common Name', cert.commonName || '—'],
      ['Issuer', cert.issuerOrg || cert.issuer || '—'],
      ['Key Algorithm', `${cert.keyAlgorithm || '—'} (${cert.keySize || 0}-bit)`],
      ['Signature Algorithm', cert.signatureAlgorithm || '—'],
      ['Valid From', cert.validFrom ? new Date(cert.validFrom).toLocaleDateString() : '—'],
      ['Valid To', cert.validTo ? new Date(cert.validTo).toLocaleDateString() : '—'],
      ['Serial Number', cert.serialNumber || '—'],
      ['SHA-256 Fingerprint', cert.fingerprint256 || '—'],
    ];
    certFields.forEach(([key, val]) => {
      doc.font('Helvetica-Bold').text(`${key}: `, { continued: true });
      doc.font('Helvetica').text(String(val));
    });
    doc.moveDown(0.5);

    // TLS Configuration
    doc.fontSize(12).fillColor('#1e40af').text('TLS Configuration', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#334155');
    const tls = record.tlsVersions || {};
    doc.font('Helvetica-Bold').text('Supported Versions: ', { continued: true });
    doc.font('Helvetica').text((tls.supported || []).join(', ') || 'None detected');
    doc.font('Helvetica-Bold').text('Best Version: ', { continued: true });
    doc.font('Helvetica').text(tls.bestVersion || '—');
    const nego = record.negotiatedCipher || {};
    doc.font('Helvetica-Bold').text('Negotiated Cipher: ', { continued: true });
    doc.font('Helvetica').text(nego.standardName || nego.name || '—');
    doc.moveDown(0.5);

    // Cipher Suites
    if (record.cipherSuites && record.cipherSuites.length > 0) {
      doc.fontSize(12).fillColor('#1e40af').text('Supported Cipher Suites', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(8).fillColor('#334155');
      record.cipherSuites.forEach((cs) => {
        const status = cs.classification?.overallStatus || 'Unknown';
        const icon = status === 'Quantum-Safe' ? '[SAFE]' : status === 'Quantum-Weakened' ? '[WEAK]' : '[VULN]';
        doc.text(`${icon}  ${cs.ianaName || cs.opensslName || cs.name}  [${status}]`);
      });
      doc.moveDown(0.5);
    }

    // Recommendations
    const recs = record.recommendations || [];
    if (recs.length > 0) {
      doc.fontSize(12).fillColor('#1e40af').text('Recommendations', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor('#334155');
      recs.forEach((rec, i) => {
        const title = rec.component || rec.title || `#${i + 1}`;
        const severity = rec.severity || 'Medium';
        const action = rec.recommendation || rec.action || '';
        doc.font('Helvetica-Bold').text(`[${severity}] ${title}`);
        if (action) doc.font('Helvetica').text(`  > ${action}`);
      });
      doc.moveDown(0.5);
    }

    // Integrity Hash
    if (record.integrityHash) {
      doc.fontSize(9).fillColor('#64748b');
      doc.text(`Integrity Hash (SHA-256): ${record.integrityHash}`);
    }
  });

  // ── Footer ─────────────────────────────────────────────
  doc.addPage();
  doc.fontSize(14).fillColor('#1e40af').text('Disclaimer', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#64748b');
  doc.text('This report was generated by QuantumShield Scanner, a non-intrusive read-only cryptographic assessment tool. The scanner connects to publicly accessible endpoints using standard TLS handshakes and does not modify, exploit, or disrupt any target systems. All quantum-safety assessments are based on NIST FIPS 203, 204, 205, and 206 standards. This report is intended for authorized personnel only.');
  doc.moveDown(1);
  doc.fontSize(10).fillColor('#1e40af').text('© 2026 QuantumShield Scanner — Post-Quantum Cryptography Assessment', { align: 'center' });

  doc.end();
  return doc;
}

/**
 * Generate a PQC digital label/certificate for an asset.
 */
function generatePQCLabel(record, stream) {
  const doc = new PDFDocument({ margin: 40, size: [500, 350] });
  doc.pipe(stream);

  const qa = record.quantumAssessment || {};
  const score = qa.score?.score ?? 0;
  const label = qa.label || 'Unknown';
  const isPQCReady = label.includes('Fully Quantum Safe') || label.includes('PQC Ready');

  // Background
  const bgColor = isPQCReady ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  doc.rect(0, 0, 500, 350).fill(bgColor);

  // Inner white card
  doc.roundedRect(15, 15, 470, 320, 10).fill('#ffffff');

  // Title
  doc.fontSize(18).fillColor(bgColor).text('QuantumShield Scanner', 30, 30, { align: 'center', width: 440 });
  doc.fontSize(10).fillColor('#64748b').text('Post-Quantum Cryptography Assessment Certificate', 30, 55, { align: 'center', width: 440 });

  // Horizontal line
  doc.moveTo(40, 75).lineTo(460, 75).stroke(bgColor);

  // Label
  doc.fontSize(22).fillColor(bgColor).text(isPQCReady ? 'PQC READY' : 'NOT PQC READY', 30, 90, { align: 'center', width: 440 });

  // Details
  doc.fontSize(11).fillColor('#334155');
  doc.text(`Endpoint: ${record.host}:${record.port}`, 40, 130);
  doc.text(`Score: ${score}/100`);
  doc.text(`Classification: ${label}`);
  doc.text(`Certificate CN: ${record.certificate?.commonName || '—'}`);
  doc.text(`Key Algorithm: ${record.certificate?.keyAlgorithm || '—'} (${record.certificate?.keySize || 0}-bit)`);
  doc.text(`TLS Version: ${record.tlsVersions?.bestVersion || '—'}`);
  doc.text(`Assessed: ${new Date(record.createdAt).toLocaleString()}`);

  // Integrity
  if (record.integrityHash) {
    doc.moveDown(0.5);
    doc.fontSize(7).fillColor('#94a3b8');
    doc.text(`Integrity Hash: ${record.integrityHash}`, 40);
  }

  // Footer
  doc.fontSize(8).fillColor('#94a3b8');
  doc.text('This certificate is digitally generated by QuantumShield Scanner.', 40, 310, { align: 'center', width: 420 });
  doc.text('Assessment based on NIST FIPS 203, 204, 205, 206 standards.', 40, 322, { align: 'center', width: 420 });

  doc.end();
  return doc;
}

module.exports = { generateCBOMReport, generatePQCLabel };
