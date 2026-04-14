import { useState, useEffect } from 'react';
import { getAiThreatFeed } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Shield, AlertTriangle, Clock, Globe, Cpu, FileText, ChevronRight,
  RefreshCw, X, ExternalLink, TrendingUp, Activity, Radio
} from 'lucide-react';
import toast from 'react-hot-toast';

const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', bg: '#ef44440a', border: '#ef44441a', label: 'CRITICAL', icon: <AlertTriangle size={14} /> },
  high:     { color: '#f59e0b', bg: '#f59e0b0a', border: '#f59e0b1a', label: 'HIGH', icon: <Zap size={14} /> },
  medium:   { color: '#3b82f6', bg: '#3b82f60a', border: '#3b82f61a', label: 'MEDIUM', icon: <Shield size={14} /> },
  low:      { color: '#10b981', bg: '#10b9810a', border: '#10b9811a', label: 'LOW', icon: <Activity size={14} /> },
};

const CATEGORY_ICONS = {
  'Quantum Hardware': <Cpu size={16} />,
  'Algorithm Breakthrough': <Zap size={16} />,
  'Policy & Standards': <FileText size={16} />,
  'Industry Migration': <TrendingUp size={16} />,
  'Attack Vector': <AlertTriangle size={16} />,
  'Research': <Globe size={16} />,
};

export default function ThreatIntelligence() {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [stats, setStats] = useState({ assetsAnalyzed: 0, vulnerableCount: 0 });
  const [filter, setFilter] = useState('all');

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data } = await getAiThreatFeed();
      setThreats(data.threats || []);
      setStats({ assetsAnalyzed: data.assetsAnalyzed, vulnerableCount: data.vulnerableCount });
      if (isRefresh) toast.success('Threat feed refreshed');
    } catch (err) {
      toast.error('Failed to load threat feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = filter === 'all' ? threats : threats.filter(t => t.severity === filter);

  const severityCounts = threats.reduce((acc, t) => {
    acc[t.severity] = (acc[t.severity] || 0) + 1;
    return acc;
  }, {});

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" style={{ marginBottom: 16 }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading threat intelligence...</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #ef4444, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Radio size={20} />
            </div>
            Real-Time Threat Intelligence
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            AI-powered quantum threat monitoring cross-referenced with your scanned assets
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => fetchData(true)}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border-light)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh Feed
        </motion.button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Alerts', value: threats.length, color: '#6366f1', icon: <Radio size={18} /> },
          { label: 'Critical', value: severityCounts.critical || 0, color: '#ef4444', icon: <AlertTriangle size={18} /> },
          { label: 'High', value: severityCounts.high || 0, color: '#f59e0b', icon: <Zap size={18} /> },
          { label: 'Assets Analyzed', value: stats.assetsAnalyzed, color: '#3b82f6', icon: <Globe size={18} /> },
          { label: 'Vulnerable', value: stats.vulnerableCount, color: '#ef4444', icon: <Shield size={18} /> },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--bg-primary)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${s.color}12`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Live Ticker */}
      <div style={{ padding: '10px 16px', borderRadius: 10, background: 'linear-gradient(135deg, #ef444410, #f59e0b10)', border: '1px solid #ef44441a', marginBottom: 20, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: 1 }}>LIVE</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {threats.filter(t => t.severity === 'critical').length} critical threats detected affecting {stats.vulnerableCount} of your assets
          </span>
        </div>
      </div>

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'critical', 'high', 'medium', 'low'].map(f => (
          <motion.button key={f} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 16px', borderRadius: 20, border: '1px solid', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
              background: filter === f ? (SEVERITY_CONFIG[f]?.color || '#6366f1') : 'var(--bg-primary)',
              color: filter === f ? '#fff' : (SEVERITY_CONFIG[f]?.color || 'var(--text-muted)'),
              borderColor: filter === f ? 'transparent' : (SEVERITY_CONFIG[f]?.border || 'var(--border-light)'),
            }}>
            {f === 'all' ? `All (${threats.length})` : `${f} (${severityCounts[f] || 0})`}
          </motion.button>
        ))}
      </div>

      {/* Threat Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((threat, idx) => {
          const sev = SEVERITY_CONFIG[threat.severity] || SEVERITY_CONFIG.medium;
          return (
            <motion.div key={threat.id || idx} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => setSelectedThreat(threat)}
              style={{ padding: '18px 22px', borderRadius: 14, background: 'var(--bg-primary)', border: `1px solid var(--border-light)`, cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.2s' }}
              whileHover={{ scale: 1.003, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              {/* Severity accent */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: sev.color, borderRadius: '14px 0 0 14px' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, paddingLeft: 8 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: sev.bg, color: sev.color, flexShrink: 0 }}>
                  {CATEGORY_ICONS[threat.category] || <Shield size={18} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{threat.title}</span>
                    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`, letterSpacing: 0.5, flexShrink: 0 }}>
                      {sev.label}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{threat.summary}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 6, background: 'var(--bg-secondary)' }}>
                      <Clock size={10} /> {threat.date}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 6, background: 'var(--bg-secondary)' }}>
                      <Globe size={10} /> {threat.source}
                    </span>
                    {threat.affectedAssetCount > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#ef4444', padding: '2px 8px', borderRadius: 6, background: '#ef444410', fontWeight: 600 }}>
                        <AlertTriangle size={10} /> {threat.affectedAssetCount} assets affected
                      </span>
                    )}
                    {(threat.affectedAlgorithms || []).slice(0, 3).map((algo, i) => (
                      <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {algo}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 4 }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedThreat && (() => {
          const sev = SEVERITY_CONFIG[selectedThreat.severity] || SEVERITY_CONFIG.medium;
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
              onClick={() => setSelectedThreat(null)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
                onClick={e => e.stopPropagation()}
                style={{ width: 560, maxHeight: '85vh', overflow: 'auto', borderRadius: 20, background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
                {/* Modal Header */}
                <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${sev.color}15, ${sev.color}30)`, color: sev.color }}>
                      {CATEGORY_ICONS[selectedThreat.category] || <Shield size={22} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>{selectedThreat.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>{sev.label}</span>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>{selectedThreat.date}</span>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>• {selectedThreat.source}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedThreat(null)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={14} />
                  </button>
                </div>

                <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Summary</div>
                    <p style={{ margin: 0, fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>{selectedThreat.summary}</p>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Impact on Banking Infrastructure</div>
                    <div style={{ padding: '12px 16px', borderRadius: 10, background: `${sev.color}08`, border: `1px solid ${sev.color}20`, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                      {selectedThreat.impact}
                    </div>
                  </div>
                  {selectedThreat.affectedAlgorithms?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Affected Algorithms</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {selectedThreat.affectedAlgorithms.map((algo, i) => (
                          <span key={i} style={{ padding: '6px 14px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>{algo}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedThreat.affectedAssetCount > 0 && (
                    <div style={{ padding: '14px 18px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#dc2626' }}>
                        <AlertTriangle size={16} /> {selectedThreat.affectedAssetCount} of your assets are affected
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#7f1d1d' }}>
                        These assets should be prioritized for PQC migration to mitigate this threat.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
