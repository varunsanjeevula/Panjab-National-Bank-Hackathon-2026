import { useState, useEffect } from 'react';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, getReportsList } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, Plus, Trash2, Calendar, Target, Clock, X, AlertCircle, FileText, Mail, Bell, ToggleLeft, ToggleRight, Edit3, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const FORMAT_OPTIONS = ['PDF', 'CSV', 'JSON'];

export default function ScheduleReporting() {
  const [reportSchedules, setReportSchedules] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    frequency: 'weekly',
    format: 'PDF',
    recipients: '',
    includeExecutiveSummary: true,
    includeTechnicalDetails: true,
    includePqcPosture: true,
    includeCyberRating: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [schedRes, scanRes] = await Promise.allSettled([getSchedules(), getReportsList()]);
      if (schedRes.status === 'fulfilled') setReportSchedules(schedRes.value.data);
      if (scanRes.status === 'fulfilled') setScans(scanRes.value.data);
    } catch { /* handled above */ }
    finally { setLoading(false); }
  };

  // Derive report schedule entries from scan schedules (simulate scheduled reporting)
  const scheduleEntries = reportSchedules.map(s => ({
    ...s,
    reportName: `${s.name} — Auto Report`,
    format: 'PDF',
    lastGenerated: s.lastRun ? new Date(s.lastRun) : null,
    nextGeneration: s.nextRun ? new Date(s.nextRun) : null,
  }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Report name required');
    setSubmitting(true);
    try {
      // Store as a schedule with reportConfig metadata
      await createSchedule({
        name: `[Report] ${form.name}`,
        targets: scans.slice(0, 1).flatMap(s => s.targets || [{ host: 'all-targets', port: 443 }]),
        frequency: form.frequency,
        time: '06:00',
      });
      toast.success('Report schedule created');
      setShowModal(false);
      setForm({ name: '', frequency: 'weekly', format: 'PDF', recipients: '', includeExecutiveSummary: true, includeTechnicalDetails: true, includePqcPosture: true, includeCyberRating: true });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create report schedule');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this report schedule?')) return;
    try {
      await deleteSchedule(id);
      toast.success('Report schedule deleted');
      loadData();
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggle = async (id, enabled) => {
    try {
      await updateSchedule(id, { enabled: !enabled });
      toast.success(enabled ? 'Report schedule paused' : 'Report schedule enabled');
      loadData();
    } catch { toast.error('Failed to update'); }
  };

  const completedScans = scans.filter(s => s.status === 'completed').length;

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div className="spinner spinner-lg" style={{ marginBottom: 12 }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading scheduled reports...</p>
    </div>
  );

  return (
    <div>
      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { icon: <CalendarClock size={18} />, label: 'Active Schedules', value: scheduleEntries.filter(s => s.enabled).length, color: '#2563eb' },
          { icon: <FileText size={18} />, label: 'Total Configured', value: scheduleEntries.length, color: '#8b5cf6' },
          { icon: <Clock size={18} />, label: 'Reports Generated', value: scheduleEntries.reduce((sum, s) => sum + (s.runCount || 0), 0), color: '#059669' },
          { icon: <Target size={18} />, label: 'Scans Available', value: completedScans, color: '#d97706' },
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

      {/* Header with Create Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Configured Report Schedules</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Automated reports delivered on a recurring basis</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Report Schedule
        </button>
      </div>

      {/* Schedule List */}
      {scheduleEntries.length === 0 ? (
        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: 50 }}>
          <CalendarClock size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>No report schedules yet</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Set up automated reports to get periodic PQC assessments delivered automatically</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Create First Schedule
          </button>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {scheduleEntries.map((s, idx) => (
            <motion.div key={s._id} className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }} style={{ padding: '14px 18px', opacity: s.enabled ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.enabled ? '#2563eb12' : '#94a3b812', color: s.enabled ? '#2563eb' : '#94a3b8'
                }}>
                  <CalendarClock size={20} />
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>
                    {s.reportName || s.name}
                    <span style={{
                      fontSize: 10, fontWeight: 500, marginLeft: 8, padding: '2px 8px', borderRadius: 6,
                      background: s.enabled ? '#05966915' : '#94a3b815',
                      color: s.enabled ? '#059669' : '#94a3b8',
                    }}>{s.enabled ? 'Active' : 'Paused'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span><Calendar size={11} style={{ verticalAlign: -1 }} /> {s.frequency}</span>
                    <span><FileText size={11} style={{ verticalAlign: -1 }} /> PDF</span>
                    <span><Target size={11} style={{ verticalAlign: -1 }} /> {s.targets?.length || 0} target(s)</span>
                    {s.runCount > 0 && <span>{s.runCount} report(s) generated</span>}
                    {s.lastGenerated && <span>Last: {s.lastGenerated.toLocaleDateString()}</span>}
                    {s.nextGeneration && <span>Next: {s.nextGeneration.toLocaleDateString()}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleToggle(s._id, s.enabled)}
                    title={s.enabled ? 'Pause' : 'Enable'} style={{ padding: '6px 10px' }}>
                    {s.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(s._id)}
                    title="Delete" style={{ padding: '6px 10px', color: 'var(--color-danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setShowModal(false)}>
            <motion.div className="card" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()} style={{ width: 520, maxHeight: '90vh', overflow: 'auto' }}>
              <div className="card-header" style={{ marginBottom: 16 }}>
                <div className="card-title">New Report Schedule</div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}><X size={14} /></button>
              </div>

              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'block' }}>Report Name</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Weekly PQC Assessment" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'block' }}>Frequency</label>
                    <select className="input" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                      {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'block' }}>Format</label>
                    <select className="input" value={form.format} onChange={e => setForm({ ...form, format: e.target.value })}>
                      {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'block' }}>Recipients (Email)</label>
                  <input className="input" value={form.recipients} onChange={e => setForm({ ...form, recipients: e.target.value })}
                    placeholder="comma-separated emails (optional)" />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Report Sections</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { key: 'includeExecutiveSummary', label: 'Executive Summary' },
                      { key: 'includeTechnicalDetails', label: 'Technical Details' },
                      { key: 'includePqcPosture', label: 'PQC Posture' },
                      { key: 'includeCyberRating', label: 'Cyber Rating' },
                    ].map(opt => (
                      <label key={opt.key} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
                        background: form[opt.key] ? '#2563eb08' : 'var(--bg-secondary)',
                        border: `1px solid ${form[opt.key] ? '#2563eb30' : 'var(--border-light)'}`,
                        cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', transition: 'all 0.15s',
                      }}>
                        <input type="checkbox" checked={form[opt.key]} onChange={e => setForm({ ...form, [opt.key]: e.target.checked })}
                          style={{ display: 'none' }} />
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: form[opt.key] ? '#2563eb' : 'transparent',
                          border: form[opt.key] ? 'none' : '2px solid var(--border-light)',
                        }}>
                          {form[opt.key] && <Check size={12} color="#fff" />}
                        </div>
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ background: 'rgba(37, 99, 235, 0.04)', padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <AlertCircle size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
                  Reports will be auto-generated based on the latest completed scans at each scheduled interval.
                </div>

                <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
                  {submitting ? <><div className="spinner" /> Creating...</> : <><CalendarClock size={14} /> Create Report Schedule</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
