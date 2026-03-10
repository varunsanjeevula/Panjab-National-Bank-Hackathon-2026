import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startScan } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Plus, Trash2, Globe, Upload, Play, AlertCircle, Shield, Lock, Fingerprint } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ScanConfig() {
  const [targets, setTargets] = useState(['']);
  const [scanning, setScanning] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();

  const addTarget = () => setTargets([...targets, '']);
  const removeTarget = (i) => targets.length > 1 && setTargets(targets.filter((_, idx) => idx !== i));
  const updateTarget = (i, v) => { const u = [...targets]; u[i] = v; setTargets(u); };

  const handleBulkInput = (text) => {
    const hosts = text.split(/[\n,;]+/).map(h => h.trim()).filter(Boolean);
    if (hosts.length > 0) { setTargets(hosts); toast.success(`${hosts.length} target(s) loaded`); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valid = targets.filter(t => t.trim());
    if (!valid.length) { toast.error('Add at least one target'); return; }
    setScanning(true);
    setActiveStep(0);

    // Animate through steps while the scan starts
    const stepTimers = [
      setTimeout(() => setActiveStep(1), 1200),
      setTimeout(() => setActiveStep(2), 2400),
      setTimeout(() => setActiveStep(3), 3600),
    ];

    try {
      const [res] = await Promise.all([
        startScan(valid.map(t => ({ host: t.trim(), port: 443 }))),
        new Promise(resolve => setTimeout(resolve, 5000)) // minimum 5s animation
      ]);
      toast.success('Scan initiated!');
      stepTimers.forEach(clearTimeout);
      navigate(`/results/${res.data.scanId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Scan failed');
      stepTimers.forEach(clearTimeout);
      setScanning(false);
      setActiveStep(0);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">New Scan</h1>
        <p className="page-subtitle">Assess quantum readiness of public-facing endpoints</p>
      </div>

      {/* Scanning Overlay */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div className="scan-animation-container">
              <div className="scan-radar">
                <div className="scan-radar-ring ring-1" />
                <div className="scan-radar-ring ring-2" />
                <div className="scan-radar-ring ring-3" />
                <div className="scan-radar-sweep" />
                <div className="scan-radar-dot" />
              </div>
              <div className="scan-status-text">Initiating Quantum Scan</div>
              <div className="scan-status-sub">Establishing TLS connections and analyzing cryptographic posture...</div>
              <div className="scan-steps">
                {['Connecting to targets', 'TLS handshake & certificate extraction', 'Cipher suite enumeration', 'Quantum classification & CBOM'].map((label, i) => (
                  <div key={i} className={`scan-step ${i < activeStep ? 'completed' : i === activeStep ? 'active' : ''}`}>
                    <div className="scan-step-dot" />
                    <span className="scan-step-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid-2">
        <motion.div className="card" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <div className="card-title" style={{ marginBottom: 20 }}>
            <Globe size={18} style={{ color: 'var(--brand-primary)' }} /> Target Endpoints
          </div>
          <form onSubmit={handleSubmit}>
            {targets.map((target, i) => (
              <motion.div key={i} className="form-group" style={{ display: 'flex', gap: 8 }}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <input className="form-input" type="text" placeholder="e.g., google.com, github.com"
                  value={target} onChange={(e) => updateTarget(i, e.target.value)} disabled={scanning} />
                {targets.length > 1 && (
                  <button type="button" className="btn btn-danger btn-icon" onClick={() => removeTarget(i)}><Trash2 size={15} /></button>
                )}
              </motion.div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={addTarget}><Plus size={15} /> Add</button>
              <div className="scan-btn-wrapper" style={{ flex: 1 }}>
                <motion.button type="submit" className="btn btn-primary" style={{ width: '100%' }}
                  disabled={scanning} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Play size={15} /> Start Scan
                </motion.button>
              </div>
            </div>
          </form>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <motion.div className="card" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>
              <Upload size={18} style={{ color: 'var(--brand-primary)' }} /> Bulk Import
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea className="form-input" placeholder={"google.com\ngithub.com\ncloudflare.com"}
                style={{ minHeight: 120, fontFamily: 'var(--font-mono)', fontSize: 13 }}
                onChange={(e) => handleBulkInput(e.target.value)} disabled={scanning} />
            </div>
          </motion.div>

          <motion.div className="card" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            style={{ background: 'var(--brand-gradient-soft)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} style={{ color: 'var(--brand-primary)' }} /> What gets scanned
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                {[
                  { icon: <Lock size={13} />, text: 'TLS handshake analysis' },
                  { icon: <Shield size={13} />, text: 'Certificate chain inspection' },
                  { icon: <Fingerprint size={13} />, text: 'Cipher suite enumeration' },
                  { icon: <Scan size={13} />, text: 'NIST PQC compliance check' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--brand-primary)' }}>{item.icon}</span> {item.text}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
