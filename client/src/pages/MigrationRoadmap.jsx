import { useState, useEffect } from 'react';
import { getScans, getCbomRecords } from '../services/api';
import { motion } from 'framer-motion';
import { Route as RouteIcon, AlertTriangle, Shield, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PHASE_CONFIG = [
  { phase: 1, name: 'Immediate', timeline: '0–3 months', color: '#dc2626', labels: ['Critical — Not PQC Ready'], action: 'Replace broken classical algorithms with PQC equivalents', nist: 'FIPS 203 (ML-KEM), FIPS 204 (ML-DSA)' },
  { phase: 2, name: 'Short-Term', timeline: '3–6 months', color: '#d97706', labels: ['Not PQC Ready'], action: 'Deploy hybrid mode (classical + PQC) for at-risk endpoints', nist: 'SP 800-208 Hybrid Approach' },
  { phase: 3, name: 'Medium-Term', timeline: '6–12 months', color: '#2563eb', labels: ['Hybrid Mode'], action: 'Transition hybrid endpoints to full PQC compliance', nist: 'FIPS 205 (SLH-DSA), FIPS 206 (FN-DSA)' },
  { phase: 4, name: 'Maintenance', timeline: 'Ongoing', color: '#059669', labels: ['Fully Quantum Safe'], action: 'Monitor and maintain quantum-safe posture across all assets', nist: 'Continuous Compliance Monitoring' },
];

const ALGO_MAP = {
  'RSA': 'ML-KEM (FIPS 203)',
  'ECDSA': 'ML-DSA (FIPS 204)',
  'ECDHE': 'ML-KEM (FIPS 203)',
  'DH': 'ML-KEM (FIPS 203)',
  'DSA': 'ML-DSA (FIPS 204)',
  'SHA-1': 'SHA-3 / SLH-DSA',
  'MD5': 'SHA-3',
};

export default function MigrationRoadmap() {
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const scansRes = await getScans();
      const completed = scansRes.data.filter(s => s.status === 'completed');
      if (completed.length === 0) { setLoading(false); return; }
      const cbomRes = await getCbomRecords(completed[0]._id);
      const assets = cbomRes.data.filter(r => r.status === 'completed');

      const phaseData = PHASE_CONFIG.map(cfg => {
        const items = assets.filter(a => cfg.labels.includes(a.quantumAssessment?.label));
        return {
          ...cfg,
          assets: items.map(a => ({
            host: a.host,
            port: a.port,
            score: a.quantumAssessment?.score?.score ?? 0,
            currentAlgo: a.certificate?.keyAlgorithm || 'Unknown',
            targetAlgo: ALGO_MAP[a.certificate?.keyAlgorithm?.split(/[-_]/)?.[0]] || 'ML-KEM / ML-DSA',
            issues: a.quantumAssessment?.issues || [],
            recommendations: a.recommendations?.slice(0, 2) || [],
          })),
          count: items.length,
        };
      });
      setPhases(phaseData);
    } catch { toast.error('Failed to load roadmap data'); }
    setLoading(false);
  };

  if (loading) return (
    <div>
      <div className="page-header"><div className="skeleton skeleton-title" /></div>
      {[1, 2, 3].map(i => <div key={i} className="skeleton skeleton-card" style={{ marginBottom: 16, height: 150 }} />)}
    </div>
  );

  const totalAssets = phases.reduce((s, p) => s + p.count, 0);
  const migrationNeeded = phases.filter(p => p.phase <= 3).reduce((s, p) => s + p.count, 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">PQC Migration Roadmap</h1>
        <p className="page-subtitle">Auto-generated phased plan to achieve full quantum readiness</p>
      </div>

      {/* Summary */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24, background: 'var(--brand-gradient-soft)' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <Shield size={36} style={{ color: 'var(--brand-primary)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>
              {migrationNeeded} of {totalAssets} assets require migration
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Roadmap generated from latest scan data using NIST PQC transition guidance
            </div>
          </div>
        </div>
      </motion.div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 32 }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', left: 14, top: 0, bottom: 0, width: 3, background: 'var(--border-light)', borderRadius: 2 }} />

        {phases.map((phase, i) => (
          <motion.div key={phase.phase} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }}
            style={{ position: 'relative', marginBottom: 24 }}>
            {/* Timeline dot */}
            <div style={{
              position: 'absolute', left: -26, top: 20, width: 24, height: 24, borderRadius: '50%',
              background: phase.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 800, boxShadow: `0 0 0 4px var(--bg-body), 0 0 0 6px ${phase.color}33`,
            }}>
              {phase.phase}
            </div>

            <div className="card" style={{ borderLeft: `4px solid ${phase.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Phase {phase.phase}: {phase.name}</span>
                    <span className="badge" style={{ background: `${phase.color}15`, color: phase.color, border: `1px solid ${phase.color}30` }}>
                      <Clock size={11} /> {phase.timeline}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{phase.action}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>NIST Reference: {phase.nist}</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: phase.color }}>{phase.count}</div>
              </div>

              {phase.assets.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Host</th><th>Current Score</th><th>Current Algo</th><th></th><th>Migration Target</th></tr></thead>
                      <tbody>
                        {phase.assets.slice(0, 10).map((a, j) => (
                          <tr key={j}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.host}:{a.port}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: a.score < 30 ? 'var(--color-danger)' : a.score < 60 ? 'var(--color-warning)' : 'var(--color-success)' }}>{a.score}</td>
                            <td><span className="chip">{a.currentAlgo}</span></td>
                            <td style={{ textAlign: 'center' }}><ArrowRight size={14} style={{ color: 'var(--text-muted)' }} /></td>
                            <td><span className="badge badge-safe">{a.targetAlgo}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {phase.assets.length > 10 && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 16px' }}>+{phase.assets.length - 10} more assets</div>}
                </div>
              )}

              {phase.count === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-success)', marginTop: 8 }}>
                  <CheckCircle2 size={16} /> No assets in this phase — all clear!
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {totalAssets === 0 && (
        <div className="card empty-state">
          <RouteIcon size={44} />
          <p>No scan data available. Run a scan to generate your migration roadmap.</p>
        </div>
      )}
    </div>
  );
}
