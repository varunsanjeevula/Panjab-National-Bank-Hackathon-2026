import { useState, useEffect, useMemo } from 'react';
import { getReportsList, getCbomStats, getScans, getCbomRecords, exportPDF } from '../services/api';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Briefcase, TrendingUp, ShieldCheck, ShieldX, AlertTriangle, Target, Download, FileDown, Crown, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

const TIER_COLORS = { 'Elite-PQC': '#059669', 'Standard': '#d97706', 'Legacy': '#f97316', 'Critical': '#dc2626' };
const LABEL_TO_GRADE = { 'Fully Quantum Safe': 'Elite-PQC', 'Hybrid Mode': 'Standard', 'Not PQC Ready': 'Legacy', 'Critical — Not PQC Ready': 'Critical' };

export default function ExecutivesReporting() {
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState([]);
  const [cbomRecords, setCbomRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [reportScans, setReportScans] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [statsRes, scansRes, reportsRes] = await Promise.allSettled([
        getCbomStats(), getScans(), getReportsList()
      ]);
      const statsData = statsRes.status === 'fulfilled' ? statsRes.value.data : null;
      const scansData = scansRes.status === 'fulfilled' ? scansRes.value.data : [];
      const reportsData = reportsRes.status === 'fulfilled' ? reportsRes.value.data : [];

      setStats(statsData);
      setScans(scansData);
      setReportScans(reportsData);

      // Load CBOM records from completed scans
      const completedScans = scansData.filter(s => s.status === 'completed').slice(0, 15);
      const recordPromises = completedScans.map(s => getCbomRecords(s._id).catch(() => ({ data: [] })));
      const recordResults = await Promise.allSettled(recordPromises);
      const allRecords = recordResults
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value.data);
      setCbomRecords(allRecords);
    } catch { /* handled */ }
    finally { setLoading(false); }
  };

  const analytics = useMemo(() => {
    if (!cbomRecords.length) return null;

    // Score distribution
    const scores = cbomRecords.map(r => (r.quantumAssessment?.score?.score || 0) * 10);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const maxScore = Math.max(...scores, 0);
    const minScore = Math.min(...scores, 1000);

    // Grade distribution
    const grades = { 'Elite-PQC': 0, 'Standard': 0, 'Legacy': 0, 'Critical': 0 };
    cbomRecords.forEach(r => {
      const label = r.quantumAssessment?.score?.label || 'Not PQC Ready';
      const grade = LABEL_TO_GRADE[label] || 'Legacy';
      grades[grade]++;
    });

    // PQC readiness
    const pqcReady = grades['Elite-PQC'];
    const pqcReadyPct = cbomRecords.length ? Math.round((pqcReady / cbomRecords.length) * 100) : 0;

    // Vulnerability summary
    const vulnCount = cbomRecords.filter(r => {
      const label = r.quantumAssessment?.score?.label || '';
      return label.includes('Not PQC Ready') || label.includes('Critical');
    }).length;

    // TLS version distribution
    const tlsVersions = {};
    cbomRecords.forEach(r => {
      const proto = r.tls?.protocol || 'Unknown';
      tlsVersions[proto] = (tlsVersions[proto] || 0) + 1;
    });

    // Key algorithm distribution
    const keyAlgos = {};
    cbomRecords.forEach(r => {
      const algo = r.certificate?.keyAlgorithm || 'Unknown';
      keyAlgos[algo] = (keyAlgos[algo] || 0) + 1;
    });

    // Trend data from scans (most recent 10)
    const trendData = scans
      .filter(s => s.status === 'completed')
      .slice(0, 10)
      .reverse()
      .map(s => ({
        date: new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: Math.round((s.avgScore || 0) * 10),
        targets: s.targetCount || 0,
      }));

    // Risk breakdown
    const highRisk = cbomRecords.filter(r => (r.quantumAssessment?.score?.score || 0) * 10 < 400).length;
    const medRisk = cbomRecords.filter(r => {
      const sc = (r.quantumAssessment?.score?.score || 0) * 10;
      return sc >= 400 && sc <= 700;
    }).length;
    const lowRisk = cbomRecords.filter(r => (r.quantumAssessment?.score?.score || 0) * 10 > 700).length;

    return {
      avgScore, maxScore, minScore, grades, pqcReady, pqcReadyPct, vulnCount,
      tlsVersions, keyAlgos, trendData, highRisk, medRisk, lowRisk,
      totalEndpoints: cbomRecords.length,
    };
  }, [cbomRecords, scans]);

  const handleExportExecutive = async () => {
    const latestScan = scans.find(s => s.status === 'completed');
    if (!latestScan) return toast.error('No completed scan available for export');
    try {
      toast.loading('Generating executive PDF...', { id: 'exec-export' });
      const res = await exportPDF(latestScan._id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `executive_report_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Executive report downloaded!', { id: 'exec-export' });
    } catch { toast.error('Failed to generate executive report', { id: 'exec-export' }); }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div className="spinner spinner-lg" style={{ marginBottom: 12 }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Preparing executive summary...</p>
    </div>
  );

  if (!analytics) return (
    <div className="card" style={{ textAlign: 'center', padding: 50 }}>
      <Briefcase size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
      <p style={{ fontSize: 15, fontWeight: 600 }}>No data available</p>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Run scans to generate executive-level insights.</p>
    </div>
  );

  const gradeChartData = Object.entries(analytics.grades).map(([name, value]) => ({ name, value, fill: TIER_COLORS[name] }));
  const tlsChartData = Object.entries(analytics.tlsVersions).map(([name, value]) => ({ name, value }));
  const riskPieData = [
    { name: 'High Risk', value: analytics.highRisk, fill: '#dc2626' },
    { name: 'Medium Risk', value: analytics.medRisk, fill: '#f97316' },
    { name: 'Low Risk', value: analytics.lowRisk, fill: '#059669' },
  ].filter(d => d.value > 0);

  const scoreTier = analytics.avgScore > 700 ? 'Elite-PQC' : analytics.avgScore >= 400 ? 'Standard' : 'Legacy';
  const scoreTierColor = TIER_COLORS[scoreTier];

  return (
    <div>
      {/* Hero Enterprise Score */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24, padding: '28px 32px', background: `linear-gradient(135deg, ${scoreTierColor}08, ${scoreTierColor}03)`,
          border: `1px solid ${scoreTierColor}25` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${scoreTierColor}15`, border: `2px solid ${scoreTierColor}30`
            }}>
              <Crown size={32} color={scoreTierColor} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Enterprise PQC Score
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: scoreTierColor }}>{analytics.avgScore}</span>
                <span style={{ fontSize: 18, color: 'var(--text-muted)', fontWeight: 500 }}>/1000</span>
              </div>
              <div style={{
                display: 'inline-block', padding: '3px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: `${scoreTierColor}15`, color: scoreTierColor, marginTop: 4
              }}>
                {scoreTier} Tier
              </div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleExportExecutive} style={{ gap: 8 }}>
            <FileDown size={16} /> Export Executive PDF
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { icon: <Target size={18} />, label: 'Total Endpoints', value: analytics.totalEndpoints, color: '#3b82f6', trend: null },
          { icon: <ShieldCheck size={18} />, label: 'PQC Ready', value: `${analytics.pqcReadyPct}%`, color: '#059669',
            trend: analytics.pqcReadyPct >= 50 ? 'up' : analytics.pqcReadyPct >= 20 ? 'flat' : 'down' },
          { icon: <AlertTriangle size={18} />, label: 'Vulnerabilities', value: analytics.vulnCount, color: '#dc2626',
            trend: analytics.vulnCount === 0 ? 'up' : 'down' },
          { icon: <TrendingUp size={18} />, label: 'Score Range', value: `${analytics.minScore}–${analytics.maxScore}`, color: '#8b5cf6', trend: null },
        ].map((kpi, i) => (
          <motion.div key={i} className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${kpi.color}15`, color: kpi.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {kpi.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{kpi.value}</span>
                {kpi.trend === 'up' && <ArrowUpRight size={14} color="#059669" />}
                {kpi.trend === 'down' && <ArrowDownRight size={14} color="#dc2626" />}
                {kpi.trend === 'flat' && <Minus size={14} color="#d97706" />}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{kpi.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Score Trend */}
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="card-header" style={{ marginBottom: 16 }}>
            <div className="card-title">PQC Score Trend</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis domain={[0, 1000]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border-light)', fontSize: 12 }} />
              <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb' }} name="PQC Score" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Risk Distribution Pie */}
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="card-header" style={{ marginBottom: 16 }}>
            <div className="card-title">Risk Distribution</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {riskPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {riskPieData.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: d.fill }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginLeft: 4 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Second Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Classification Grades Bar */}
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="card-header" style={{ marginBottom: 16 }}>
            <div className="card-title">Assets by Classification</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gradeChartData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={80} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                {gradeChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* TLS Versions Bar */}
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="card-header" style={{ marginBottom: 16 }}>
            <div className="card-title">TLS Protocol Distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tlsChartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={35} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Key Findings & Recommendations */}
      <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <div className="card-header" style={{ marginBottom: 16 }}>
          <div className="card-title">Key Findings & Recommendations</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Findings */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Key Findings
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { text: `${analytics.totalEndpoints} endpoints assessed across ${scans.filter(s => s.status === 'completed').length} scans`, color: '#3b82f6' },
                { text: `Enterprise PQC readiness: ${analytics.pqcReadyPct}% (${analytics.pqcReady} of ${analytics.totalEndpoints})`, color: analytics.pqcReadyPct >= 50 ? '#059669' : '#d97706' },
                { text: `${analytics.vulnCount} endpoint(s) classified as quantum-vulnerable`, color: analytics.vulnCount > 0 ? '#dc2626' : '#059669' },
                { text: `${analytics.highRisk} high-risk, ${analytics.medRisk} medium-risk, ${analytics.lowRisk} low-risk assets`, color: '#8b5cf6' },
              ].map((finding, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px',
                  borderRadius: 8, background: `${finding.color}08`, border: `1px solid ${finding.color}15`,
                  fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: finding.color, marginTop: 5, flexShrink: 0 }} />
                  {finding.text}
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Strategic Recommendations
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(() => {
                const recs = [];
                if (analytics.pqcReadyPct < 100) recs.push({ text: 'Develop a phased PQC migration roadmap for all non-compliant endpoints', priority: 'High' });
                if (analytics.highRisk > 0) recs.push({ text: `Prioritize remediation for ${analytics.highRisk} high-risk asset(s) with scores below 400`, priority: 'Critical' });
                if (analytics.vulnCount > 0) recs.push({ text: 'Implement hybrid cryptographic solutions as an interim protection measure', priority: 'High' });
                recs.push({ text: 'Schedule quarterly PQC assessments to track migration progress', priority: 'Medium' });
                if (analytics.pqcReadyPct >= 50) recs.push({ text: 'Maintain current pace — organization is progressing well toward PQC compliance', priority: 'Info' });
                return recs.slice(0, 4).map((rec, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px',
                    borderRadius: 8, background: 'var(--bg-secondary)', fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5,
                  }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginTop: 2,
                      background: rec.priority === 'Critical' ? '#dc262615' : rec.priority === 'High' ? '#f9731615' : rec.priority === 'Medium' ? '#d9770615' : '#05966915',
                      color: rec.priority === 'Critical' ? '#dc2626' : rec.priority === 'High' ? '#f97316' : rec.priority === 'Medium' ? '#d97706' : '#059669',
                    }}>{rec.priority}</span>
                    {rec.text}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
