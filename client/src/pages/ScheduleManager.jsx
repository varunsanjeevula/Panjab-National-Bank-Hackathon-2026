import { useState, useEffect } from 'react';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, triggerSchedule } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Plus, Play, Pause, Trash2, Calendar, Target, RefreshCw, X, AlertCircle,
  CalendarClock, Zap, Shield, BarChart3, TrendingUp, ChevronRight, Check, Globe, Server
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ───── Constants ──────────────────────────────────────────── */
const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', icon: <Clock size={14} />, desc: 'Every day at the specified time' },
  { value: 'weekly', label: 'Weekly', icon: <Calendar size={14} />, desc: 'Every Monday at the specified time' },
  { value: 'monthly', label: 'Monthly', icon: <CalendarClock size={14} />, desc: '1st of every month' },
];

const ACCENT_COLORS = ['#2563eb', '#7c3aed', '#059669', '#f59e0b', '#ec4899'];

/* ───── Styles (solid opaque colors) ───────────────────────── */
const styles = {
  /* Stat Cards */
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 },
  statCard: (gradient) => ({
    padding: '18px 20px', borderRadius: 14, background: gradient,
    display: 'flex', alignItems: 'center', gap: 14, color: '#fff',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  }),
  statIcon: { width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: 11, fontWeight: 500, opacity: 0.85, marginTop: 3 },

  /* Schedule Cards */
  scheduleCard: (enabled) => ({
    display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 14,
    background: 'var(--bg-primary)', border: '1px solid var(--border-light)',
    opacity: enabled ? 1 : 0.65, transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden',
  }),
  scheduleAccent: (enabled, idx = 0) => ({
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    background: enabled ? ACCENT_COLORS[idx % ACCENT_COLORS.length] : '#94a3b8',
    borderRadius: '4px 0 0 4px',
  }),
  badge: (active) => ({
    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: active ? '#05966615' : '#94a3b815',
    color: active ? '#059669' : '#94a3b8',
    display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
  }),
  metaTag: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
    background: 'var(--bg-secondary)', color: 'var(--text-muted)',
    border: '1px solid var(--border-light)',
  },
  actionBtn: (color = 'var(--text-muted)') => ({
    width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border-light)',
    background: 'var(--bg-primary)', color, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s ease', fontSize: 0,
  }),

  /* Modal — solid opaque */
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    width: 560, maxHeight: '92vh', overflow: 'auto', borderRadius: 20, padding: 0,
    background: '#ffffff', border: '1px solid #e5e7eb',
    boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    padding: '24px 28px 18px', borderBottom: '1px solid #e5e7eb',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    background: '#ffffff',
  },
  modalTitle: { fontSize: 20, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 },
  modalSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  modalBody: { padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 22, background: '#ffffff' },
  modalFooter: {
    padding: '16px 28px 24px', display: 'flex', gap: 10,
    borderTop: '1px solid #e5e7eb', background: '#f9fafb',
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8, border: '1px solid #d1d5db',
    background: '#f3f4f6', cursor: 'pointer', color: '#6b7280',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
  },
  fieldLabel: {
    fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: 0.4,
    marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
  },
  inputStyled: {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
    border: '1px solid #d1d5db', background: '#f9fafb',
    color: '#111827', outline: 'none', transition: 'all 0.2s',
    boxSizing: 'border-box',
  },
  textareaStyled: {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
    border: '1px solid #d1d5db', background: '#f9fafb',
    color: '#111827', outline: 'none', transition: 'all 0.2s',
    boxSizing: 'border-box', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    resize: 'vertical', minHeight: 90,
  },
  freqPill: (active) => ({
    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
    background: active ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : '#f3f4f6',
    color: active ? '#fff' : '#4b5563', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 4, fontSize: 12, fontWeight: active ? 600 : 500,
    transition: 'all 0.25s ease', border: active ? '1px solid transparent' : '1px solid #d1d5db',
    boxShadow: active ? '0 4px 14px rgba(37, 99, 235, 0.3)' : 'none',
  }),
  infoCard: {
    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
    borderRadius: 10, background: '#eef2ff',
    border: '1px solid #c7d2fe', fontSize: 12, color: '#374151', lineHeight: 1.5,
  },
  submitBtn: (disabled) => ({
    flex: 1, padding: '13px 20px', borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#d1d5db' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
    color: '#fff', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8, transition: 'all 0.25s ease',
    boxShadow: disabled ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.3)',
    opacity: disabled ? 0.6 : 1,
  }),
  cancelBtn: {
    padding: '13px 24px', borderRadius: 12, border: '1px solid #d1d5db',
    background: '#f3f4f6', color: '#374151', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.15s',
  },
  emptyState: {
    textAlign: 'center', padding: '60px 40px', borderRadius: 16,
    background: 'var(--bg-primary)', border: '1px dashed var(--border-light)',
  },
};

/* ───── Component ──────────────────────────────────────────── */
export default function ScheduleManager() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', targets: '', frequency: 'weekly', time: '02:00' });
  const [submitting, setSubmitting] = useState(false);
  const [triggeringId, setTriggeringId] = useState(null);

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
    setTriggeringId(id);
    try {
      await triggerSchedule(id);
      toast.success('Scan triggered! Check Scan History for results.');
    } catch { toast.error('Failed to trigger scan'); }
    finally { setTriggeringId(null); }
  };

  /* Stats */
  const activeCount = schedules.filter(s => s.enabled).length;
  const totalTargets = schedules.reduce((sum, s) => sum + (s.targets?.length || 0), 0);
  const totalRuns = schedules.reduce((sum, s) => sum + (s.runCount || 0), 0);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', flexDirection: 'column', gap: 12 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
        <RefreshCw size={24} style={{ color: '#2563eb' }} />
      </motion.div>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading schedules…</span>
    </div>
  );

  return (
    <div>
      {/* ── Page Header ───────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff',
            }}>
              <CalendarClock size={20} />
            </div>
            Scan Scheduling
          </h1>
          <p className="page-subtitle">Automate recurring quantum-readiness scans</p>
        </div>
        <motion.button className="btn btn-primary" onClick={() => setShowModal(true)}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13 }}>
          <Plus size={15} /> New Schedule
        </motion.button>
      </div>

      {/* ── Stat Cards ────────────────────────────────────── */}
      <div style={styles.statGrid}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          style={styles.statCard('linear-gradient(135deg, #2563eb, #1d4ed8)')}>
          <div style={styles.statIcon}><CalendarClock size={20} /></div>
          <div><div style={styles.statValue}>{schedules.length}</div><div style={styles.statLabel}>Total Schedules</div></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          style={styles.statCard('linear-gradient(135deg, #059669, #047857)')}>
          <div style={styles.statIcon}><Zap size={20} /></div>
          <div><div style={styles.statValue}>{activeCount}</div><div style={styles.statLabel}>Active Schedules</div></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          style={styles.statCard('linear-gradient(135deg, #7c3aed, #6d28d9)')}>
          <div style={styles.statIcon}><Target size={20} /></div>
          <div><div style={styles.statValue}>{totalTargets}</div><div style={styles.statLabel}>Monitored Targets</div></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          style={styles.statCard('linear-gradient(135deg, #f59e0b, #d97706)')}>
          <div style={styles.statIcon}><TrendingUp size={20} /></div>
          <div><div style={styles.statValue}>{totalRuns}</div><div style={styles.statLabel}>Total Scan Runs</div></div>
        </motion.div>
      </div>

      {/* ── Schedule List ──────────────────────────────────── */}
      {schedules.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={styles.emptyState}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #2563eb10, #7c3aed10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CalendarClock size={28} style={{ color: '#2563eb' }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No scan schedules yet</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
            Set up automated PQC scans to continuously monitor your cryptographic infrastructure.
          </p>
          <motion.button className="btn btn-primary" onClick={() => setShowModal(true)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ padding: '11px 24px', borderRadius: 10, fontWeight: 600 }}>
            <Plus size={15} /> Create First Schedule
          </motion.button>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {schedules.map((s, idx) => (
            <motion.div key={s._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }} style={styles.scheduleCard(s.enabled)}>
              <div style={styles.scheduleAccent(s.enabled, idx)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 8 }}>
                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.enabled
                    ? `linear-gradient(135deg, ${ACCENT_COLORS[idx % ACCENT_COLORS.length]}15, ${ACCENT_COLORS[idx % ACCENT_COLORS.length]}08)`
                    : 'rgba(148, 163, 184, 0.1)',
                  color: s.enabled ? ACCENT_COLORS[idx % ACCENT_COLORS.length] : '#94a3b8', flexShrink: 0,
                }}>
                  <Clock size={22} />
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{s.name}</span>
                    <span style={styles.badge(s.enabled)}>
                      {s.enabled ? <><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} /> Active</> : 'Paused'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={styles.metaTag}><Target size={11} /> {s.targets?.length || 0} target{s.targets?.length !== 1 ? 's' : ''}</span>
                    <span style={styles.metaTag}><Calendar size={11} /> {s.frequency}</span>
                    <span style={styles.metaTag}><RefreshCw size={11} /> {s.runCount || 0} run{(s.runCount || 0) !== 1 ? 's' : ''}</span>
                    {s.lastRun && <span style={styles.metaTag}><Clock size={11} /> Last: {new Date(s.lastRun).toLocaleDateString()}</span>}
                    {s.nextRun && <span style={styles.metaTag}><CalendarClock size={11} /> Next: {new Date(s.nextRun).toLocaleDateString()}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                    style={styles.actionBtn('#059669')}
                    onClick={() => handleTrigger(s._id)} title="Run Now"
                    disabled={triggeringId === s._id}>
                    {triggeringId === s._id ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                    style={styles.actionBtn(s.enabled ? '#2563eb' : '#94a3b8')}
                    onClick={() => handleToggle(s._id, s.enabled)} title={s.enabled ? 'Pause' : 'Activate'}>
                    {s.enabled ? <Pause size={14} /> : <Play size={14} />}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                    style={styles.actionBtn('#ef4444')}
                    onClick={() => handleDelete(s._id)} title="Delete">
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Create Schedule Modal ─────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={styles.overlay} onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              style={styles.modal} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={styles.modalHeader}>
                <div>
                  <div style={styles.modalTitle}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff',
                    }}>
                      <CalendarClock size={18} />
                    </div>
                    New Scan Schedule
                  </div>
                  <div style={styles.modalSubtitle}>Configure automated PQC readiness scans</div>
                </div>
                <button style={styles.closeBtn} onClick={() => setShowModal(false)}>
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreate}>
                <div style={styles.modalBody}>
                  {/* Schedule Name */}
                  <div>
                    <label style={styles.fieldLabel}><Shield size={13} /> Schedule Name</label>
                    <input style={styles.inputStyled} value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Weekly TLS Audit" required
                      onFocus={e => e.target.style.borderColor = '#2563eb'}
                      onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                  </div>

                  {/* Targets */}
                  <div>
                    <label style={styles.fieldLabel}><Globe size={13} /> Scan Targets</label>
                    <textarea style={styles.textareaStyled} rows={4} value={form.targets}
                      onChange={e => setForm({ ...form, targets: e.target.value })}
                      placeholder={"One target per line:\ngoogle.com\ngithub.com:443\nexample.com:8443"} required
                      onFocus={e => e.target.style.borderColor = '#2563eb'}
                      onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, paddingLeft: 2 }}>
                      Separate targets with commas or new lines. Default port: 443
                    </div>
                  </div>

                  {/* Frequency Pills */}
                  <div>
                    <label style={styles.fieldLabel}><Clock size={13} /> Frequency</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {FREQUENCY_OPTIONS.map(opt => (
                        <motion.button key={opt.value} type="button"
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                          style={styles.freqPill(form.frequency === opt.value)}
                          onClick={() => setForm({ ...form, frequency: opt.value })}>
                          {opt.icon}
                          <span>{opt.label}</span>
                        </motion.button>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, paddingLeft: 2 }}>
                      {FREQUENCY_OPTIONS.find(o => o.value === form.frequency)?.desc}
                    </div>
                  </div>

                  {/* Time Picker */}
                  <div>
                    <label style={styles.fieldLabel}><Clock size={13} /> Scan Time (24h)</label>
                    <input style={{ ...styles.inputStyled, maxWidth: 160 }} type="time" value={form.time}
                      onChange={e => setForm({ ...form, time: e.target.value })}
                      onFocus={e => e.target.style.borderColor = '#2563eb'}
                      onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                  </div>

                  {/* Info Banner */}
                  <div style={styles.infoCard}>
                    <AlertCircle size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
                    <span>
                      Scan will run automatically on each scheduled occurrence. Results appear in <strong>Scan History</strong>.
                      You can also manually trigger a scan from the schedule card.
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div style={styles.modalFooter}>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                  <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    style={styles.submitBtn(submitting || !form.name.trim() || !form.targets.trim())}
                    disabled={submitting || !form.name.trim() || !form.targets.trim()}>
                    {submitting ? <><RefreshCw size={15} className="spin" /> Creating…</> : <><CalendarClock size={15} /> Create Schedule</>}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
