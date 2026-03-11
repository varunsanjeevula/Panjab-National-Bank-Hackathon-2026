import { useState, useEffect } from 'react';
import { getReportsList, exportJSON, exportCSV, exportPDF } from '../services/api';
import { motion } from 'framer-motion';
import { FileText, Download, FileJson, FileSpreadsheet, FileDown, Calendar, Target, Shield, ShieldCheck, ShieldX, TrendingUp, Clock, Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Reports() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, completed, running, failed
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      const { data } = await getReportsList();
      setScans(data);
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (scanId, format) => {
    try {
      toast.loading(`Generating ${format.toUpperCase()} report...`, { id: 'export' });
      const fn = format === 'json' ? exportJSON : format === 'csv' ? exportCSV : exportPDF;
      const res = await fn(scanId);
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cbom_${scanId}.${format === 'pdf' ? 'pdf' : format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report downloaded!`, { id: 'export' });
    } catch (err) {
      toast.error(`Failed to export ${format.toUpperCase()} report`, { id: 'export' });
    }
  };

  const filtered = scans.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const targetsMatch = s.targets?.some(t => (t.host || '').toLowerCase().includes(q));
      return targetsMatch || s.initiatedBy?.toLowerCase().includes(q);
    }
    return true;
  });

  const totalScans = scans.length;
  const totalTargets = scans.reduce((sum, s) => sum + s.targetCount, 0);
  const avgScore = scans.length > 0 ? Math.round(scans.reduce((sum, s) => sum + (s.avgScore || 0), 0) / scans.length) : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">View, filter, and export scan reports in JSON, CSV, and PDF formats</p>
      </div>

      {/* Summary Stats */}
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { icon: <FileText size={20} />, label: 'Total Reports', value: totalScans, color: '#3b82f6' },
          { icon: <Target size={20} />, label: 'Total Targets', value: totalTargets, color: '#8b5cf6' },
          { icon: <TrendingUp size={20} />, label: 'Avg Score', value: `${avgScore}/100`, color: avgScore >= 70 ? '#059669' : avgScore >= 40 ? '#d97706' : '#dc2626' },
          { icon: <ShieldCheck size={20} />, label: 'PQC Ready', value: scans.reduce((sum, s) => sum + s.pqcReady, 0), color: '#059669' },
        ].map((stat, i) => (
          <motion.div key={i} className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
            <Filter size={15} /> Filters:
          </div>
          {['all', 'completed', 'running', 'failed'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search targets..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, height: 34, fontSize: 13, width: 200 }} />
          </div>
        </div>
      </div>

      {/* Scan Reports List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" /> Loading reports...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          No reports found. Run a scan to generate reports.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((scan, idx) => (
            <motion.div key={scan._id} className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }} style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {/* Status Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: scan.status === 'completed' ? '#05966915' : scan.status === 'running' ? '#3b82f615' : '#dc262615',
                  color: scan.status === 'completed' ? '#059669' : scan.status === 'running' ? '#3b82f6' : '#dc2626'
                }}>
                  {scan.status === 'completed' ? <ShieldCheck size={20} /> : scan.status === 'running' ? <Clock size={20} /> : <ShieldX size={20} />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Scan #{scan._id.toString().slice(-6).toUpperCase()}
                    <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 8, padding: '2px 8px', borderRadius: 6,
                      background: scan.status === 'completed' ? '#05966915' : '#3b82f615',
                      color: scan.status === 'completed' ? '#059669' : '#3b82f6',
                      textTransform: 'capitalize'
                    }}>{scan.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span><Target size={12} style={{ verticalAlign: -2 }} /> {scan.targetCount} target(s)</span>
                    <span><Calendar size={12} style={{ verticalAlign: -2 }} /> {new Date(scan.createdAt).toLocaleDateString()}</span>
                    <span>By: {scan.initiatedBy}</span>
                  </div>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <div style={{
                    fontSize: 20, fontWeight: 700,
                    color: scan.avgScore >= 70 ? '#059669' : scan.avgScore >= 40 ? '#d97706' : '#dc2626'
                  }}>{scan.avgScore}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Avg Score</div>
                </div>

                {/* PQC Breakdown */}
                <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 6, background: '#05966915', color: '#059669' }}>
                    ✓ {scan.pqcReady}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: 6, background: '#d9770615', color: '#d97706' }}>
                    ◆ {scan.hybrid}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: 6, background: '#dc262615', color: '#dc2626' }}>
                    ✗ {scan.notReady}
                  </span>
                </div>

                {/* Export Buttons */}
                {scan.status === 'completed' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleExport(scan._id, 'json')}
                      title="Export JSON" style={{ padding: '6px 10px' }}>
                      <FileJson size={14} />
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleExport(scan._id, 'csv')}
                      title="Export CSV" style={{ padding: '6px 10px' }}>
                      <FileSpreadsheet size={14} />
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={() => handleExport(scan._id, 'pdf')}
                      title="Export PDF" style={{ padding: '6px 10px' }}>
                      <FileDown size={14} /> PDF
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
