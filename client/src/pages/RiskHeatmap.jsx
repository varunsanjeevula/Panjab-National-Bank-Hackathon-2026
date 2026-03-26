import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScans, getCbomRecords } from '../services/api';
import { motion } from 'framer-motion';
import { Map, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const RISK_COLORS = {
  'Fully Quantum Safe': { bg: '#059669', text: '#fff', label: 'Safe' },
  'Hybrid Mode': { bg: '#d97706', text: '#fff', label: 'Hybrid' },
  'Not PQC Ready': { bg: '#dc2626', text: '#fff', label: 'Vulnerable' },
  'Critical — Not PQC Ready': { bg: '#991b1b', text: '#fff', label: 'Critical' },
};

export default function RiskHeatmap() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredAsset, setHoveredAsset] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadAssets(); }, []);

  const loadAssets = async () => {
    try {
      const scansRes = await getScans();
      const completedScans = scansRes.data.filter(s => s.status === 'completed');
      if (completedScans.length === 0) { setLoading(false); return; }

      // Get the latest scan's CBOM records
      const latestScan = completedScans[0];
      const cbomRes = await getCbomRecords(latestScan._id);
      setAssets(cbomRes.data.filter(r => r.status === 'completed'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load heatmap data');
    }
    setLoading(false);
  };

  if (loading) return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Risk Heatmap</h1>
        <p className="page-subtitle">Visual risk grid of scanned assets</p>
      </div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {Array(12).fill(0).map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
      </div>
    </div>
  );

  const summary = {};
  assets.forEach(a => {
    const label = a.quantumAssessment?.label || 'Unknown';
    summary[label] = (summary[label] || 0) + 1;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Risk Heatmap</h1>
        <p className="page-subtitle">Visual risk grid of all scanned assets — click any cell for details</p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(RISK_COLORS).map(([label, c]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: c.bg }} />
            <span style={{ color: 'var(--text-secondary)' }}>{c.label} ({summary[label] || 0})</span>
          </div>
        ))}
      </div>

      {assets.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
        }}>
          {assets.map((asset, i) => {
            const label = asset.quantumAssessment?.label || 'Unknown';
            const colors = RISK_COLORS[label] || { bg: '#94a3b8', text: '#fff', label: 'Unknown' };
            const score = asset.quantumAssessment?.score?.score ?? '—';

            return (
              <motion.div
                key={asset._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => navigate(`/asset/${asset._id}`)}
                onMouseEnter={() => setHoveredAsset(asset._id)}
                onMouseLeave={() => setHoveredAsset(null)}
                style={{
                  background: colors.bg,
                  color: colors.text,
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: hoveredAsset === asset._id ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: hoveredAsset === asset._id ? '0 8px 24px rgba(0,0,0,0.2)' : 'var(--shadow-sm)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {asset.host}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  {score}
                </div>
                <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {colors.label}
                </div>
                {/* Decorative corner */}
                <div style={{
                  position: 'absolute', top: -20, right: -20, width: 50, height: 50,
                  borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                }} />
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="card empty-state">
          <Shield size={44} />
          <p>No asset data available. Run a scan first.</p>
        </div>
      )}
    </div>
  );
}
