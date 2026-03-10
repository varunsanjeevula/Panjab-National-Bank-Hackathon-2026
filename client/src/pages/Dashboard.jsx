import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScans, getCbomStats } from '../services/api';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Activity, Scan, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';

const PIE_COLORS = { 'Fully Quantum Safe': '#059669', 'Hybrid Mode': '#d97706', 'Not PQC Ready': '#dc2626', 'Critical — Not PQC Ready': '#991b1b' };

export default function Dashboard() {
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [scansRes, statsRes] = await Promise.all([
        getScans(),
        getCbomStats().catch(() => ({ data: { totalAssets: 0, labelDistribution: {}, averageScore: 0 } }))
      ]);
      setScans(scansRes.data);
      setStats(statsRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /><p>Loading dashboard...</p></div>;

  const labelDist = stats?.labelDistribution || {};
  const pieData = Object.entries(labelDist).map(([name, value]) => ({ name, value }));
  const pqcReady = labelDist['Fully Quantum Safe'] || 0;
  const notReady = (labelDist['Not PQC Ready'] || 0) + (labelDist['Critical — Not PQC Ready'] || 0);
  const totalAssets = stats?.totalAssets || 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Quantum-readiness overview of your scanned assets</p>
      </div>

      <div className="stats-grid">
        {[
          { label: 'Total Scanned', value: totalAssets, color: '#2563eb', icon: <Activity size={14} />, sub: 'Across all scans' },
          { label: 'PQC Ready', value: pqcReady, color: '#059669', icon: <ShieldCheck size={14} />, sub: 'Fully quantum safe' },
          { label: 'Not PQC Ready', value: notReady, color: '#dc2626', icon: <ShieldX size={14} />, sub: 'Need migration' },
          { label: 'Avg Score', value: stats?.averageScore || 0, color: '#d97706', icon: <TrendingUp size={14} />, sub: 'Quantum readiness', suffix: '/100' },
        ].map((s, i) => (
          <motion.div className="stat-card" key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value" style={{ color: s.color }}>{s.value}{s.suffix && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>{s.suffix}</span>}</div>
            <div className="stat-card-sub">{s.icon} {s.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Quantum Readiness</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3} label={({ name, value }) => `${value}`}>
                  {pieData.map((entry, i) => <Cell key={i} fill={PIE_COLORS[entry.name] || '#94a3b8'} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ minHeight: 240 }}><Scan size={40} /><p>No scan data yet</p></div>}
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Score History</div>
          {scans.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={scans.slice(0, 8).reverse().map(s => ({
                name: new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                score: s.summary?.averageScore || 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13 }} />
                <Bar dataKey="score" fill="#2563eb" radius={[6, 6, 0, 0]} name="Avg Score" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ minHeight: 240 }}><Clock size={40} /><p>Score history will appear here</p></div>}
        </motion.div>
      </div>

      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="card-header">
          <div className="card-title">Recent Scans</div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/scan')}><Scan size={14} /> New Scan</button>
        </div>
        {scans.length > 0 ? (
          <div className="table-container">
            <table>
              <thead><tr><th>Date</th><th>Targets</th><th>Status</th><th>Score</th><th>PQC Ready</th><th>Vulnerable</th><th></th></tr></thead>
              <tbody>
                {scans.slice(0, 10).map(scan => (
                  <tr key={scan._id} className="clickable-row" onClick={() => navigate(`/results/${scan._id}`)}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{new Date(scan.createdAt).toLocaleString()}</td>
                    <td>{scan.targets?.length || 0} endpoint{(scan.targets?.length || 0) !== 1 ? 's' : ''}</td>
                    <td><span className={`badge ${scan.status === 'completed' ? 'badge-safe' : scan.status === 'running' ? 'badge-hybrid' : 'badge-vulnerable'}`}>{scan.status}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{scan.summary?.averageScore ?? '—'}</td>
                    <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{scan.summary?.labelDistribution?.['Fully Quantum Safe'] || 0}</td>
                    <td style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{(scan.summary?.labelDistribution?.['Not PQC Ready'] || 0) + (scan.summary?.labelDistribution?.['Critical — Not PQC Ready'] || 0)}</td>
                    <td><ArrowUpRight size={16} style={{ color: 'var(--text-muted)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><ShieldAlert size={44} /><p>No scans yet. Click "New Scan" to get started.</p></div>
        )}
      </motion.div>
    </div>
  );
}
