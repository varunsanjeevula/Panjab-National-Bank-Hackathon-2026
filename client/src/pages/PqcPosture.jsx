import { useState, useEffect } from 'react';
import { getScans, getCbomStats } from '../services/api';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ShieldCheck, ShieldAlert, ShieldX, Globe, AlertTriangle, CheckCircle2, XCircle, Search, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const GRADE_COLORS = {
  'Elite-PQC': '#059669',
  'Standard': '#d97706',
  'Legacy': '#f97316',
  'Critical': '#dc2626',
};

const LABEL_TO_GRADE = {
  'Fully Quantum Safe': 'Elite-PQC',
  'Hybrid Mode': 'Standard',
  'Not PQC Ready': 'Legacy',
  'Critical — Not PQC Ready': 'Critical',
};

function getTier(score) {
  if (score > 700) return { label: 'Elite-PQC', color: '#059669' };
  if (score >= 400) return { label: 'Standard', color: '#d97706' };
  return { label: 'Legacy', color: '#dc2626' };
}

function getRecommendations(rec) {
  const recs = [];
  const cert = rec.certificate || {};
  const tls = rec.tlsVersions || {};

  if (!tls.hasTLS13) recs.push('Upgrade to TLS 1.3 with PQC');
  if (tls.hasDeprecated) recs.push('Disable deprecated TLS versions (1.0/1.1)');

  const keyAlgo = cert.keyAlgorithm || '';
  if (keyAlgo.includes('RSA') || keyAlgo.includes('EC')) recs.push('Implement Kyber for Key Exchange');

  if (cert.keyClassification === 'Quantum-Vulnerable' || cert.signatureClassification === 'Quantum-Vulnerable')
    recs.push('Update Cryptographic Libraries');

  const label = rec.quantumAssessment?.label || '';
  if (!label.includes('Fully Quantum Safe')) recs.push('Develop PQC Migration Plan');

  return recs.length > 0 ? recs : ['No immediate actions required'];
}

export default function PqcPosture() {
  const [stats, setStats] = useState(null);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);

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
        toast.error('Failed to load PQC posture data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /><p>Loading PQC Compliance Dashboard...</p></div>;

  const totalEndpoints = stats?.totalAssets || 0;
  const labelDist = stats?.labelDistribution || {};

  // Grade counts
  const gradeCounts = { 'Elite-PQC': 0, 'Standard': 0, 'Legacy': 0, 'Critical': 0 };
  Object.entries(labelDist).forEach(([label, count]) => {
    const grade = LABEL_TO_GRADE[label];
    if (grade) gradeCounts[grade] += count;
  });

  // Percentages
  const pct = (count) => totalEndpoints > 0 ? Math.round((count / totalEndpoints) * 100) : 0;
  const elitePct = pct(gradeCounts['Elite-PQC']);
  const standardPct = pct(gradeCounts['Standard']);
  const legacyPct = pct(gradeCounts['Legacy']);
  const criticalCount = gradeCounts['Critical'];

  // Bar chart data
  const barChartData = [
    { name: 'Elite', count: gradeCounts['Elite-PQC'], fill: '#059669' },
    { name: 'Standard', count: gradeCounts['Standard'], fill: '#d97706' },
    { name: 'Legacy', count: gradeCounts['Legacy'], fill: '#f97316' },
    { name: 'Critical', count: gradeCounts['Critical'], fill: '#dc2626' },
  ];

  // Pie chart data
  const pieData = [
    { name: 'Elite-PQC Ready', value: gradeCounts['Elite-PQC'], color: '#059669' },
    { name: 'Standard', value: gradeCounts['Standard'], color: '#d97706' },
    { name: 'Legacy', value: gradeCounts['Legacy'], color: '#f97316' },
    { name: 'Critical', value: gradeCounts['Critical'], color: '#dc2626' },
  ].filter(d => d.value > 0);

  // Risk grid data from records
  const riskData = allRecords.map(rec => {
    const score = (rec.quantumAssessment?.score?.score ?? 0) * 10;
    let risk = 'safe';
    if (score < 400) risk = 'high';
    else if (score <= 700) risk = 'medium';
    return { host: rec.host, risk, score };
  });

  // Assets table
  const assets = allRecords.map(rec => {
    const label = rec.quantumAssessment?.label || 'Unknown';
    const grade = LABEL_TO_GRADE[label] || 'Legacy';
    const score = (rec.quantumAssessment?.score?.score ?? 0) * 10;
    const pqcSupport = label === 'Fully Quantum Safe' || label === 'Hybrid Mode';
    return { ...rec, grade, score1000: score, pqcSupport, label };
  });

  const filteredAssets = search
    ? assets.filter(a =>
        a.host?.toLowerCase().includes(search.toLowerCase()) ||
        a.grade.toLowerCase().includes(search.toLowerCase()) ||
        a.label.toLowerCase().includes(search.toLowerCase())
      )
    : assets;

  const detail = selectedAsset;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Posture of PQC</h1>
        <p className="page-subtitle">PQC Compliance Dashboard</p>
      </div>

      {/* Top Stats Bar */}
      <div className="stats-grid">
        {[
          { label: 'Elite-PQC Ready', value: `${elitePct}%`, color: '#059669', icon: <ShieldCheck size={14} />, sub: `${gradeCounts['Elite-PQC']} endpoints` },
          { label: 'Standard', value: `${standardPct}%`, color: '#d97706', icon: <ShieldAlert size={14} />, sub: `${gradeCounts['Standard']} endpoints` },
          { label: 'Legacy', value: `${legacyPct}%`, color: '#f97316', icon: <ShieldX size={14} />, sub: `${gradeCounts['Legacy']} endpoints` },
          { label: 'Critical Apps', value: criticalCount, color: '#dc2626', icon: <AlertTriangle size={14} />, sub: 'Need immediate action' },
        ].map((s, i) => (
          <motion.div className="stat-card" key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-card-sub">{s.icon} {s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row: Bar Chart + Pie Chart */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Assets by Classification Grade */}
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Assets by Classification Grade</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Assets">
                {barChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Application Status Pie */}
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Application Status</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}
                  label={({ name, value }) => `${value}`}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ minHeight: 240 }}><ShieldX size={40} /><p>No data available</p></div>
          )}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            {[
              { label: 'Elite-PQC Ready', color: '#059669', pct: elitePct },
              { label: 'Standard', color: '#d97706', pct: standardPct },
              { label: 'Legacy', color: '#f97316', pct: legacyPct },
              { label: 'Critical', color: '#dc2626', pct: pct(criticalCount) },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
                {item.pct}% {item.label}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Risk Overview */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Risk Overview</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: '#dc2626' }} /> High Risk</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: '#f97316' }} /> Medium Risk</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: '#059669' }} /> Safe</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {riskData.map((r, i) => (
            <div key={i} title={`${r.host} — ${r.score}/1000`} style={{
              width: 32, height: 32, borderRadius: 6, cursor: 'pointer',
              background: r.risk === 'high' ? '#dc2626' : r.risk === 'medium' ? '#f97316' : '#059669',
              opacity: 0.85,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          ))}
          {riskData.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No endpoints scanned yet</div>}
        </div>
      </motion.div>

      {/* Assets Table + Detail Panel */}
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <div className="card-header" style={{ marginBottom: 16 }}>
          <div className="card-title">Assets</div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filteredAssets.length}/{assets.length} shown</span>
        </div>

        <div style={{ marginBottom: 16, position: 'relative', maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Search host, grade..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, height: 34, fontSize: 13 }} />
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          {/* Table */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {filteredAssets.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Asset Name</th>
                      <th>PQC Support</th>
                      <th>Grade</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((a, i) => (
                      <tr key={a._id || i} className="clickable-row"
                        onClick={() => setSelectedAsset(a)}
                        style={{ background: selectedAsset?._id === a._id ? 'var(--bg-body)' : undefined }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Globe size={15} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 }}>{a.host}:{a.port}</span>
                          </div>
                        </td>
                        <td>
                          {a.pqcSupport
                            ? <CheckCircle2 size={18} style={{ color: '#059669' }} />
                            : <XCircle size={18} style={{ color: '#dc2626' }} />
                          }
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 'var(--radius-full)',
                            fontSize: 11, fontWeight: 600,
                            background: GRADE_COLORS[a.grade] + '15',
                            color: GRADE_COLORS[a.grade],
                          }}>
                            {a.grade}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: GRADE_COLORS[a.grade] }}>
                            {a.score1000}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/1000</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><ShieldX size={44} /><p>No assets found</p></div>
            )}
          </div>

          {/* Detail Panel */}
          {detail && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              style={{
                width: 320, flexShrink: 0, padding: 20, borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)', background: 'var(--bg-body)',
              }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {detail.host}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Port {detail.port}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>TLS</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {detail.certificate?.keyAlgorithm || '—'} / {detail.tlsVersions?.bestVersion || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Score</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: GRADE_COLORS[detail.grade] }}>
                    {detail.score1000} <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>/1000</span>
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <span style={{
                    padding: '2px 10px', borderRadius: 'var(--radius-full)',
                    fontSize: 11, fontWeight: 600,
                    background: GRADE_COLORS[detail.grade] + '15', color: GRADE_COLORS[detail.grade],
                  }}>
                    {detail.grade}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Signature</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {detail.certificate?.signatureAlgorithm || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>PQC Support</span>
                  {detail.pqcSupport
                    ? <span style={{ color: '#059669', fontWeight: 600 }}>Yes</span>
                    : <span style={{ color: '#dc2626', fontWeight: 600 }}>No</span>
                  }
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Info size={14} /> Improvement Recommendations
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {getRecommendations(detail).map((rec, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <AlertTriangle size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
