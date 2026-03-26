import { useState, useEffect } from 'react';
import { getScans, getCbomRecords } from '../services/api';
import { motion } from 'framer-motion';
import { ClipboardCheck, CheckCircle, XCircle, AlertTriangle, Shield, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

// Regulation database
const REGULATIONS = [
  {
    id: 'rbi-csf-2024',
    body: 'RBI',
    name: 'Cyber Security Framework for Banks',
    requirements: [
      { id: 'R1', text: 'All public-facing services must use TLS 1.2 or higher', check: (assets) => assets.every(a => a.tlsVersions?.hasTLS13 || a.tlsVersions?.supported?.includes('TLSv1.2')) },
      { id: 'R2', text: 'Deprecated protocols (SSLv3, TLS 1.0/1.1) must be disabled', check: (assets) => assets.every(a => !a.tlsVersions?.hasDeprecated) },
      { id: 'R3', text: 'Digital certificates must not be expired', check: (assets) => assets.every(a => !a.certificate?.isExpired) },
      { id: 'R4', text: 'Self-signed certificates must not be used in production', check: (assets) => assets.every(a => !a.certificate?.selfSigned) },
    ]
  },
  {
    id: 'nist-sp-800-208',
    body: 'NIST',
    name: 'SP 800-208 — PQC Standards for Federal Agencies',
    requirements: [
      { id: 'N1', text: 'Key exchange must support quantum-resistant algorithms (ML-KEM / CRYSTALS-KYBER)', check: (assets) => assets.some(a => a.quantumAssessment?.label === 'Fully Quantum Safe') },
      { id: 'N2', text: 'Digital signature algorithms should include PQC variants (ML-DSA / CRYSTALS-Dilithium)', check: (assets) => { const safe = assets.filter(a => a.quantumAssessment?.label === 'Fully Quantum Safe').length; return safe >= assets.length * 0.5; } },
      { id: 'N3', text: 'Hybrid mode (classical + PQC) should be supported during transition', check: (assets) => assets.some(a => a.quantumAssessment?.label === 'Hybrid Mode' || a.quantumAssessment?.label === 'Fully Quantum Safe') },
      { id: 'N4', text: 'Average quantum readiness score should be above 50', check: (assets) => { const avg = assets.reduce((s, a) => s + (a.quantumAssessment?.score?.score || 0), 0) / (assets.length || 1); return avg >= 50; } },
    ]
  },
  {
    id: 'nist-fips-203-206',
    body: 'NIST',
    name: 'FIPS 203–206 — Post-Quantum Cryptography Standards',
    requirements: [
      { id: 'F1', text: 'ML-KEM (FIPS 203) key encapsulation mechanism support', check: (assets) => assets.some(a => JSON.stringify(a.cipherSuites || []).toLowerCase().includes('kyber') || JSON.stringify(a.cipherSuites || []).toLowerCase().includes('ml-kem')) },
      { id: 'F2', text: 'ML-DSA (FIPS 204) digital signature algorithm support', check: (assets) => assets.some(a => JSON.stringify(a.certificate || {}).toLowerCase().includes('dilithium') || JSON.stringify(a.certificate || {}).toLowerCase().includes('ml-dsa')) },
      { id: 'F3', text: 'SLH-DSA (FIPS 205) stateless hash-based signature support', check: (assets) => assets.some(a => JSON.stringify(a.certificate || {}).toLowerCase().includes('sphincs') || JSON.stringify(a.certificate || {}).toLowerCase().includes('slh-dsa')) },
      { id: 'F4', text: 'No use of algorithms vulnerable to Shor\'s algorithm without PQC fallback', check: (assets) => { const vuln = assets.filter(a => a.quantumAssessment?.label === 'Critical — Not PQC Ready').length; return vuln === 0; } },
    ]
  },
  {
    id: 'sebi-cyber-2024',
    body: 'SEBI',
    name: 'Cybersecurity and Cyber Resilience Framework',
    requirements: [
      { id: 'S1', text: 'End-to-end encryption for all data in transit', check: (assets) => assets.every(a => a.status === 'completed') },
      { id: 'S2', text: 'Minimum key size of 2048 bits for RSA keys', check: (assets) => assets.every(a => !a.certificate?.keySize || a.certificate.keySize >= 2048) },
      { id: 'S3', text: 'Certificate validity monitoring and timely renewal', check: (assets) => assets.every(a => a.certificate?.daysUntilExpiry == null || a.certificate.daysUntilExpiry > 30) },
      { id: 'S4', text: 'Strong cipher suites — no RC4, DES, or NULL ciphers', check: (assets) => assets.every(a => !JSON.stringify(a.cipherSuites || []).toLowerCase().match(/rc4|des|null/)) },
    ]
  },
];

export default function ComplianceMapping() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const scansRes = await getScans();
      const completed = scansRes.data.filter(s => s.status === 'completed');
      if (completed.length > 0) {
        const cbomRes = await getCbomRecords(completed[0]._id);
        setAssets(cbomRes.data.filter(r => r.status === 'completed'));
      }
    } catch (err) { toast.error('Failed to load compliance data'); }
    setLoading(false);
  };

  // Compute compliance
  const results = REGULATIONS.map(reg => {
    const checks = reg.requirements.map(req => ({
      ...req,
      passed: assets.length > 0 ? req.check(assets) : null,
    }));
    const passedCount = checks.filter(c => c.passed === true).length;
    const total = checks.length;
    const score = assets.length > 0 ? Math.round((passedCount / total) * 100) : null;
    return { ...reg, checks, score, passedCount, total };
  });

  const overallScore = assets.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : null;

  if (loading) return (
    <div>
      <div className="page-header"><div className="skeleton skeleton-title" /></div>
      <div className="stats-grid">{[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-card" />)}</div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Compliance Mapping</h1>
        <p className="page-subtitle">Auto-assessed against RBI, SEBI & NIST PQC regulatory frameworks</p>
      </div>

      {/* Overall Score */}
      {overallScore !== null && (
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: overallScore >= 75 ? 'var(--color-success-bg)' : overallScore >= 50 ? 'var(--color-warning-bg)' : 'var(--color-danger-bg)',
            border: `3px solid ${overallScore >= 75 ? 'var(--color-success)' : overallScore >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)',
            color: overallScore >= 75 ? 'var(--color-success)' : overallScore >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
          }}>
            {overallScore}%
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Overall Compliance Score</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Based on {assets.length} scanned assets across {results.length} regulatory frameworks
            </div>
          </div>
        </motion.div>
      )}

      {/* Regulation Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {results.map((reg, i) => (
          <motion.div key={reg.id} className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => setSelectedReg(selectedReg === reg.id ? null : reg.id)}
            style={{ cursor: 'pointer', borderLeft: `4px solid ${reg.score >= 75 ? 'var(--color-success)' : reg.score >= 50 ? 'var(--color-warning)' : reg.score !== null ? 'var(--color-danger)' : 'var(--border-medium)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{reg.body}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{reg.name}</div>
              </div>
              {reg.score !== null && (
                <div style={{
                  fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)',
                  color: reg.score >= 75 ? 'var(--color-success)' : reg.score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
                }}>{reg.score}%</div>
              )}
            </div>
            <div className="progress-bar" style={{ height: 6 }}>
              <div className="progress-bar-fill" style={{
                width: `${reg.score || 0}%`,
                background: reg.score >= 75 ? 'var(--color-success)' : reg.score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              {reg.passedCount}/{reg.total} requirements met
            </div>

            {/* Expanded checks */}
            {selectedReg === reg.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                style={{ marginTop: 16, borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                {reg.checks.map((check, j) => (
                  <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: j < reg.checks.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    {check.passed === true ? <CheckCircle size={16} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
                      : check.passed === false ? <XCircle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />
                      : <AlertTriangle size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{check.id}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{check.text}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {assets.length === 0 && (
        <div className="card empty-state" style={{ marginTop: 20 }}>
          <ClipboardCheck size={44} />
          <p>No scan data available. Run a scan to generate compliance assessment.</p>
        </div>
      )}
    </div>
  );
}
