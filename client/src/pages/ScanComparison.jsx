import { useState, useEffect } from 'react';
import { getScans, getCbomRecords } from '../services/api';
import { motion } from 'framer-motion';
import { GitCompareArrows, ArrowUp, ArrowDown, Minus, Shield, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import toast from 'react-hot-toast';

const PIE_COLORS = { 'Fully Quantum Safe': '#059669', 'Hybrid Mode': '#d97706', 'Not PQC Ready': '#dc2626', 'Critical — Not PQC Ready': '#991b1b' };

export default function ScanComparison() {
  const [scans, setScans] = useState([]);
  const [scan1Id, setScan1Id] = useState('');
  const [scan2Id, setScan2Id] = useState('');
  const [data1, setData1] = useState(null);
  const [data2, setData2] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getScans().then(res => {
      const completed = res.data.filter(s => s.status === 'completed');
      setScans(completed);
      if (completed.length >= 2) {
        setScan1Id(completed[1]._id);
        setScan2Id(completed[0]._id);
      }
    }).catch(() => toast.error('Failed to load scans'));
  }, []);

  useEffect(() => {
    if (scan1Id && scan2Id && scan1Id !== scan2Id) loadComparison();
  }, [scan1Id, scan2Id]);

  const loadComparison = async () => {
    setLoading(true);
    try {
      const [res1, res2] = await Promise.all([
        getCbomRecords(scan1Id),
        getCbomRecords(scan2Id),
      ]);
      setData1(res1.data.filter(r => r.status === 'completed'));
      setData2(res2.data.filter(r => r.status === 'completed'));
    } catch { toast.error('Comparison failed'); }
    setLoading(false);
  };

  const getScanMeta = (id) => scans.find(s => s._id === id);
  const getDistribution = (records) => {
    const dist = {};
    records?.forEach(r => { const l = r.quantumAssessment?.label || 'Unknown'; dist[l] = (dist[l] || 0) + 1; });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  };
  const getAvgScore = (records) => {
    if (!records?.length) return 0;
    return Math.round(records.reduce((s, r) => s + (r.quantumAssessment?.score?.score || 0), 0) / records.length);
  };

  const avg1 = getAvgScore(data1);
  const avg2 = getAvgScore(data2);
  const delta = avg2 - avg1;
  const pie1 = getDistribution(data1);
  const pie2 = getDistribution(data2);

  // Host-level comparison
  const hostMap = {};
  data1?.forEach(r => { hostMap[r.host] = { before: r.quantumAssessment?.score?.score || 0, label1: r.quantumAssessment?.label }; });
  data2?.forEach(r => {
    if (!hostMap[r.host]) hostMap[r.host] = {};
    hostMap[r.host].after = r.quantumAssessment?.score?.score || 0;
    hostMap[r.host].label2 = r.quantumAssessment?.label;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Scan Comparison</h1>
        <p className="page-subtitle">Compare two scans side-by-side to track progress over time</p>
      </div>

      {/* Selectors */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="detail-item-label" style={{ display: 'block', marginBottom: 6 }}>BASELINE SCAN</label>
          <select className="form-input" value={scan1Id} onChange={e => setScan1Id(e.target.value)}>
            <option value="">Select scan...</option>
            {scans.map(s => <option key={s._id} value={s._id}>{new Date(s.createdAt).toLocaleDateString()} — {s.targets?.length || 0} targets (Avg: {s.summary?.averageScore ?? '—'})</option>)}
          </select>
        </div>
        <div style={{ fontSize: 20, color: 'var(--text-muted)', fontWeight: 700 }}>→</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="detail-item-label" style={{ display: 'block', marginBottom: 6 }}>COMPARISON SCAN</label>
          <select className="form-input" value={scan2Id} onChange={e => setScan2Id(e.target.value)}>
            <option value="">Select scan...</option>
            {scans.map(s => <option key={s._id} value={s._id}>{new Date(s.createdAt).toLocaleDateString()} — {s.targets?.length || 0} targets (Avg: {s.summary?.averageScore ?? '—'})</option>)}
          </select>
        </div>
      </motion.div>

      {loading && (
        <div className="grid-2">
          <div className="card"><div className="skeleton skeleton-chart" /></div>
          <div className="card"><div className="skeleton skeleton-chart" /></div>
        </div>
      )}

      {data1 && data2 && !loading && (
        <>
          {/* Score Delta */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
            <motion.div className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="stat-card-label">Baseline Score</div>
              <div className="stat-card-value" style={{ color: '#2563eb' }}>{avg1}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/100</span></div>
              <div className="stat-card-sub">{data1.length} assets scanned</div>
            </motion.div>
            <motion.div className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
              <div className="stat-card-label">Score Change</div>
              <div className="stat-card-value" style={{ color: delta > 0 ? 'var(--color-success)' : delta < 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                {delta > 0 ? '+' : ''}{delta}
              </div>
              <div className="stat-card-sub">
                {delta > 0 ? <TrendingUp size={14} style={{ color: 'var(--color-success)' }} /> : delta < 0 ? <TrendingDown size={14} style={{ color: 'var(--color-danger)' }} /> : <Minus size={14} />}
                {delta > 0 ? ' Improvement' : delta < 0 ? ' Regression' : ' No change'}
              </div>
            </motion.div>
            <motion.div className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <div className="stat-card-label">Current Score</div>
              <div className="stat-card-value" style={{ color: avg2 >= 60 ? 'var(--color-success)' : 'var(--color-warning)' }}>{avg2}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/100</span></div>
              <div className="stat-card-sub">{data2.length} assets scanned</div>
            </motion.div>
          </div>

          {/* Pie Charts */}
          <div className="grid-2" style={{ marginBottom: 20 }}>
            {[{ title: 'Baseline Distribution', data: pie1 }, { title: 'Current Distribution', data: pie2 }].map((chart, ci) => (
              <motion.div className="card" key={ci} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + ci * 0.1 }}>
                <div className="card-title" style={{ marginBottom: 12 }}>{chart.title}</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={chart.data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3} label={({ value }) => value}>
                      {chart.data.map((entry, i) => <Cell key={i} fill={PIE_COLORS[entry.name] || '#94a3b8'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 10, fontSize: 12, color: 'var(--text-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            ))}
          </div>

          {/* Per-Host Table */}
          <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>Per-Host Score Comparison</div>
            <div className="table-container">
              <table>
                <thead><tr><th>Host</th><th>Before</th><th>After</th><th>Change</th><th>Status</th></tr></thead>
                <tbody>
                  {Object.entries(hostMap).sort((a, b) => ((b[1].after || 0) - (b[1].before || 0)) - ((a[1].after || 0) - (a[1].before || 0))).map(([host, data]) => {
                    const change = (data.after || 0) - (data.before || 0);
                    return (
                      <tr key={host}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{host}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{data.before ?? '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{data.after ?? '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: change > 0 ? 'var(--color-success)' : change < 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                          {change > 0 ? `+${change}` : change}
                        </td>
                        <td>
                          {change > 0 ? <span className="badge badge-safe"><ArrowUp size={12} /> Improved</span>
                            : change < 0 ? <span className="badge badge-vulnerable"><ArrowDown size={12} /> Degraded</span>
                            : <span className="badge" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}><Minus size={12} /> Same</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}

      {scans.length < 2 && (
        <div className="card empty-state">
          <GitCompareArrows size={44} />
          <p>Need at least 2 completed scans to compare. Run more scans to track progress.</p>
        </div>
      )}
    </div>
  );
}
