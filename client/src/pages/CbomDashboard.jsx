import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScans, getCbomStats, getCbomRecords } from '../services/api';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, Globe, Search, AlertTriangle,
  FileKey, Layers, Server, ChevronRight, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';

// Safely extract a string from a field that may be a string or object with .name
function str(val, fallback = '—') {
  if (val == null) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.name) return val.name;
  return String(val);
}

const QUANTUM_COLORS = {
  'Fully Quantum Safe': '#059669',
  'Hybrid Mode': '#eab308',
  'Not PQC Ready': '#f97316',
  'Critical — Not PQC Ready': '#dc2626'
};

const BAR_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#6366f1', '#ec4899'];
const TLS_COLORS = { 'TLS 1.3': '#059669', 'TLS 1.2': '#2563eb', 'TLS 1.1': '#f97316', 'TLS 1.0': '#dc2626' };

const LABEL_FILTERS = [
  { key: 'all', label: 'All Assets' },
  { key: 'safe', label: 'PQC Ready' },
  { key: 'hybrid', label: 'Hybrid' },
  { key: 'vulnerable', label: 'Not Ready' },
  { key: 'critical', label: 'Critical' },
];

function QuantumBadge({ label }) {
  const getStyle = (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8,
    fontSize: 11, fontWeight: 600, background: `${color}15`, color, whiteSpace: 'nowrap',
  });
  if (!label) return <span style={getStyle('#94a3b8')}>Unknown</span>;
  if (label.includes('Fully Quantum Safe')) return <span style={getStyle('#059669')}><ShieldCheck size={12} /> {label}</span>;
  if (label.includes('Hybrid')) return <span style={getStyle('#eab308')}><ShieldAlert size={12} /> {label}</span>;
  if (label.includes('Critical')) return <span style={getStyle('#dc2626')}><ShieldX size={12} /> {label}</span>;
  return <span style={getStyle('#f97316')}><ShieldX size={12} /> {label}</span>;
}

function ScoreBar({ score }) {
  const s = score || 0;
  const pct = Math.min((s / 100) * 100, 100);
  const color = s >= 80 ? '#059669' : s >= 50 ? '#d97706' : '#dc2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#f1f5f9' }}>
        <div style={{ height: '100%', borderRadius: 3, background: color, width: `${pct}%`, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'var(--font-mono)', minWidth: 28, textAlign: 'right' }}>{s}</span>
    </div>
  );
}

export default function CbomDashboard() {
  const [stats, setStats] = useState(null);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [labelFilter, setLabelFilter] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, scansRes] = await Promise.all([
          getCbomStats().catch(() => ({ data: { totalAssets: 0, labelDistribution: {}, averageScore: 0 } })),
          getScans().catch(() => ({ data: [] }))
        ]);
        setStats(statsRes.data);

        const completedScans = (scansRes.data || []).filter(s => s.status === 'completed' || s.status === 'partial');
        const recordPromises = completedScans.slice(0, 10).map(s =>
          getCbomRecords(s._id).then(r => r.data).catch(() => [])
        );
        const recordArrays = await Promise.all(recordPromises);
        setAllRecords(recordArrays.flat());
      } catch (err) {
        console.error('CBOM load error:', err);
        toast.error('Failed to load CBOM data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Derived Analytics ──────────────────────────────────
  const analytics = useMemo(() => {
    if (!allRecords.length) return null;
    try {
      const labelDist = stats?.labelDistribution || {};
      const totalAssets = stats?.totalAssets || allRecords.length;
      const pqcReady = labelDist['Fully Quantum Safe'] || 0;
      const hybrid = labelDist['Hybrid Mode'] || 0;
      const notReady = (labelDist['Not PQC Ready'] || 0) + (labelDist['Critical — Not PQC Ready'] || 0);

      // Key Length
      const keyLengths = {};
      allRecords.forEach(r => {
        const ks = r.certificate?.keySize;
        if (ks) keyLengths[ks] = (keyLengths[ks] || 0) + 1;
      });
      const keyLengthData = Object.entries(keyLengths)
        .map(([name, count]) => ({ name: name + '-bit', count, raw: parseInt(name) || 0 }))
        .sort((a, b) => b.count - a.count);

      // Cipher Usage
      const ciphers = {};
      allRecords.forEach(r => {
        const c = str(r.negotiatedCipher) !== '—' ? str(r.negotiatedCipher) : str(r.cipherSuites && r.cipherSuites[0]);
        if (c && c !== '—') ciphers[c] = (ciphers[c] || 0) + 1;
      });
      const cipherData = Object.entries(ciphers)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Certificate Authorities
      const cas = {};
      allRecords.forEach(r => {
        const raw = str(r.certificate?.issuerOrg, '') || str(r.certificate?.issuer, 'Unknown');
        const short = raw.replace(/,.*$/, '').replace(/^(O=|CN=)/, '').trim() || 'Unknown';
        cas[short] = (cas[short] || 0) + 1;
      });
      const caData = Object.entries(cas)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      // TLS Protocols
      const protocols = {};
      allRecords.forEach(r => {
        const best = r.tlsVersions?.bestVersion;
        if (best) protocols[best] = (protocols[best] || 0) + 1;
      });
      const protocolData = Object.entries(protocols)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Key Algorithm
      const keyAlgos = {};
      allRecords.forEach(r => {
        const algo = str(r.certificate?.keyAlgorithm, 'Unknown');
        keyAlgos[algo] = (keyAlgos[algo] || 0) + 1;
      });
      const algoData = Object.entries(keyAlgos)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Quick stats
      const weakCrypto = allRecords.filter(r => {
        const algo = str(r.certificate?.keyAlgorithm, '').toLowerCase();
        const ks = r.certificate?.keySize || 0;
        return algo.includes('rsa') && ks < 2048;
      }).length;

      const certIssues = allRecords.filter(r =>
        r.certificate?.isExpired || r.certificate?.selfSigned || (r.certificate?.daysUntilExpiry != null && r.certificate.daysUntilExpiry < 30)
      ).length;

      const uniqueHosts = new Set(allRecords.map(r => r.host)).size;
      const activeCerts = allRecords.filter(r => !r.certificate?.isExpired).length;

      // Quantum readiness pie
      const qPieData = Object.entries(labelDist)
        .map(([name, value]) => ({ name, value }))
        .filter(d => d.value > 0);

      return {
        totalAssets, pqcReady, hybrid, notReady,
        keyLengthData, cipherData, caData, protocolData, algoData,
        weakCrypto, certIssues, uniqueHosts, activeCerts, qPieData,
        avgScore: stats?.averageScore || 0,
      };
    } catch (err) {
      console.error('Analytics error:', err);
      return null;
    }
  }, [allRecords, stats]);

  // ── Filter Records ─────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return allRecords.filter(rec => {
      const label = rec.quantumAssessment?.label || '';
      if (labelFilter === 'safe' && !label.includes('Fully Quantum Safe')) return false;
      if (labelFilter === 'hybrid' && !label.includes('Hybrid')) return false;
      if (labelFilter === 'vulnerable' && label !== 'Not PQC Ready') return false;
      if (labelFilter === 'critical' && !label.includes('Critical')) return false;
      if (search) {
        const q = search.toLowerCase();
        return (rec.host || '').toLowerCase().includes(q)
          || str(rec.certificate?.keyAlgorithm, '').toLowerCase().includes(q)
          || str(rec.certificate?.issuerOrg, '').toLowerCase().includes(q)
          || (rec.quantumAssessment?.label || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [allRecords, labelFilter, search]);

  // ── Loading ────────────────────────────────────────────
  if (loading) return (
    <div className="loading-container">
      <div className="spinner spinner-lg" />
      <p>Loading CBOM Dashboard...</p>
    </div>
  );

  if (!analytics) return (
    <div>
      <div className="page-header">
        <h1 className="page-title">CBOM Dashboard</h1>
        <p className="page-subtitle">Cryptographic Bill of Materials — comprehensive inventory of all cryptographic assets</p>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <Shield size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>No CBOM Data Available</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Run a scan to generate your Cryptographic Bill of Materials.</p>
      </div>
    </div>
  );

  const maxCipher = analytics.cipherData.length > 0 ? analytics.cipherData[0].count : 1;
  const protocolTotal = analytics.protocolData.reduce((s, d) => s + d.value, 0) || 1;
  const qPieTotal = analytics.qPieData.reduce((s, d) => s + d.value, 0) || 1;

  // ── Render ─────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">CBOM Dashboard</h1>
        <p className="page-subtitle">Cryptographic Bill of Materials — comprehensive inventory of all cryptographic assets across your infrastructure</p>
      </div>

      {/* ═══ Stats Row ══════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Applications', value: analytics.totalAssets, icon: <Layers size={20} />, color: '#2563eb', sub: 'CBOM records scanned' },
          { label: 'Sites Surveyed', value: analytics.uniqueHosts, icon: <Server size={20} />, color: '#7c3aed', sub: 'Unique endpoints' },
          { label: 'Active Certificates', value: analytics.activeCerts, icon: <FileKey size={20} />, color: '#059669', sub: 'Valid & not expired' },
          { label: 'Weak Cryptography', value: analytics.weakCrypto, icon: <AlertTriangle size={20} />, color: '#dc2626', sub: 'Undersized keys detected' },
          { label: 'Certificate Issues', value: analytics.certIssues, icon: <ShieldAlert size={20} />, color: '#f97316', sub: 'Expired or expiring soon' },
        ].map((s, i) => (
          <motion.div key={i} className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }} style={{ padding: '20px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${s.color}15`, color: s.color,
              }}>
                {s.icon}
              </div>
              {s.value > 0 && s.color === '#dc2626' && <ArrowUpRight size={16} color="#dc2626" />}
              {s.value > 0 && s.color === '#f97316' && <AlertTriangle size={14} color="#f97316" />}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -1, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* ═══ Row 1: Key Length + Cipher Usage ═════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Key Length Distribution */}
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="card-header" style={{ marginBottom: 4 }}>
            <div className="card-title">Key Length Distribution</div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>Certificate key sizes across all assets</p>
          {analytics.keyLengthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.keyLengthData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} width={75} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" name="Count" radius={[0, 8, 8, 0]} barSize={22}>
                  {analytics.keyLengthData.map((entry, i) => (
                    <Cell key={i} fill={entry.raw >= 4096 ? '#059669' : entry.raw >= 2048 ? '#2563eb' : '#dc2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No key length data</div>}
        </motion.div>

        {/* Cipher Usage */}
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="card-header" style={{ marginBottom: 4 }}>
            <div className="card-title">Cipher Suite Usage</div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>Most commonly negotiated cipher suites</p>
          {analytics.cipherData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {analytics.cipherData.map((c, i) => {
                const pct = (c.count / maxCipher) * 100;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                        {c.name}
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: BAR_COLORS[i % BAR_COLORS.length], width: `${pct}%`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', minWidth: 28, textAlign: 'right' }}>{c.count}</span>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No cipher data</div>}
        </motion.div>
      </div>

      {/* ═══ Row 2: CAs + TLS Protocols + Quantum Readiness ═ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Top Certificate Authorities */}
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <div className="card-header" style={{ marginBottom: 4 }}>
            <div className="card-title">Top CAs</div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>Issuing Certificate Authorities</p>
          {analytics.caData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={analytics.caData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3} stroke="none">
                    {analytics.caData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
                {analytics.caData.map((ca, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: BAR_COLORS[i % BAR_COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ca.name}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ca.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No CA data</div>}
        </motion.div>

        {/* Encryption Protocols */}
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="card-header" style={{ marginBottom: 4 }}>
            <div className="card-title">Encryption Protocols</div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>TLS version distribution</p>
          {analytics.protocolData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={analytics.protocolData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3} stroke="none">
                    {analytics.protocolData.map((entry, i) => (
                      <Cell key={i} fill={TLS_COLORS[entry.name] || BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
                {analytics.protocolData.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: TLS_COLORS[p.name] || BAR_COLORS[i % BAR_COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{p.name}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round((p.value / protocolTotal) * 100)}%</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({p.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No protocol data</div>}
        </motion.div>

        {/* Quantum Readiness */}
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <div className="card-header" style={{ marginBottom: 4 }}>
            <div className="card-title">Quantum Readiness</div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>PQC compliance distribution</p>
          {analytics.qPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={analytics.qPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3} stroke="none">
                    {analytics.qPieData.map((entry, i) => <Cell key={i} fill={QUANTUM_COLORS[entry.name] || '#94a3b8'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
                {analytics.qPieData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: QUANTUM_COLORS[d.name] || '#94a3b8', flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round((d.value / qPieTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No readiness data</div>}
        </motion.div>
      </div>

      {/* ═══ Row 3: Key Algorithm Bar Chart ═══════════════ */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        style={{ marginBottom: 16 }}>
        <div className="card-header" style={{ marginBottom: 4 }}>
          <div className="card-title">Key Algorithm Distribution</div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
            {analytics.algoData.slice(0, 4).map((a, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                {a.name}: <strong style={{ color: 'var(--text-primary)' }}>{a.count}</strong>
              </span>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>Cryptographic algorithms in use across all endpoints</p>
        {analytics.algoData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.algoData} margin={{ top: 5, right: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="count" name="Assets" radius={[8, 8, 0, 0]} barSize={40}>
                {analytics.algoData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No algorithm data</div>}
      </motion.div>

      {/* ═══ CBOM Asset Inventory Table ═══════════════════ */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
        <div className="card-header" style={{ marginBottom: 16 }}>
          <div className="card-title">CBOM Asset Inventory</div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filteredRecords.length} of {allRecords.length} assets</span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 10, background: 'var(--bg-secondary)' }}>
            {LABEL_FILTERS.map(f => (
              <button key={f.key} onClick={() => setLabelFilter(f.key)}
                className={`btn btn-sm ${labelFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12 }}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search host, algorithm, CA..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34, height: 36, fontSize: 12, width: 240 }} />
          </div>
        </div>

        {/* Table */}
        {filteredRecords.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Key Length</th>
                  <th>Cipher</th>
                  <th>Certificate Authority</th>
                  <th>Score</th>
                  <th>Quantum Label</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => (
                  <tr key={rec._id} className="clickable-row" onClick={() => navigate(`/asset/${rec._id}`)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: '#2563eb15', color: '#2563eb', flexShrink: 0,
                        }}>
                          <Globe size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{rec.host}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Port {rec.port} &bull; {rec.tlsVersions?.bestVersion || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
                        color: (rec.certificate?.keySize || 0) >= 2048 ? '#059669' : '#dc2626',
                      }}>
                        {rec.certificate?.keySize ? rec.certificate.keySize + '-bit' : '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {str(rec.negotiatedCipher) !== '—' ? str(rec.negotiatedCipher) : str(rec.cipherSuites && rec.cipherSuites[0])}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(str(rec.certificate?.issuerOrg, '') || str(rec.certificate?.issuer, '—')).replace(/,.*$/, '').replace(/^(O=|CN=)/, '')}
                      </div>
                    </td>
                    <td style={{ width: 120 }}>
                      <ScoreBar score={rec.quantumAssessment?.score?.score} />
                    </td>
                    <td>
                      <QuantumBadge label={rec.quantumAssessment?.label} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Shield size={44} />
            <p>{allRecords.length > 0 ? 'No records match your filters' : 'No CBOM records found. Run a scan to generate CBOM data.'}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
