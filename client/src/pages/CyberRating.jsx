import { useState, useEffect } from 'react';
import { getScans, getCbomStats } from '../services/api';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Award, ShieldCheck, ShieldAlert, ShieldX, Globe, TrendingUp, Search, Activity, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const TIERS = {
  ELITE: { label: 'Elite-PQC', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', description: 'Indicates a stronger security posture' },
  STANDARD: { label: 'Standard', color: '#d97706', bg: '#fffbeb', border: '#fde68a', description: 'Moderate cryptographic readiness' },
  LEGACY: { label: 'Legacy', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', description: 'Significant cryptographic vulnerabilities' },
};

const TIER_RULES = [
  {
    tier: 'Tier-1',
    name: 'Elite-PQC',
    score: '> 700',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    icon: <ShieldCheck size={18} />,
    securityLevel: 'Modern best-practice crypto posture',
    criteria: [
      'TLS 1.3 with PQC-ready cipher suites',
      'RSA \u2265 4096-bit or ECC \u2265 P-384 keys',
      'Valid certificates from trusted CAs',
      'No deprecated protocols (SSLv3, TLS 1.0/1.1)',
      'HSTS enabled with long max-age',
    ],
    action: 'Maintain & Monitor',
    actionDesc: 'Continue periodic scans to ensure posture remains elite. Prepare for full PQC migration.',
  },
  {
    tier: 'Tier-2',
    name: 'Standard',
    score: '400 \u2013 700',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: <ShieldAlert size={18} />,
    securityLevel: 'Acceptable enterprise configuration',
    criteria: [
      'TLS 1.2 or 1.3 negotiated',
      'RSA 2048-bit or ECC P-256 keys',
      'Certificates valid but may expire within 90 days',
      'Some older cipher suites still accepted',
      'No critical vulnerabilities detected',
    ],
    action: 'Plan Upgrade',
    actionDesc: 'Schedule migration to stronger algorithms. Prioritize endpoints with expiring certificates.',
  },
  {
    tier: 'Tier-3',
    name: 'Legacy',
    score: '100 \u2013 399',
    color: '#f97316',
    bg: '#fff7ed',
    border: '#fed7aa',
    icon: <ShieldX size={18} />,
    securityLevel: 'Weak but still operational',
    criteria: [
      'TLS 1.0 or 1.1 still in use',
      'RSA < 2048-bit keys detected',
      'Self-signed or expired certificates',
      'Weak cipher suites (RC4, DES, 3DES)',
      'Missing HSTS or security headers',
    ],
    action: 'Urgent Remediation',
    actionDesc: 'Immediate action required. Upgrade protocols, replace weak keys, and renew expired certificates.',
  },
  {
    tier: 'Critical',
    name: 'Critical',
    score: '< 100',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: <ShieldX size={18} />,
    securityLevel: 'Insecure / Exploitable',
    criteria: [
      'SSLv3 or no encryption detected',
      'Null ciphers or export-grade cryptography',
      'Known vulnerable implementations',
      'Certificates revoked or completely invalid',
      'Actively exploitable weaknesses present',
    ],
    action: 'Immediate Action Required',
    actionDesc: 'Critical risk. Take endpoints offline or isolate until cryptographic posture is fully remediated.',
  },
];

const LABEL_BADGE_MAP = {
  'Fully Quantum Safe': 'badge-safe',
  'Hybrid Mode': 'badge-hybrid',
  'Not PQC Ready': 'badge-vulnerable',
  'Critical — Not PQC Ready': 'badge-critical',
};

function getTier(score1000) {
  if (score1000 > 700) return TIERS.ELITE;
  if (score1000 >= 400) return TIERS.STANDARD;
  return TIERS.LEGACY;
}

function getScoreColor(score1000) {
  if (score1000 > 700) return '#059669';
  if (score1000 >= 400) return '#d97706';
  return '#dc2626';
}

export default function CyberRating() {
  const [stats, setStats] = useState(null);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, scansRes] = await Promise.all([
          getCbomStats().catch(() => ({ data: { totalAssets: 0, labelDistribution: {}, averageScore: 0 } })),
          getScans()
        ]);
        setStats(statsRes.data);

        const { getCbomRecords } = await import('../services/api');
        const completedScans = scansRes.data.filter(s => s.status === 'completed' || s.status === 'partial');
        const recordPromises = completedScans.slice(0, 10).map(s =>
          getCbomRecords(s._id).then(r => r.data).catch(() => [])
        );
        const recordArrays = await Promise.all(recordPromises);
        setAllRecords(recordArrays.flat());
      } catch (err) {
        console.error(err);
        toast.error('Failed to load Cyber Rating data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /><p>Loading Cyber Rating...</p></div>;

  const enterpriseScore = (stats?.averageScore || 0) * 10;
  const tier = getTier(enterpriseScore);
  const totalEndpoints = stats?.totalAssets || 0;
  const labelDist = stats?.labelDistribution || {};
  const pqcReady = labelDist['Fully Quantum Safe'] || 0;
  const pqcReadyPct = totalEndpoints > 0 ? Math.round((pqcReady / totalEndpoints) * 100) : 0;

  const urlScores = allRecords.map(rec => {
    const rawScore = rec.quantumAssessment?.score?.score ?? 0;
    const score1000 = rawScore * 10;
    return {
      _id: rec._id,
      host: rec.host,
      port: rec.port,
      score1000,
      tier: getTier(score1000),
      label: rec.quantumAssessment?.label || 'Unknown',
    };
  });

  const filteredUrls = search
    ? urlScores.filter(u =>
        u.host.toLowerCase().includes(search.toLowerCase()) ||
        u.label.toLowerCase().includes(search.toLowerCase()) ||
        u.tier.label.toLowerCase().includes(search.toLowerCase())
      )
    : urlScores;

  const gaugeData = [
    { name: 'Score', value: enterpriseScore },
    { name: 'Remaining', value: 1000 - enterpriseScore },
  ];

  const eliteCount = urlScores.filter(u => u.score1000 > 700).length;
  const standardCount = urlScores.filter(u => u.score1000 >= 400 && u.score1000 <= 700).length;
  const legacyCount = urlScores.filter(u => u.score1000 < 400).length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cyber Rating</h1>
        <p className="page-subtitle">Consolidated Enterprise-Level PQC Cyber-Rating Score</p>
      </div>

      {/* Hero Score Card */}
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', padding: '40px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 200, height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="50%"
                  startAngle={225}
                  endAngle={-45}
                  innerRadius={70}
                  outerRadius={90}
                  dataKey="value"
                  strokeWidth={0}
                >
                  <Cell fill={tier.color} />
                  <Cell fill="#e2e8f0" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)', textAlign: 'center'
            }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: tier.color, letterSpacing: -1, fontFamily: 'var(--font-mono)' }}>
                {enterpriseScore}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>/ 1000</div>
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 'var(--radius-full)',
              background: tier.bg, border: `1px solid ${tier.border}`,
              color: tier.color, fontSize: 14, fontWeight: 700, marginBottom: 8
            }}>
              <Award size={16} /> {tier.label}
            </div>
            <div style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 300 }}>
              {tier.description}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              Based on {totalEndpoints} scanned endpoint{totalEndpoints !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {[
          { label: 'Enterprise Score', value: enterpriseScore, color: tier.color, icon: <Award size={14} />, sub: `Tier: ${tier.label}`, suffix: '/1000' },
          { label: 'Total Endpoints', value: totalEndpoints, color: '#2563eb', icon: <Activity size={14} />, sub: 'Scanned assets' },
          { label: 'PQC Ready', value: `${pqcReadyPct}%`, color: '#059669', icon: <ShieldCheck size={14} />, sub: `${pqcReady} of ${totalEndpoints} endpoints` },
          { label: 'Tier Status', value: tier.label, color: tier.color, icon: <TrendingUp size={14} />, sub: tier.description },
        ].map((s, i) => (
          <motion.div className="stat-card" key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value" style={{ color: s.color }}>
              {s.value}
              {s.suffix && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>{s.suffix}</span>}
            </div>
            <div className="stat-card-sub">{s.icon} {s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Tier Distribution */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Score Distribution by Tier</div>
        <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Elite-PQC (>700)', count: eliteCount, color: '#059669' },
            { label: 'Standard (400-700)', count: standardCount, color: '#d97706' },
            { label: 'Legacy (<400)', count: legacyCount, color: '#dc2626' },
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: t.color }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.label}: <strong>{t.count}</strong></span>
            </div>
          ))}
        </div>
        {urlScores.length > 0 && (
          <div style={{ display: 'flex', height: 24, borderRadius: 'var(--radius-full)', overflow: 'hidden', background: '#e2e8f0' }}>
            {[
              { count: eliteCount, color: '#059669' },
              { count: standardCount, color: '#d97706' },
              { count: legacyCount, color: '#dc2626' },
            ].filter(t => t.count > 0).map((t, i) => (
              <div key={i} style={{
                width: `${(t.count / urlScores.length) * 100}%`,
                background: t.color,
                transition: 'width 0.6s ease'
              }} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Tier Classification Rules */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ marginBottom: 6 }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={18} style={{ color: 'var(--brand-primary)' }} />
            Tier Classification Rules
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Scoring methodology &amp; compliance criteria</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 20px' }}>
          Each scanned endpoint is evaluated against these criteria to determine its PQC cyber-rating tier.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {TIER_RULES.map((rule, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              style={{
                border: `1px solid ${rule.border}`,
                borderLeft: `4px solid ${rule.color}`,
                borderRadius: 12,
                background: rule.bg,
                padding: '18px 20px',
              }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${rule.color}20`, color: rule.color,
                  }}>
                    {rule.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: rule.color }}>{rule.tier}: {rule.name}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                        padding: '2px 8px', borderRadius: 6, background: `${rule.color}20`, color: rule.color,
                      }}>
                        {rule.score}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{rule.securityLevel}</div>
                  </div>
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 8,
                  background: `${rule.color}15`, color: rule.color,
                  fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  {rule.action}
                </div>
              </div>

              {/* Content grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Compliance criteria */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    Compliance Criteria
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {rule.criteria.map((c, j) => (
                      <li key={j} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c}</li>
                    ))}
                  </ul>
                </div>
                {/* Priority / Action */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    Priority / Action
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    {rule.actionDesc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* URL-Level Scores Table */}
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="card-header" style={{ marginBottom: 16 }}>
          <div className="card-title">URL-Level PQC Scores</div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filteredUrls.length}/{urlScores.length} shown</span>
        </div>

        <div style={{ marginBottom: 16, position: 'relative', maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Search host, label, tier..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, height: 34, fontSize: 13 }} />
        </div>

        {filteredUrls.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>PQC Score</th>
                  <th>Tier</th>
                  <th>Quantum Label</th>
                </tr>
              </thead>
              <tbody>
                {filteredUrls.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Globe size={15} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {u.host}:{u.port}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16, color: getScoreColor(u.score1000) }}>
                        {u.score1000}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/1000</span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 'var(--radius-full)',
                        fontSize: '11.5px', fontWeight: 600,
                        background: u.tier.bg, color: u.tier.color, border: `1px solid ${u.tier.border}`
                      }}>
                        {u.tier.label}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${LABEL_BADGE_MAP[u.label] || ''}`}>
                        {u.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Award size={44} />
            <p>{urlScores.length > 0 ? 'No endpoints match your search' : 'No CBOM records found. Run a scan to generate rating data.'}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
