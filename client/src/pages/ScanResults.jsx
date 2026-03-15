import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getScan, exportJSON, exportCSV, exportPDF } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, FileJson, FileSpreadsheet, ExternalLink, CheckCircle, Clock, Globe, Filter, Search, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

function QuantumBadge({ label }) {
  if (!label) return <span className="badge">Unknown</span>;
  if (label.includes('Fully Quantum Safe')) return <span className="badge badge-safe"><ShieldCheck size={13} /> {label}</span>;
  if (label.includes('Hybrid')) return <span className="badge badge-hybrid"><ShieldAlert size={13} /> {label}</span>;
  if (label.includes('Critical')) return <span className="badge badge-critical"><ShieldX size={13} /> {label}</span>;
  return <span className="badge badge-vulnerable"><ShieldX size={13} /> {label}</span>;
}

function getScoreColor(score) {
  if (score == null) return 'var(--text-muted)';
  if (score >= 80) return '#059669';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

const LABEL_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'safe', label: 'PQC Ready' },
  { key: 'hybrid', label: 'Hybrid' },
  { key: 'vulnerable', label: 'Not Ready' },
  { key: 'critical', label: 'Critical' },
];

export default function ScanResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const [scan, setScan] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [labelFilter, setLabelFilter] = useState('all');
  const [tlsFilter, setTlsFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadScan = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getScan(id);
      setScan(res.data);
      setRecords(res.data.cbomRecords || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    loadScan();
    const interval = setInterval(() => loadScan(true), 3000);
    return () => clearInterval(interval);
  }, [loadScan]);

  useEffect(() => {
    const isRunning = scan?.scan?.status === 'running' || scan?.scan?.status === 'pending';
    if (!isRunning) return;
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [scan?.scan?.status]);

  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const label = rec.quantumAssessment?.label || '';
      if (labelFilter === 'safe' && !label.includes('Fully Quantum Safe')) return false;
      if (labelFilter === 'hybrid' && !label.includes('Hybrid')) return false;
      if (labelFilter === 'vulnerable' && label !== 'Not PQC Ready') return false;
      if (labelFilter === 'critical' && !label.includes('Critical')) return false;
      if (tlsFilter !== 'all' && rec.tlsVersions?.bestVersion !== tlsFilter) return false;
      if (searchTerm && !rec.host.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [records, labelFilter, tlsFilter, searchTerm]);

  const tlsVersions = useMemo(() => {
    const versions = new Set(records.map(r => r.tlsVersions?.bestVersion).filter(Boolean));
    return ['all', ...versions];
  }, [records]);

  const handleExport = async (type) => {
    if (isViewer) {
      return toast.error('You don\'t have permission to export reports. Contact your admin for access.', { id: 'export' });
    }
    try {
      toast.loading(`Exporting ${type.toUpperCase()}...`, { id: 'export' });
      const res = type === 'json' ? await exportJSON(id) : type === 'csv' ? await exportCSV(id) : await exportPDF(id);
      const blob = new Blob([res.data]);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cbom_${id}.${type === 'pdf' ? 'pdf' : type}`;
      a.click();
      toast.success(`${type.toUpperCase()} exported!`, { id: 'export' });
    } catch (err) {
      const msg = err?.response?.status === 403
        ? 'You don\'t have permission to export reports'
        : 'Export failed';
      toast.error(msg, { id: 'export' });
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /><p>Loading scan results...</p></div>;

  const scanData = scan?.scan;
  const isRunning = scanData?.status === 'running' || scanData?.status === 'pending';
  const progress = scanData?.progress;
  const pct = progress ? Math.round(((progress.completed + progress.failed) / progress.total) * 100) : 0;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Scan Results</h1>
          <p className="page-subtitle">
            {scanData?.targets?.length || 0} target(s) · {scanData?.status} · {new Date(scanData?.createdAt).toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => handleExport('json')}><FileJson size={14} /> JSON</button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')}><FileSpreadsheet size={14} /> CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => handleExport('pdf')}><FileDown size={14} /> PDF</button>
        </div>
      </div>

      <AnimatePresence>
        {isRunning && (
          <motion.div className="card" style={{ marginBottom: 20 }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="spinner" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Scanning in progress</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                <span><Clock size={13} style={{ verticalAlign: -2 }} /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
                <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{progress?.completed + progress?.failed || 0} / {progress?.total || 0}</span>
              </div>
            </div>
            <div className="progress-bar">
              <motion.div className="progress-bar-fill" animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="scan-steps" style={{ gap: 8 }}>
                {(scanData?.targets || []).map((t, i) => {
                  const rec = records.find(r => r.host === t.host);
                  const isDone = !!rec;
                  const isCurrent = !isDone && i === (progress?.completed || 0);
                  return (
                    <motion.div key={i} className={`scan-step ${isDone ? 'completed' : isCurrent ? 'active' : ''}`}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <div className="scan-step-dot" />
                      <span className="scan-step-label" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{t.host}:{t.port}</span>
                      {isDone && <CheckCircle size={16} style={{ marginLeft: 'auto', color: 'var(--color-success)' }} />}
                      {isCurrent && <div className="spinner" style={{ marginLeft: 'auto', width: 14, height: 14 }} />}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {scanData?.summary && !isRunning && (
        <div className="stats-grid">
          {[
            { label: 'Completed', value: scanData.summary.completedScans || 0, color: '#059669' },
            { label: 'Average Score', value: scanData.summary.averageScore || 0, color: '#2563eb', suffix: '/100' },
            { label: 'Failed', value: scanData.summary.failedScans || 0, color: scanData.summary.failedScans > 0 ? '#dc2626' : '#059669' },
          ].map((s, i) => (
            <motion.div className="stat-card" key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-value" style={{ color: s.color }}>{s.value}{s.suffix && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}>{s.suffix}</span>}</div>
            </motion.div>
          ))}
        </div>
      )}

      {records.length > 0 && !isRunning && (
        <motion.div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {LABEL_FILTERS.map(f => (
              <button key={f.key} className={`btn btn-sm ${labelFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setLabelFilter(f.key)} style={{ fontSize: 12 }}>
                {f.label}
              </button>
            ))}
          </div>
          <select className="input" value={tlsFilter} onChange={e => setTlsFilter(e.target.value)}
            style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }}>
            <option value="all">All TLS</option>
            {tlsVersions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Search host..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 30, width: 180, fontSize: 12 }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filteredRecords.length}/{records.length} shown</span>
        </motion.div>
      )}

      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>CBOM Inventory</div>
        {filteredRecords.length > 0 ? (
          <div className="table-container">
            <table>
              <thead><tr><th>Endpoint</th><th>TLS</th><th>Key Algorithm</th><th>Score</th><th>Quantum Label</th><th>Fixes</th><th></th></tr></thead>
              <tbody>
                {filteredRecords.map((rec, i) => (
                  <motion.tr key={rec._id} className="clickable-row" onClick={() => navigate(`/asset/${rec._id}`)}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Globe size={15} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{rec.host}:{rec.port}</span>
                      </div>
                    </td>
                    <td><span className="chip">{rec.tlsVersions?.bestVersion || '—'}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                      {rec.certificate?.keyAlgorithm || '—'} {rec.certificate?.keySize ? `(${rec.certificate.keySize})` : ''}
                    </td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16, color: getScoreColor(rec.quantumAssessment?.score?.score) }}>{rec.quantumAssessment?.score?.score ?? '—'}</span></td>
                    <td><QuantumBadge label={rec.quantumAssessment?.label} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{rec.recommendations?.length || 0}</td>
                    <td><ExternalLink size={14} style={{ color: 'var(--text-muted)' }} /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Shield size={44} />
            <p>{isRunning ? 'Results will appear as targets are scanned...' : records.length > 0 ? 'No results match your filters' : 'No results found'}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
