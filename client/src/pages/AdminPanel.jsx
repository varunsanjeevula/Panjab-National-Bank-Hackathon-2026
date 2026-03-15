import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser, getAuditLogs } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Edit, Trash2, Shield, ShieldCheck, Eye, Clock, Activity, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'analyst' });

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { if (tab === 'audit') loadLogs(); }, [tab, logsPage]);

  const loadUsers = async () => {
    try {
      const { data } = await getUsers();
      setUsers(data);
    } catch (err) { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const loadLogs = async () => {
    try {
      const { data } = await getAuditLogs({ page: logsPage, limit: 30 });
      setLogs(data.logs);
      setLogsTotal(data.total);
    } catch (err) { toast.error('Failed to load audit logs'); }
  };

  const handleSubmit = async () => {
    try {
      if (editUser) {
        await updateUser(editUser._id, { role: form.role, username: form.username, email: form.email });
        toast.success('User updated');
      } else {
        if (!form.username || !form.email || !form.password) { toast.error('Fill all fields'); return; }
        await createUser(form);
        toast.success('User created');
      }
      setShowModal(false);
      setEditUser(null);
      setForm({ username: '', email: '', password: '', role: 'analyst' });
      loadUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Operation failed'); }
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await deleteUser(id);
      toast.success('User deleted');
      loadUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ username: user.username, email: user.email, password: '', role: user.role });
    setShowModal(true);
  };

  const roleColor = (role) => role === 'admin' ? '#dc2626' : role === 'analyst' ? '#3b82f6' : '#059669';
  const roleIcon = (role) => role === 'admin' ? <Shield size={14} /> : role === 'analyst' ? <ShieldCheck size={14} /> : <Eye size={14} />;

  const actionColor = (action) => {
    if (action.includes('SCAN')) return '#3b82f6';
    if (action.includes('USER')) return '#8b5cf6';
    if (action.includes('REPORT') || action.includes('LABEL')) return '#059669';
    if (action.includes('LOGIN')) return '#d97706';
    return '#64748b';
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage users, roles, and view system audit logs</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'users', icon: <Users size={15} />, label: 'Users' },
          { key: 'audit', icon: <Activity size={15} />, label: 'Audit Logs' },
        ].map(t => (
          <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.key)}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ── User Management Tab ── */}
      {tab === 'users' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{users.length} user(s) registered</div>
            <button className="btn btn-primary" onClick={() => { setEditUser(null); setForm({ username: '', email: '', password: '', role: 'analyst' }); setShowModal(true); }}>
              <UserPlus size={15} /> Add User
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map((user, i) => (
              <motion.div key={user._id} className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }} style={{ padding: '14px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${roleColor(user.role)}15`, color: roleColor(user.role),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{user.username}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: `${roleColor(user.role)}15`, color: roleColor(user.role), display: 'flex', alignItems: 'center', gap: 4 }}>
                    {roleIcon(user.role)} {user.role}
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 80 }}>
                    <Clock size={11} style={{ verticalAlign: -1 }} /> {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {user.role !== 'admin' && (
                      <>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(user)} style={{ padding: '6px 10px' }}>
                          <Edit size={13} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user._id, user.username)} style={{ padding: '6px 10px' }}>
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* ── Audit Logs Tab ── */}
      {tab === 'audit' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{logsTotal} total events</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>{log.username}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: `${actionColor(log.action)}15`, color: actionColor(log.action) }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(log.details || {}).substring(0, 80)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button className="btn btn-sm btn-secondary" disabled={logsPage <= 1} onClick={() => setLogsPage(p => p - 1)}>
              <ChevronLeft size={14} /> Prev
            </button>
            <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>Page {logsPage}</span>
            <button className="btn btn-sm btn-secondary" disabled={logs.length < 30} onClick={() => setLogsPage(p => p + 1)}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}

      {/* ── User Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowModal(false)}>
            <motion.div className="card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              style={{ width: 420, padding: 24, position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
              <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>{editUser ? 'Edit User' : 'Create User'}</h3>
              <div className="form-group">
                <label className="detail-item-label">USERNAME</label>
                <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="detail-item-label">EMAIL</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              {!editUser && (
                <div className="form-group">
                  <label className="detail-item-label">PASSWORD</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
              )}
              <div className="form-group">
                <label className="detail-item-label">ROLE</label>
                <select className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="analyst">Analyst</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleSubmit}>
                {editUser ? 'Update User' : 'Create User'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
