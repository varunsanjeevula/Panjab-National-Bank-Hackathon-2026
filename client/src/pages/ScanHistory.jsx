import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScans } from '../services/api';
import { motion } from 'framer-motion';
import { Clock, Target, ShieldCheck, ShieldX, Shield, Calendar, TrendingUp, ArrowRight, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [compare, setCompare] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getScans();
        setScans(data.scans || data);
      } catch { toast.error('Failed to load scans'); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = scans.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.targets?.some(t => (t.host || '').toLowerCase().includes(q));
  });

  const toggleCompare = (id) => {
    setCompare(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const scoreColor = (s) => s >= 70 ? '#059669' : s >= 40 ? '#d97706' : '#dc2626';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Scan History</h1>
        <p className="page-subtitle">View all past scans and track PQC migration progress over time</p>
      </div>

      {/* Search + Compare */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search by target hostname..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, height: 36, fontSize: 13 }} />
          </div>
          {compare.length === 2 && (
            <motion.button className="btn btn-primary" initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              onClick={() => navigate(`/results/${compare[0]}`)}>
              <TrendingUp size={14} /> Compare Selected
            </motion.button>
          )}
          {compare.length > 0 && compare.length < 2 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select 1 more scan to compare</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" /> Loading scan history...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          No scans found. Start a new scan to see history.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((scan, idx) => {
            const targets = scan.targets || [];
            const progress = scan.progress || {};
            const isSelected = compare.includes(scan._id);

            return (
              <motion.div key={scan._id} className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                style={{
                  padding: '16px 20px', cursor: 'pointer',
                  border: isSelected ? '2px solid var(--brand-primary)' : undefined,
                  background: isSelected ? 'var(--brand-gradient-soft)' : undefined
                }}
                onClick={() => navigate(`/results/${scan._id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  {/* Checkbox for compare */}
                  <div onClick={(e) => { e.stopPropagation(); toggleCompare(scan._id); }}
                    style={{
                      width: 22, height: 22, borderRadius: 6, border: '2px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      background: isSelected ? 'var(--brand-primary)' : 'transparent',
                      color: isSelected ? '#fff' : 'transparent', fontSize: 12, fontWeight: 700
                    }}>
                    ✓
                  </div>

                  {/* Status */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: scan.status === 'completed' ? '#05966915' : scan.status === 'running' ? '#3b82f615' : '#dc262615',
                    color: scan.status === 'completed' ? '#059669' : scan.status === 'running' ? '#3b82f6' : '#dc2626'
                  }}>
                    {scan.status === 'completed' ? <ShieldCheck size={18} /> : scan.status === 'running' ? <Clock size={18} /> : <ShieldX size={18} />}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>
                      {targets.slice(0, 3).map(t => t.host).join(', ')}
                      {targets.length > 3 && <span style={{ color: 'var(--text-muted)' }}> +{targets.length - 3} more</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 14 }}>
                      <span><Target size={11} style={{ verticalAlign: -1 }} /> {targets.length} target(s)</span>
                      <span><Calendar size={11} style={{ verticalAlign: -1 }} /> {new Date(scan.createdAt).toLocaleDateString()}</span>
                      <span style={{ textTransform: 'capitalize' }}>{scan.status}</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div style={{ display: 'flex', gap: 6, fontSize: 11, alignItems: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, background: '#05966915', color: '#059669' }}>
                      ✓ {progress.completed || 0}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 6, background: '#dc262615', color: '#dc2626' }}>
                      ✗ {progress.failed || 0}
                    </span>
                  </div>

                  <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
