import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getScan, exportJSON, exportCSV } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Download, FileJson, FileSpreadsheet, RefreshCw, ExternalLink, CheckCircle, Clock, XCircle, Globe } from 'lucide-react';

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

export default function ScanResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);

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

  // Timer for running scans
  useEffect(() => {
    const isRunning = scan?.scan?.status === 'running' || scan?.scan?.status === 'pending';
    if (!isRunning) return;
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [scan?.scan?.status]);

  const handleExport = async (type) => {
    try {
      const res = type === 'json' ? await exportJSON(id) : await exportCSV(id);
      const blob = new Blob([type === 'json' ? JSON.stringify(res.data, null, 2) : res.data]);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cbom_${id}.${type}`;
      a.click();
    } catch (err) { console.error(err); }
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
        </div>
      </div>

      {/* Progress Section */}
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

      {/* Summary Stats */}
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

      {/* Results Table */}
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>CBOM Inventory</div>
        {records.length > 0 ? (
          <div className="table-container">
            <table>
              <thead><tr><th>Endpoint</th><th>TLS</th><th>Key Algorithm</th><th>Score</th><th>Quantum Label</th><th>Fixes</th><th></th></tr></thead>
              <tbody>
                {records.map((rec, i) => (
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
            <p>{isRunning ? 'Results will appear as targets are scanned...' : 'No results found'}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
