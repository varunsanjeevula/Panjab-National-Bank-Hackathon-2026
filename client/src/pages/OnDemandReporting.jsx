import { useState, useEffect } from 'react';
import { getReportsList, exportJSON, exportCSV, exportPDF } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { FileText, FileJson, FileSpreadsheet, FileDown, Calendar, Target, Shield, ShieldCheck, ShieldX, TrendingUp, Clock, Filter, Search, Download, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OnDemandReporting() {
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedScans, setSelectedScans] = useState(new Set());
  const [bulkFormat, setBulkFormat] = useState('pdf');
  const [exporting, setExporting] = useState(null);

  useEffect(() => { loadScans(); }, []);

  const loadScans = async () => {
    try {
      const { data } = await getReportsList();
      setScans(data);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  const handleExport = async (scanId, format) => {
    if (isViewer) {
      return toast.error('You don\'t have permission to export reports. Contact your admin for access.', { id: 'export' });
    }
    try {
      setExporting(`${scanId}-${format}`);
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
    } catch {
      toast.error(`Failed to export ${format.toUpperCase()} report`, { id: 'export' });
    } finally { setExporting(null); }
  };

  const handleBulkExport = async () => {
    if (selectedScans.size === 0) return toast.error('Select at least one scan');
    for (const scanId of selectedScans) {
      await handleExport(scanId, bulkFormat);
    }
    setSelectedScans(new Set());
    toast.success(`Exported ${selectedScans.size} report(s)`);
  };

  const toggleSelect = (scanId) => {
    setSelectedScans(prev => {
      const next = new Set(prev);
      if (next.has(scanId)) next.delete(scanId); else next.add(scanId);
      return next;
    });
  };

  const selectAll = () => {
    const completedIds = filtered.filter(s => s.status === 'completed').map(s => s._id);
    if (selectedScans.size === completedIds.length) setSelectedScans(new Set());
    else setSelectedScans(new Set(completedIds));
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
  const pqcReady = scans.reduce((sum, s) => sum + (s.pqcReady || 0), 0);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div className="spinner spinner-lg" style={{ marginBottom: 12 }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading reports...</p>
    </div>
  );

  return (
    <div>
      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { icon: <FileText size={18} />, label: 'Total Reports', value: totalScans, color: '#3b82f6' },
          { icon: <Target size={18} />, label: 'Total Targets', value: totalTargets, color: '#8b5cf6' },
          { icon: <TrendingUp size={18} />, label: 'Avg Score', value: `${avgScore}/100`, color: avgScore >= 70 ? '#059669' : avgScore >= 40 ? '#d97706' : '#dc2626' },
          { icon: <ShieldCheck size={18} />, label: 'PQC Ready', value: pqcReady, color: '#059669' },
        ].map((stat, i) => (
          <motion.div key={i} className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters & Bulk Actions */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 18px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13 }}>
            <Filter size={14} /> Filter:
          </div>
          {['all', 'completed', 'running', 'failed'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)} style={{ textTransform: 'capitalize', fontSize: 12 }}>
              {f}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search targets..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30, height: 32, fontSize: 12, width: 180 }} />
          </div>
        </div>
      </div>

      {/* Bulk export bar */}
      {filtered.some(s => s.status === 'completed') && (
        <div className="card" style={{ marginBottom: 16, padding: '10px 18px', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
            <button className="btn btn-sm btn-secondary" onClick={selectAll} style={{ fontSize: 12 }}>
              {selectedScans.size === filtered.filter(s => s.status === 'completed').length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedScans.size > 0 && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>{selectedScans.size} selected</span>
                <select className="form-input" value={bulkFormat} onChange={e => setBulkFormat(e.target.value)}
                  style={{ height: 30, fontSize: 12, width: 80, padding: '0 8px' }}>
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
                <button className="btn btn-sm btn-primary" onClick={handleBulkExport}>
                  <Download size={13} /> Bulk Export
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reports List */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
          <Zap size={44} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>No reports found</p>
          <p style={{ fontSize: 13 }}>Run a scan to generate reports, or adjust your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((scan, idx) => (
            <motion.div key={scan._id} className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }} style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {/* Checkbox for completed */}
                {scan.status === 'completed' && (
                  <input type="checkbox" checked={selectedScans.has(scan._id)}
                    onChange={() => toggleSelect(scan._id)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#2563eb' }} />
                )}

                {/* Status Icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: scan.status === 'completed' ? '#05966915' : scan.status === 'running' ? '#3b82f615' : '#dc262615',
                  color: scan.status === 'completed' ? '#059669' : scan.status === 'running' ? '#3b82f6' : '#dc2626'
                }}>
                  {scan.status === 'completed' ? <ShieldCheck size={18} /> : scan.status === 'running' ? <Clock size={18} /> : <ShieldX size={18} />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 3 }}>
                    Scan #{scan._id.toString().slice(-6).toUpperCase()}
                    <span style={{
                      fontSize: 10, fontWeight: 500, marginLeft: 8, padding: '2px 8px', borderRadius: 6,
                      background: scan.status === 'completed' ? '#05966915' : scan.status === 'running' ? '#3b82f615' : '#dc262615',
                      color: scan.status === 'completed' ? '#059669' : scan.status === 'running' ? '#3b82f6' : '#dc2626',
                      textTransform: 'capitalize'
                    }}>{scan.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span><Target size={11} style={{ verticalAlign: -1 }} /> {scan.targetCount} target(s)</span>
                    <span><Calendar size={11} style={{ verticalAlign: -1 }} /> {new Date(scan.createdAt).toLocaleDateString()}</span>
                    <span>By: {scan.initiatedBy}</span>
                  </div>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'center', minWidth: 55 }}>
                  <div style={{
                    fontSize: 18, fontWeight: 700,
                    color: scan.avgScore >= 70 ? '#059669' : scan.avgScore >= 40 ? '#d97706' : '#dc2626'
                  }}>{scan.avgScore}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Avg Score</div>
                </div>

                {/* PQC Breakdown */}
                <div style={{ display: 'flex', gap: 6, fontSize: 10 }}>
                  <span style={{ padding: '2px 7px', borderRadius: 6, background: '#05966915', color: '#059669' }}>
                    ✓ {scan.pqcReady}
                  </span>
                  <span style={{ padding: '2px 7px', borderRadius: 6, background: '#d9770615', color: '#d97706' }}>
                    ◆ {scan.hybrid}
                  </span>
                  <span style={{ padding: '2px 7px', borderRadius: 6, background: '#dc262615', color: '#dc2626' }}>
                    ✗ {scan.notReady}
                  </span>
                </div>

                {/* Export Buttons */}
                {scan.status === 'completed' && (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleExport(scan._id, 'json')}
                      disabled={exporting === `${scan._id}-json`} title="Export JSON" style={{ padding: '5px 9px' }}>
                      <FileJson size={13} />
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleExport(scan._id, 'csv')}
                      disabled={exporting === `${scan._id}-csv`} title="Export CSV" style={{ padding: '5px 9px' }}>
                      <FileSpreadsheet size={13} />
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={() => handleExport(scan._id, 'pdf')}
                      disabled={exporting === `${scan._id}-pdf`} title="Export PDF" style={{ padding: '5px 9px' }}>
                      <FileDown size={13} /> PDF
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
