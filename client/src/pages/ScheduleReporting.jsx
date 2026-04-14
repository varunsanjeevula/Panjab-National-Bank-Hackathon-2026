import { useState, useEffect } from 'react';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, getReportsList, sendReportEmail, getEmailStatus } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock, Plus, Trash2, Calendar, Target, Clock, X, AlertCircle,
  FileText, Mail, Bell, ToggleLeft, ToggleRight, Edit3, Check, Sparkles,
  ChevronRight, Zap, Shield, BarChart3, TrendingUp, Play, Pause,
  Download, Send, RefreshCw, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', icon: <Clock size={14} />, desc: 'Every day at 6:00 AM' },
  { value: 'weekly', label: 'Weekly', icon: <Calendar size={14} />, desc: 'Every Monday at 6:00 AM' },
  { value: 'monthly', label: 'Monthly', icon: <CalendarClock size={14} />, desc: '1st of each month' },
  { value: 'quarterly', label: 'Quarterly', icon: <TrendingUp size={14} />, desc: 'Every 3 months' },
];

const FORMAT_OPTIONS = [
  { value: 'PDF', icon: <FileText size={14} />, color: '#ef4444' },
  { value: 'CSV', icon: <BarChart3 size={14} />, color: '#059669' },
  { value: 'JSON', icon: <span style={{ fontWeight: 700, fontSize: 10 }}>{'{}'}</span>, color: '#f59e0b' },
];

const SECTION_OPTIONS = [
  { key: 'includeExecutiveSummary', label: 'Executive Summary', desc: 'High-level overview and KPIs', icon: <Sparkles size={16} /> },
  { key: 'includeTechnicalDetails', label: 'Technical Details', desc: 'Cipher suites, TLS versions, certificates', icon: <Shield size={16} /> },
  { key: 'includePqcPosture', label: 'PQC Posture Analysis', desc: 'Quantum readiness and migration status', icon: <Zap size={16} /> },
  { key: 'includeCyberRating', label: 'Cyber Rating Report', desc: 'Security posture score and benchmarks', icon: <TrendingUp size={16} /> },
];

/* ── Styles ─────────────────────────────────────────────────── */
const styles = {
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 },
  statCard: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
    borderRadius: 14, background: 'var(--bg-primary)', border: '1px solid var(--border-light)',
    transition: 'all 0.25s ease',
  },
  statIcon: (color) => ({
    width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `linear-gradient(135deg, ${color}15, ${color}25)`, color,
    boxShadow: `0 4px 12px ${color}15`,
  }),
  statValue: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 },
  statLabel: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2, letterSpacing: 0.3 },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-light)',
  },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 },
  sectionDesc: { fontSize: 12, color: 'var(--text-muted)', marginTop: 3 },
  scheduleCard: (enabled) => ({
    padding: '18px 22px', borderRadius: 14, background: 'var(--bg-primary)',
    border: `1px solid ${enabled ? 'var(--border-light)' : 'var(--border-light)'}`,
    opacity: enabled ? 1 : 0.6, transition: 'all 0.25s ease',
    position: 'relative', overflow: 'hidden',
  }),
  scheduleAccent: (enabled) => ({
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    background: enabled ? 'linear-gradient(180deg, #2563eb, #7c3aed)' : '#94a3b8',
    borderRadius: '14px 0 0 14px',
  }),
  badge: (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600,
    padding: '3px 10px', borderRadius: 20, letterSpacing: 0.3,
    background: active ? 'linear-gradient(135deg, #05966915, #05966925)' : '#94a3b810',
    color: active ? '#059669' : '#94a3b8', textTransform: 'uppercase',
  }),
  metaTag: {
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500,
    color: 'var(--text-muted)', padding: '3px 10px', borderRadius: 6,
    background: 'var(--bg-secondary)', whiteSpace: 'nowrap',
  },
  actionBtn: (color = 'var(--text-muted)') => ({
    width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border-light)',
    background: 'var(--bg-primary)', color, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s ease', fontSize: 0,
  }),
  /* Modal — all solid opaque colors for readability */
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
  freqPill: (active) => ({
    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
    background: active ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : '#f3f4f6',
    color: active ? '#fff' : '#4b5563', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 4, fontSize: 12, fontWeight: active ? 600 : 500,
    transition: 'all 0.25s ease', border: active ? '1px solid transparent' : '1px solid #d1d5db',
    boxShadow: active ? '0 4px 14px rgba(37, 99, 235, 0.3)' : 'none',
  }),
  formatPill: (active, color) => ({
    flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
    border: active ? `2px solid ${color}` : '1px solid #d1d5db',
    background: active ? `${color}12` : '#f9fafb',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontSize: 13, fontWeight: 600, color: active ? color : '#6b7280',
    transition: 'all 0.2s ease',
  }),
  sectionToggle: (active) => ({
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
    borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s ease',
    background: active ? '#eef2ff' : '#f9fafb',
    border: `1px solid ${active ? '#818cf8' : '#e5e7eb'}`,
  }),
  toggleSwitch: (active) => ({
    width: 40, height: 22, borderRadius: 11, padding: 2, cursor: 'pointer', flexShrink: 0,
    background: active ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : '#d1d5db',
    display: 'flex', alignItems: 'center', transition: 'all 0.25s ease',
    justifyContent: active ? 'flex-end' : 'flex-start',
  }),
  toggleKnob: {
    width: 18, height: 18, borderRadius: '50%', background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
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

export default function ScheduleReporting() {
  const [reportSchedules, setReportSchedules] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [emailProviders, setEmailProviders] = useState({ gmail: { configured: false }, outlook: { configured: false } });
  const [emailPickerFor, setEmailPickerFor] = useState(null); // schedule obj or null
  const [pickerRecipients, setPickerRecipients] = useState('');
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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [schedRes, scanRes, emailRes] = await Promise.allSettled([getSchedules(), getReportsList(), getEmailStatus()]);
      if (schedRes.status === 'fulfilled') setReportSchedules(schedRes.value.data);
      if (scanRes.status === 'fulfilled') setScans(scanRes.value.data);
      if (emailRes.status === 'fulfilled') {
        setEmailProviders({
          gmail: emailRes.value.data.gmail || { configured: false },
          outlook: emailRes.value.data.outlook || { configured: false },
        });
      }
    } catch { /* handled */ }
    finally { setLoading(false); }
  };

  const scheduleEntries = reportSchedules.map(s => ({
    ...s, reportName: `${s.name} — Auto Report`,
    format: 'PDF',
    lastGenerated: s.lastRun ? new Date(s.lastRun) : null,
    nextGeneration: s.nextRun ? new Date(s.nextRun) : null,
  }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Report name required');
    setSubmitting(true);
    try {
      await createSchedule({
        name: `[Report] ${form.name}`,
        targets: scans.slice(0, 1).flatMap(s => s.targets || [{ host: 'all-targets', port: 443 }]),
        frequency: form.frequency, time: '06:00',
        recipients: form.recipients.trim(),
      });
      toast.success('Report schedule created successfully!');
      setShowModal(false);
      setForm({ name: '', frequency: 'weekly', format: 'PDF', recipients: '', includeExecutiveSummary: true, includeTechnicalDetails: true, includePqcPosture: true, includeCyberRating: true });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this report schedule?')) return;
    try { await deleteSchedule(id); toast.success('Schedule deleted'); loadData(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleToggle = async (id, enabled) => {
    try {
      await updateSchedule(id, { enabled: !enabled });
      toast.success(enabled ? 'Schedule paused' : 'Schedule activated');
      loadData();
    } catch { toast.error('Failed to update'); }
  };

  const handleSendEmail = async (schedule, provider = 'gmail') => {
    const recipients = pickerRecipients || schedule.recipients || form.recipients;
    if (!recipients || !recipients.trim()) {
      toast.error('Please enter at least one recipient email address');
      return;
    }
    setSendingId(schedule._id);
    try {
      await sendReportEmail({
        recipients: recipients.trim(),
        reportName: schedule.reportName || schedule.name,
        format: 'PDF',
        frequency: schedule.frequency,
        provider,
      });
      toast.success(`Report emailed via ${provider === 'outlook' ? 'Outlook' : 'Gmail'} successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send email');
    } finally { setSendingId(null); setEmailPickerFor(null); setPickerRecipients(''); }
  };

  const completedScans = scans.filter(s => s.status === 'completed').length;

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" style={{ marginBottom: 16 }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Loading scheduled reports...</p>
    </div>
  );

  return (
    <div>
      {/* ── Stats Cards ───────────────────────────────────── */}
      <div style={styles.statsGrid}>
        {[
          { icon: <CalendarClock size={20} />, label: 'Active Schedules', value: scheduleEntries.filter(s => s.enabled).length, color: '#2563eb' },
          { icon: <FileText size={20} />, label: 'Total Configured', value: scheduleEntries.length, color: '#8b5cf6' },
          { icon: <Download size={20} />, label: 'Reports Generated', value: scheduleEntries.reduce((sum, s) => sum + (s.runCount || 0), 0), color: '#059669' },
          { icon: <Target size={20} />, label: 'Scans Available', value: completedScans, color: '#f59e0b' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }} style={styles.statCard}>
            <div style={styles.statIcon(stat.color)}>{stat.icon}</div>
            <div>
              <div style={styles.statValue}>{stat.value}</div>
              <div style={styles.statLabel}>{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Section Header ────────────────────────────────── */}
      <div style={styles.sectionHeader}>
        <div>
          <div style={styles.sectionTitle}>
            <CalendarClock size={18} style={{ color: '#2563eb' }} />
            Configured Report Schedules
          </div>
          <div style={styles.sectionDesc}>Automated reports delivered on a recurring basis</div>
        </div>
        <motion.button className="btn btn-primary" onClick={() => setShowModal(true)}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13 }}>
          <Plus size={15} /> New Schedule
        </motion.button>
      </div>

      {/* ── Schedule List ─────────────────────────────────── */}
      {scheduleEntries.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={styles.emptyState}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #2563eb10, #7c3aed10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CalendarClock size={28} style={{ color: '#2563eb' }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No report schedules yet</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
            Set up automated PQC assessment reports delivered periodically to stay on top of your quantum readiness.
          </p>
          <motion.button className="btn btn-primary" onClick={() => setShowModal(true)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={{ padding: '11px 24px', borderRadius: 10, fontWeight: 600 }}>
            <Plus size={15} /> Create First Schedule
          </motion.button>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {scheduleEntries.map((s, idx) => (
            <motion.div key={s._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }} style={styles.scheduleCard(s.enabled)}>
              <div style={styles.scheduleAccent(s.enabled)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 8 }}>
                {/* Icon */}
                <div style={{
                  width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.enabled ? 'linear-gradient(135deg, #2563eb10, #7c3aed10)' : '#94a3b808',
                  color: s.enabled ? '#2563eb' : '#94a3b8', flexShrink: 0,
                }}>
                  <FileText size={22} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                      {s.reportName || s.name}
                    </span>
                    <span style={styles.badge(s.enabled)}>
                      {s.enabled ? <><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} /> Active</> : 'Paused'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={styles.metaTag}><Calendar size={11} /> {s.frequency}</span>
                    <span style={styles.metaTag}><FileText size={11} /> PDF</span>
                    <span style={styles.metaTag}><Target size={11} /> {s.targets?.length || 0} target{s.targets?.length !== 1 ? 's' : ''}</span>
                    {s.runCount > 0 && <span style={styles.metaTag}><Download size={11} /> {s.runCount} generated</span>}
                    {s.nextGeneration && <span style={styles.metaTag}><Clock size={11} /> Next: {s.nextGeneration.toLocaleDateString()}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                    style={{ ...styles.actionBtn('#059669'), background: sendingId === s._id ? '#05966620' : 'var(--bg-primary)' }}
                    onClick={() => { setEmailPickerFor(s); setPickerRecipients(s.recipients || ''); }} title="Send Report Email"
                    disabled={sendingId === s._id}>
                    {sendingId === s._id ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
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

      {/* ═══ EMAIL PROVIDER PICKER MODAL ══════════════════════ */}
      {emailPickerFor && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => { setEmailPickerFor(null); setPickerRecipients(''); }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 400, borderRadius: 20, background: '#ffffff', border: '1px solid #e5e7eb',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden', position: 'relative', zIndex: 10000 }}>
            {/* Header */}
            <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff' }}>
                  <Send size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Send Report Email</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Enter recipients &amp; choose provider</div>
                </div>
              </div>
              <button style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #d1d5db', background: '#f3f4f6',
                cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={(e) => { e.stopPropagation(); setEmailPickerFor(null); setPickerRecipients(''); }}>
                <X size={14} />
              </button>
            </div>
            {/* Recipient Input */}
            <div style={{ padding: '18px 24px 0' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: 0.3, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Mail size={13} /> Recipient Email(s)
              </label>
              <input
                type="text"
                value={pickerRecipients}
                onChange={e => setPickerRecipients(e.target.value)}
                placeholder="team@company.com, manager@company.com"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                  border: '1px solid #d1d5db', background: '#f9fafb', color: '#111827', outline: 'none',
                  transition: 'border-color 0.2s', boxSizing: 'border-box', marginTop: 6 }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
                autoFocus
              />
            </div>
            {/* Provider Options */}
            <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: 0.3, marginBottom: 2 }}>Send via</div>
              <button
                disabled={!emailProviders.gmail.configured || !!sendingId}
                onClick={(e) => { e.stopPropagation(); handleSendEmail(emailPickerFor, 'gmail'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 16px',
                  borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', cursor: emailProviders.gmail.configured && !sendingId ? 'pointer' : 'not-allowed',
                  opacity: emailProviders.gmail.configured ? 1 : 0.45, transition: 'all 0.2s', textAlign: 'left' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#EA43350a', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M22 6L12 13L2 6V4l10 7 10-7v2z" fill="#EA4335"/><path d="M2 6v12h4V10l6 4.5L18 10v8h4V6l-2-2H4L2 6z" fill="#EA4335"/><rect x="2" y="4" width="4" height="14" fill="#4285F4"/><rect x="18" y="4" width="4" height="14" fill="#34A853"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Gmail</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                    {emailProviders.gmail.configured ? `Send via ${emailProviders.gmail.emailUser}` : 'Not configured'}
                  </div>
                </div>
                {sendingId === emailPickerFor?._id && <RefreshCw size={14} className="spin" style={{ color: '#6b7280' }} />}
              </button>

              <button
                disabled={!emailProviders.outlook.configured || !!sendingId}
                onClick={(e) => { e.stopPropagation(); handleSendEmail(emailPickerFor, 'outlook'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 16px',
                  borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', cursor: emailProviders.outlook.configured && !sendingId ? 'pointer' : 'not-allowed',
                  opacity: emailProviders.outlook.configured ? 1 : 0.45, transition: 'all 0.2s', textAlign: 'left' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#0078D40a', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="1" y="4" width="13" height="16" rx="1.5" fill="#0078D4"/><path d="M7.5 8.5c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5S11 13.93 11 12 9.43 8.5 7.5 8.5zm0 5.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="white"/><path d="M14 7l9-3v16l-9-3V7z" fill="#28A8EA"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Outlook</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                    {emailProviders.outlook.configured ? `Send via ${emailProviders.outlook.emailUser}` : 'Not configured — add OUTLOOK_USER to .env'}
                  </div>
                </div>
                {sendingId === emailPickerFor?._id && <RefreshCw size={14} className="spin" style={{ color: '#6b7280' }} />}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ═══ CREATE MODAL ════════════════════════════════════ */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={styles.overlay} onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.90, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.90, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()} style={styles.modal}>

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
                    New Report Schedule
                  </div>
                  <div style={styles.modalSubtitle}>Configure automated PQC assessment report delivery</div>
                </div>
                <button style={styles.closeBtn} onClick={() => setShowModal(false)}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreate}>
                <div style={styles.modalBody}>
                  {/* Report Name */}
                  <div>
                    <label style={styles.fieldLabel}><FileText size={13} /> Report Name</label>
                    <input style={styles.inputStyled} value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Weekly PQC Assessment Report" required
                      onFocus={e => e.target.style.borderColor = '#2563eb'}
                      onBlur={e => e.target.style.borderColor = '#d1d5db'} />
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

                  {/* Format Selection */}
                  <div>
                    <label style={styles.fieldLabel}><Download size={13} /> Export Format</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {FORMAT_OPTIONS.map(opt => (
                        <motion.button key={opt.value} type="button"
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                          style={styles.formatPill(form.format === opt.value, opt.color)}
                          onClick={() => setForm({ ...form, format: opt.value })}>
                          {opt.icon}
                          <span>{opt.value}</span>
                          {form.format === opt.value && <Check size={14} />}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Recipients */}
                  <div>
                    <label style={styles.fieldLabel}><Mail size={13} /> Recipients <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
                    <input style={styles.inputStyled} value={form.recipients}
                      onChange={e => setForm({ ...form, recipients: e.target.value })}
                      placeholder="team@company.com, manager@company.com"
                      onFocus={e => e.target.style.borderColor = '#2563eb'}
                      onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                  </div>

                  {/* Report Sections */}
                  <div>
                    <label style={styles.fieldLabel}><BarChart3 size={13} /> Report Sections</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {SECTION_OPTIONS.map(opt => (
                        <motion.div key={opt.key} style={styles.sectionToggle(form[opt.key])}
                          whileHover={{ scale: 1.005 }}
                          onClick={() => setForm({ ...form, [opt.key]: !form[opt.key] })}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: form[opt.key] ? '#eef2ff' : '#ffffff',
                            color: form[opt.key] ? '#2563eb' : '#9ca3af', flexShrink: 0,
                          }}>
                            {opt.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{opt.label}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{opt.desc}</div>
                          </div>
                          <div style={styles.toggleSwitch(form[opt.key])}>
                            <motion.div style={styles.toggleKnob} layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Info Banner */}
                  <div style={styles.infoCard}>
                    <Info size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
                    <span>Reports are auto-generated from the latest completed scan data at each scheduled interval. Ensure at least one scan is completed before scheduling.</span>
                  </div>
                </div>

                {/* Footer */}
                <div style={styles.modalFooter}>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                  <motion.button type="submit" disabled={submitting}
                    whileHover={!submitting ? { scale: 1.01 } : {}}
                    whileTap={!submitting ? { scale: 0.98 } : {}}
                    style={styles.submitBtn(submitting)}>
                    {submitting ? <><div className="spinner" /> Creating...</> : <><CalendarClock size={16} /> Create Report Schedule</>}
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
