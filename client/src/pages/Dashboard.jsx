import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScans, getCbomStats } from '../services/api';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Activity, Scan, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';

const PIE_COLORS = { 'Fully Quantum Safe': '#059669', 'Hybrid Mode': '#d97706', 'Not PQC Ready': '#dc2626', 'Critical — Not PQC Ready': '#991b1b' };

function AnimatedCounter({ value, duration = 800, suffix = '' }) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (value == null || isNaN(value)) return;
    const target = Number(value);
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayed(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);

  return <>{displayed}{suffix}</>;
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="page-header">
        <div className="skeleton skeleton-title" style={{ width: 160 }} />
        <div className="skeleton skeleton-text" style={{ width: 280 }} />
      </div>
      <div className="stats-grid">
        {[1, 2, 3, 4].map(i => (
          <div className="stat-card" key={i}>
            <div className="skeleton skeleton-text" style={{ width: '50%' }} />
            <div className="skeleton" style={{ height: 32, width: '40%', marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: '70%' }} />
          </div>
        ))}
      </div>
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card"><div className="skeleton skeleton-chart" /></div>
        <div className="card"><div className="skeleton skeleton-chart" /></div>
      </div>
      <div className="card"><div className="skeleton" style={{ height: 200 }} /></div>
    </div>
  );
}

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

  if (loading) return <DashboardSkeleton />;

  const labelDist = stats?.labelDistribution || {};
  const pieData = Object.entries(labelDist).map(([name, value]) => ({ name, value }));
  const pqcReady = labelDist['Fully Quantum Safe'] || 0;
  const notReady = (labelDist['Not PQC Ready'] || 0) + (labelDist['Critical — Not PQC Ready'] || 0);
  const totalAssets = stats?.totalAssets || 0;

  // Enhanced timeline data
  const trendData = scans
    .filter(s => s.status === 'completed')
    .slice(0, 15)
    .reverse()
    .map(s => {
      const dist = s.summary?.labelDistribution || {};
      const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
      const ready = dist['Fully Quantum Safe'] || 0;
      return {
        date: new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: s.summary?.averageScore || 0,
        pqcPct: Math.round((ready / total) * 100),
      };
    });

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
            <div className="stat-card-value" style={{ color: s.color }}>
              <AnimatedCounter value={s.value} />
              {s.suffix && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>{s.suffix}</span>}
            </div>
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
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13, color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ minHeight: 240 }}><Scan size={40} /><p>No scan data yet</p></div>}
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>PQC Score & Readiness Trend</div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 10, fontSize: 12, color: 'var(--text-primary)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} name="Avg Score" />
                <Line yAxisId="right" type="monotone" dataKey="pqcPct" stroke="#059669" strokeWidth={2} dot={{ r: 3, fill: '#059669' }} strokeDasharray="5 5" name="PQC Ready %" />
              </LineChart>
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
