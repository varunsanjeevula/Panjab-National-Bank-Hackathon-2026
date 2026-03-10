import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCbomRecord } from '../services/api';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Lock, Key, FileText, ArrowLeft, Globe, Fingerprint, AlertTriangle, CheckCircle2, ExternalLink, Copy, Check, Terminal, Hash } from 'lucide-react';

function QuantumBadge({ label }) {
  if (!label) return <span className="badge">Unknown</span>;
  if (label.includes('Fully Quantum Safe')) return <span className="badge badge-safe"><ShieldCheck size={13} /> {label}</span>;
  if (label.includes('Hybrid')) return <span className="badge badge-hybrid"><ShieldAlert size={13} /> {label}</span>;
  if (label.includes('Critical')) return <span className="badge badge-critical"><ShieldX size={13} /> {label}</span>;
  return <span className="badge badge-vulnerable"><ShieldX size={13} /> {label}</span>;
}

function getScoreColor(score) {
  if (score >= 80) return '#059669';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: 11 }}>
      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    getCbomRecord(id).then(res => { setRecord(res.data); setLoading(false); }).catch(err => { console.error(err); setLoading(false); });
  }, [id]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /><p>Loading asset details...</p></div>;
  if (!record) return <div className="empty-state"><ShieldX size={44} /><p>Asset not found</p></div>;

  const score = record.quantumAssessment?.score?.score ?? 0;
  const label = record.quantumAssessment?.label || 'Unknown';
  const cert = record.certificate || {};
  const recs = record.recommendations || [];
  const tls = record.tlsVersions || {};
  const nego = record.negotiatedCipher || {};

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
          <ArrowLeft size={15} /> Back to Results
        </button>
        <h1 className="page-title">{record.host}:{record.port}</h1>
        <p className="page-subtitle">Quantum cryptographic assessment details</p>
      </div>

      {/* Score Card */}
      <motion.div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 28 }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="score-circle" style={{ borderColor: getScoreColor(score), color: getScoreColor(score), width: 80, height: 80, fontSize: 26 }}>
          {score}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 6 }}><QuantumBadge label={label} /></div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {record.quantumAssessment?.score?.deductions && record.quantumAssessment.score.deductions.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: d.includes('+') ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {d.includes('+') ? '✓' : '✗'}
                </span>
                {d}
              </div>
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowVerification(!showVerification)}>
          <Shield size={14} /> {showVerification ? 'Hide' : 'Verify'} Proof
        </button>
      </motion.div>

      {/* ═══ INTEGRITY VERIFICATION PANEL ═══ */}
      {showVerification && (
        <motion.div className="card" style={{ marginBottom: 20, border: '2px solid var(--color-success-border)', background: 'var(--color-success-bg)' }}
          initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} transition={{ duration: 0.3 }}>
          <div className="detail-section-title" style={{ color: 'var(--color-success)', borderColor: 'var(--color-success-border)' }}>
            <Shield size={20} /> Data Integrity & Verification Proof
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.7 }}>
            This section proves our scanner retrieved <strong>real data from the live server</strong> — not mock data. Every field below can be independently verified using <code>openssl</code> or your browser.
          </p>

          {/* Certificate Fingerprint */}
          {cert.fingerprint256 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="detail-item-label" style={{ margin: 0 }}>SHA-256 CERTIFICATE FINGERPRINT</div>
                <CopyButton text={cert.fingerprint256} />
              </div>
              <div style={{ padding: '10px 14px', background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success-border)', fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-all', color: 'var(--text-primary)', fontWeight: 500 }}>
                {cert.fingerprint256}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                ✓ This fingerprint matches what your browser shows in the certificate viewer (click 🔒 → Certificate → SHA-256 Fingerprint)
              </p>
            </div>
          )}

          {/* Serial Number */}
          {cert.serialNumber && cert.serialNumber !== 'Unknown' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="detail-item-label" style={{ margin: 0 }}>CERTIFICATE SERIAL NUMBER</div>
                <CopyButton text={cert.serialNumber} />
              </div>
              <div style={{ padding: '10px 14px', background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success-border)', fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all', color: 'var(--text-primary)' }}>
                {cert.serialNumber}
              </div>
            </div>
          )}

          {/* Integrity Hash */}
          {record.integrityHash && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="detail-item-label" style={{ margin: 0 }}>SCAN INTEGRITY HASH (SHA-256)</div>
                <CopyButton text={record.integrityHash} />
              </div>
              <div style={{ padding: '10px 14px', background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success-border)', fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-all', color: 'var(--text-primary)', fontWeight: 500 }}>
                {record.integrityHash}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                ✓ Tamper-evident hash of scan results. Recomputing SHA-256 of the integrity payload will produce this exact hash.
              </p>
            </div>
          )}

          {/* Cross-verification Commands */}
          <div style={{ marginBottom: 20 }}>
            <div className="detail-item-label" style={{ marginBottom: 8 }}>CROSS-VERIFY WITH OPENSSL</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>
              Run these commands in your terminal to independently confirm our results match:
            </p>
            {[
              { label: '1. Check certificate fingerprint & subject', cmd: `openssl s_client -connect ${record.host}:${record.port} -servername ${record.host} 2>/dev/null | openssl x509 -fingerprint -sha256 -noout -subject -issuer` },
              { label: '2. Check TLS version & cipher', cmd: `openssl s_client -connect ${record.host}:${record.port} -servername ${record.host} 2>/dev/null | head -20` },
              { label: '3. List all supported ciphers', cmd: `nmap --script ssl-enum-ciphers -p ${record.port} ${record.host}` },
            ].map((item, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{item.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, padding: '8px 12px', background: '#1e293b', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#e2e8f0', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#94a3b8' }}>$ </span>{item.cmd}
                  </div>
                  <CopyButton text={item.cmd} />
                </div>
              </div>
            ))}
          </div>

          {/* Third-party Verification Links */}
          <div>
            <div className="detail-item-label" style={{ marginBottom: 8 }}>THIRD-PARTY VERIFICATION</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
              Use these independent tools to confirm our TLS/certificate findings:
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { name: 'SSL Labs', url: `https://www.ssllabs.com/ssltest/analyze.html?d=${record.host}` },
                { name: 'SSL Shopper', url: `https://www.sslshopper.com/ssl-checker.html#hostname=${record.host}` },
                { name: 'crt.sh (CT Logs)', url: `https://crt.sh/?q=${record.host}` },
                { name: 'SecurityHeaders', url: `https://securityheaders.com/?q=${record.host}` },
              ].map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  <ExternalLink size={12} /> {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* Scan Metadata */}
          <div style={{ marginTop: 20, padding: '12px 16px', background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success-border)' }}>
            <div className="detail-item-label" style={{ marginBottom: 8 }}>SCAN METADATA</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Scanned at:</span> <strong>{new Date(record.createdAt).toLocaleString()}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Scan Duration:</span> <strong>{record.scanDuration}ms</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Record ID:</span> <strong style={{ fontFamily: 'var(--font-mono)' }}>{record._id}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Scan ID:</span> <strong style={{ fontFamily: 'var(--font-mono)' }}>{record.scanId}</strong></div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Certificate Details */}
        <motion.div className="detail-section" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card">
            <div className="detail-section-title"><FileText size={18} style={{ color: 'var(--brand-primary)' }} /> Certificate</div>
            <div className="detail-grid">
              {[
                { label: 'Common Name', value: cert.commonName || '—' },
                { label: 'Issuer', value: cert.issuerOrg || cert.issuer || '—' },
                { label: 'Key Algorithm', value: `${cert.keyAlgorithm || '—'} (${cert.keySize || 0}-bit)` },
                { label: 'Signature', value: cert.signatureAlgorithm || '—' },
                { label: 'Valid From', value: cert.validFrom ? new Date(cert.validFrom).toLocaleDateString() : '—' },
                { label: 'Valid To', value: cert.validTo ? new Date(cert.validTo).toLocaleDateString() : '—' },
                { label: 'Days Until Expiry', value: cert.daysUntilExpiry ?? '—' },
                { label: 'Self-Signed', value: cert.selfSigned ? 'Yes' : 'No' },
              ].map((item, i) => (
                <div className="detail-item" key={i}>
                  <div className="detail-item-label">{item.label}</div>
                  <div className="detail-item-value">{String(item.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* TLS Details */}
        <motion.div className="detail-section" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="card">
            <div className="detail-section-title"><Lock size={18} style={{ color: 'var(--brand-primary)' }} /> TLS Configuration</div>
            <div style={{ marginBottom: 16 }}>
              <div className="detail-item-label" style={{ marginBottom: 8 }}>SUPPORTED VERSIONS</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(tls.supported || []).length > 0 ? tls.supported.map((v, i) => {
                  const version = typeof v === 'string' ? v : v.version;
                  const isDeprecated = version?.includes('1.0') || version?.includes('1.1');
                  return (
                    <span key={i} className={`badge ${isDeprecated ? 'badge-vulnerable' : 'badge-safe'}`}>
                      {version} ✓
                    </span>
                  );
                }) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No version data</span>}
              </div>
            </div>
            {tls.bestVersion && (
              <div style={{ marginBottom: 16 }}>
                <div className="detail-item-label" style={{ marginBottom: 8 }}>BEST VERSION</div>
                <div className="detail-item">
                  <div className="detail-item-value">{tls.bestVersion}</div>
                </div>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <div className="detail-item-label" style={{ marginBottom: 8 }}>NEGOTIATED CIPHER</div>
              <div className="detail-item">
                <div className="detail-item-value" style={{ fontSize: 13, wordBreak: 'break-all' }}>
                  {nego.standardName || nego.name || '—'}
                </div>
              </div>
            </div>
            {record.ephemeralKeyInfo && (
              <div>
                <div className="detail-item-label" style={{ marginBottom: 8 }}>KEY EXCHANGE</div>
                <div className="detail-item">
                  <div className="detail-item-value" style={{ fontSize: 13 }}>
                    {record.ephemeralKeyInfo.name || record.ephemeralKeyInfo.type || 'Unknown'} ({record.ephemeralKeyInfo.size || 0}-bit)
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Cipher Suites */}
      {record.cipherSuites && record.cipherSuites.length > 0 && (
        <motion.div className="card" style={{ marginBottom: 20 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="detail-section-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <Fingerprint size={18} style={{ color: 'var(--brand-primary)' }} /> Supported Cipher Suites ({record.cipherSuites.length})
          </div>
          <div className="table-container" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>Cipher Suite</th><th>Key Exchange</th><th>Encryption</th><th>Quantum Status</th></tr></thead>
              <tbody>
                {record.cipherSuites.map((cs, i) => {
                  const status = cs.classification?.overallStatus;
                  const badgeClass = status === 'Quantum-Safe' ? 'badge-safe' :
                    status === 'Classically Broken' ? 'badge-critical' :
                      status === 'Quantum-Weakened' ? 'badge-weakened' : 'badge-vulnerable';
                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500 }}>{cs.ianaName || cs.opensslName || cs.name}</td>
                      <td>{cs.keyExchange || '—'}</td>
                      <td>{cs.bulkCipher || cs.encryption || '—'}</td>
                      <td><span className={`badge ${badgeClass}`}>{status || 'Unknown'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <motion.div className="card" style={{ marginBottom: 20 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="detail-section-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} /> Recommendations ({recs.length})
          </div>
          <div style={{ marginTop: 12 }}>
            {recs.map((rec, i) => {
              const title = rec.component || rec.title || `Recommendation ${i + 1}`;
              const desc = rec.vulnerability || rec.description || '';
              const action = rec.recommendation || rec.action || rec.mitigation || '';
              const severity = rec.severity || 'Medium';
              return (
                <motion.div key={i} className={`rec-card severity-${severity}`}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.04 }}>
                  <div className="rec-card-header">
                    <div className="rec-card-title">{title}</div>
                    <span className={`badge ${severity === 'Critical' || severity === 'High' ? 'badge-critical' : severity === 'Medium' ? 'badge-hybrid' : 'badge-safe'}`}>{severity}</span>
                  </div>
                  {desc && <div className="rec-card-body">{desc}</div>}
                  {action && <div className="rec-card-action"><strong>Remediation: </strong>{action}</div>}
                  {rec.nistReference && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>📚 Reference: {rec.nistReference}</div>}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Executive Summary */}
      {record.executiveSummary && (
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="detail-section-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <FileText size={18} style={{ color: 'var(--brand-primary)' }} /> Executive Summary
          </div>
          <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            {typeof record.executiveSummary === 'string' ? record.executiveSummary : record.executiveSummary.summary || JSON.stringify(record.executiveSummary)}
          </div>
        </motion.div>
      )}
    </div>
  );
}
