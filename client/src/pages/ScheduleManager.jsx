import { useState, useEffect } from 'react';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, triggerSchedule } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Plus, Play, Pause, Trash2, Calendar, Target, RefreshCw, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', desc: 'Every day at the specified time' },
  { value: 'weekly', label: 'Weekly', desc: 'Every Monday at the specified time' },
  { value: 'monthly', label: 'Monthly', desc: '1st of every month' },
];

export default function ScheduleManager() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', targets: '', frequency: 'weekly', time: '02:00' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadSchedules(); }, []);

  const loadSchedules = async () => {
    try {
      const res = await getSchedules();
      setSchedules(res.data);
    } catch { toast.error('Failed to load schedules'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.targets.trim()) return toast.error('Name and targets required');
    setSubmitting(true);
    try {
      const targets = form.targets.split(/[,\n]+/).map(t => t.trim()).filter(Boolean).map(t => {
        const [host, port] = t.split(':');
        return { host, port: parseInt(port) || 443 };
      });
      await createSchedule({ name: form.name, targets, frequency: form.frequency, time: form.time });
      toast.success('Schedule created');
      setShowModal(false);
      setForm({ name: '', targets: '', frequency: 'weekly', time: '02:00' });
      loadSchedules();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create schedule'); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (id, enabled) => {
    try {
      await updateSchedule(id, { enabled: !enabled });
      toast.success(enabled ? 'Schedule paused' : 'Schedule enabled');
      loadSchedules();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await deleteSchedule(id);
      toast.success('Schedule deleted');
      loadSchedules();
    } catch { toast.error('Failed to delete'); }
  };

  const handleTrigger = async (id) => {
    try {
      await triggerSchedule(id);
      toast.success('Scan triggered! Check Scan History for results.');
    } catch { toast.error('Failed to trigger scan'); }
  };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /><p>Loading schedules...</p></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Scan Scheduling</h1>
          <p className="page-subtitle">Automate recurring quantum-readiness scans</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="empty-state">
            <Calendar size={48} />
            <p>No scheduled scans yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Create a schedule to automate recurring scans</p>
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {schedules.map((s, i) => (
            <motion.div className="card" key={s._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: s.enabled ? 1 : 0.6 }}>
              
              <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: s.enabled ? 'rgba(37, 99, 235, 0.1)' : 'rgba(148, 163, 184, 0.1)', color: s.enabled ? '#2563eb' : '#94a3b8' }}>
                <Clock size={22} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span><Target size={11} /> {s.targets?.length} target{s.targets?.length !== 1 ? 's' : ''}</span>
                  <span><Calendar size={11} /> {s.frequency}</span>
                  <span><RefreshCw size={11} /> {s.runCount} run{s.runCount !== 1 ? 's' : ''}</span>
                  {s.lastRun && <span>Last: {new Date(s.lastRun).toLocaleDateString()}</span>}
                  {s.nextRun && <span>Next: {new Date(s.nextRun).toLocaleDateString()}</span>}
                </div>
              </div>

              <span className={`badge ${s.enabled ? 'badge-safe' : 'badge-vulnerable'}`}>
                {s.enabled ? 'Active' : 'Paused'}
              </span>

              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleTrigger(s._id)} title="Run now">
                  <Play size={14} />
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleToggle(s._id, s.enabled)} title={s.enabled ? 'Pause' : 'Enable'}>
                  {s.enabled ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(s._id)} title="Delete"
                  style={{ color: 'var(--color-danger)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setShowModal(false)}>
            <motion.div className="card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()} style={{ width: 480, maxHeight: '90vh', overflow: 'auto' }}>
              <div className="card-header" style={{ marginBottom: 16 }}>
                <div className="card-title">Create Schedule</div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}><X size={14} /></button>
              </div>

              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'block' }}>Schedule Name</label>
                  <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="e.g., Weekly TLS Audit" required />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'block' }}>Targets</label>
                  <textarea className="input" rows={4} value={form.targets} onChange={e => setForm({...form, targets: e.target.value})}
                    placeholder="One per line: google.com, github.com:443" required style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'block' }}>Frequency</label>
                    <select className="input" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>
                      {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'block' }}>Time (24h)</label>
                    <input className="input" type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
                </div>

                <div className="card" style={{ background: 'rgba(37, 99, 235, 0.04)', padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <AlertCircle size={13} style={{ display: 'inline', verticalAlign: -2 }} /> {FREQUENCY_OPTIONS.find(o => o.value === form.frequency)?.desc}
                </div>

                <button className="btn btn-primary" type="submit" disabled={submitting}
                  style={{ width: '100%' }}>
                  {submitting ? <><div className="spinner" /> Creating...</> : <><Calendar size={14} /> Create Schedule</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
