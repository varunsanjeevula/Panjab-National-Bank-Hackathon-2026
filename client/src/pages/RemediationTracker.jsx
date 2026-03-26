import { useState, useEffect } from 'react';
import { getScans, getCbomRecords } from '../services/api';
import { motion } from 'framer-motion';
import { ListChecks, CheckCircle2, Clock, AlertTriangle, Pause, ArrowRight, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'var(--color-danger)', bg: 'var(--color-danger-bg)', icon: AlertTriangle },
  { value: 'in-progress', label: 'In Progress', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', icon: Clock },
  { value: 'completed', label: 'Completed', color: 'var(--color-success)', bg: 'var(--color-success-bg)', icon: CheckCircle2 },
  { value: 'deferred', label: 'Deferred', color: 'var(--text-muted)', bg: 'var(--bg-input)', icon: Pause },
];

export default function RemediationTracker() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      // Load recommendations from latest scan
      const scansRes = await getScans();
      const completed = scansRes.data.filter(s => s.status === 'completed');
      if (completed.length === 0) { setLoading(false); return; }

      const cbomRes = await getCbomRecords(completed[0]._id);
      const assets = cbomRes.data.filter(r => r.status === 'completed');

      // Generate remediation items from recommendations
      const saved = JSON.parse(localStorage.getItem('qs_remediation') || '{}');
      const remItems = [];
      assets.forEach(asset => {
        (asset.recommendations || []).forEach((rec, idx) => {
          const id = `${asset._id}-${idx}`;
          remItems.push({
            id,
            host: asset.host,
            port: asset.port,
            score: asset.quantumAssessment?.score?.score ?? 0,
            label: asset.quantumAssessment?.label || 'Unknown',
            title: rec.title || rec.recommendation || `Recommendation ${idx + 1}`,
            description: rec.description || rec.action || rec.details || '',
            severity: rec.severity || rec.priority || 'Medium',
            status: saved[id] || 'pending',
          });
        });
      });
      setItems(remItems);
    } catch { toast.error('Failed to load remediation data'); }
    setLoading(false);
  };

  const updateStatus = (itemId, newStatus) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, status: newStatus } : item
    ));
    // Persist to localStorage
    const saved = JSON.parse(localStorage.getItem('qs_remediation') || '{}');
    saved[itemId] = newStatus;
    localStorage.setItem('qs_remediation', JSON.stringify(saved));
    toast.success(`Status updated to ${newStatus}`);
  };

  const filteredItems = filter === 'all' ? items : items.filter(i => i.status === filter);
  const stats = {
    pending: items.filter(i => i.status === 'pending').length,
    'in-progress': items.filter(i => i.status === 'in-progress').length,
    completed: items.filter(i => i.status === 'completed').length,
    deferred: items.filter(i => i.status === 'deferred').length,
  };
  const completionPct = items.length > 0 ? Math.round((stats.completed / items.length) * 100) : 0;

  if (loading) return (
    <div>
      <div className="page-header"><div className="skeleton skeleton-title" /></div>
      <div className="stats-grid">{[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-card" />)}</div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Remediation Tracker</h1>
        <p className="page-subtitle">Track the implementation status of security recommendations</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {STATUS_OPTIONS.map((opt, i) => (
          <motion.div className="stat-card" key={opt.value} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => setFilter(filter === opt.value ? 'all' : opt.value)}
            style={{ cursor: 'pointer', borderLeft: `3px solid ${opt.color}`, background: filter === opt.value ? opt.bg : undefined }}>
            <div className="stat-card-label">{opt.label}</div>
            <div className="stat-card-value" style={{ color: opt.color }}>{stats[opt.value]}</div>
          </motion.div>
        ))}
      </div>

      {/* Progress Bar */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Overall Remediation Progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>{completionPct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${completionPct}%`, background: 'var(--color-success)' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {stats.completed} of {items.length} recommendations implemented
          </div>
        </div>
      </motion.div>

      {/* Filter indicator */}
      {filter !== 'all' && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing: <strong style={{ color: 'var(--text-primary)' }}>{filter}</strong> ({filteredItems.length} items)
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => setFilter('all')} style={{ padding: '2px 8px', fontSize: 11 }}>Clear</button>
        </div>
      )}

      {/* Items */}
      {filteredItems.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredItems.map((item, i) => {
            const statusOpt = STATUS_OPTIONS.find(o => o.value === item.status) || STATUS_OPTIONS[0];
            const StatusIcon = statusOpt.icon;
            return (
              <motion.div key={item.id} className="rec-card" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                style={{ borderLeftColor: statusOpt.color }}>
                <div className="rec-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusIcon size={16} style={{ color: statusOpt.color }} />
                    <span className="rec-card-title">{item.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`badge ${item.severity === 'Critical' ? 'badge-critical' : item.severity === 'High' ? 'badge-vulnerable' : item.severity === 'Medium' ? 'badge-hybrid' : 'badge-safe'}`} style={{ fontSize: 10 }}>
                      {item.severity}
                    </span>
                    <span className="chip" style={{ fontSize: 10 }}>{item.host}:{item.port}</span>
                  </div>
                </div>
                {item.description && <div className="rec-card-body">{item.description}</div>}
                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt.value} className={`btn btn-sm ${item.status === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updateStatus(item.id, opt.value)}
                      style={{ padding: '4px 10px', fontSize: 11 }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="card empty-state">
          <ListChecks size={44} />
          <p>{items.length === 0 ? 'No recommendations found. Run a scan to get started.' : 'No items match the current filter.'}</p>
        </div>
      )}
    </div>
  );
}
