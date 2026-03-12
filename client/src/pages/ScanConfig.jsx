import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startScan } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Plus, Trash2, Globe, Upload, Play, AlertCircle, Shield, Lock, Fingerprint, FileUp, Settings, Network } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ScanConfig() {
  const [targets, setTargets] = useState(['']);
  const [defaultPort, setDefaultPort] = useState(443);
  const [scanning, setScanning] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [scanVpn, setScanVpn] = useState(false);
  const [enableCleartextScan, setEnableCleartextScan] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const addTarget = () => setTargets([...targets, '']);
  const removeTarget = (i) => targets.length > 1 && setTargets(targets.filter((_, idx) => idx !== i));
  const updateTarget = (i, v) => { const u = [...targets]; u[i] = v; setTargets(u); };

  const handleBulkInput = (text) => {
    const hosts = text.split(/[\n,;]+/).map(h => h.trim()).filter(Boolean);
    if (hosts.length > 0) { setTargets(hosts); toast.success(`${hosts.length} target(s) loaded`); }
  };

  // CSV file upload handler
  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast.error('Please upload a .csv or .txt file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/[\r\n]+/).filter(Boolean);
      const hosts = [];
      for (const line of lines) {
        // Skip header rows
        if (line.toLowerCase().includes('host') || line.toLowerCase().includes('domain') || line.toLowerCase().includes('target')) continue;
        // Parse CSV columns — take first column as host
        const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols[0] && cols[0].length > 0) {
          hosts.push(cols[0]);
        }
      }
      if (hosts.length > 0) {
        setTargets(hosts);
        toast.success(`${hosts.length} target(s) loaded from ${file.name}`);
      } else {
        toast.error('No valid targets found in file');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // CIDR range expansion (basic /24, /16 support)
  const expandCIDR = (cidr) => {
    const match = cidr.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
    if (!match) return [cidr]; // Not CIDR, return as-is
    const [, ip, bits] = match;
    const mask = parseInt(bits);
    if (mask < 16 || mask > 30) {
      toast.error('CIDR range must be between /16 and /30');
      return [];
    }
    const parts = ip.split('.').map(Number);
    const ipNum = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
    const hostBits = 32 - mask;
    const numHosts = (1 << hostBits) - 2; // Exclude network and broadcast
    const networkAddr = ipNum & (~0 << hostBits);
    if (numHosts > 254) {
      toast.error('CIDR range too large (max /24 = 254 hosts). Use a smaller range.');
      return [];
    }
    const hosts = [];
    for (let i = 1; i <= numHosts; i++) {
      const addr = networkAddr + i;
      hosts.push(`${(addr >> 24) & 255}.${(addr >> 16) & 255}.${(addr >> 8) & 255}.${addr & 255}`);
    }
    return hosts;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Expand any CIDR ranges and normalize
    let expandedTargets = [];
    for (const t of targets) {
      const trimmed = t.trim();
      if (!trimmed) continue;
      if (trimmed.includes('/')) {
        const expanded = expandCIDR(trimmed);
        expandedTargets.push(...expanded);
      } else {
        expandedTargets.push(trimmed);
      }
    }
    if (!expandedTargets.length) { toast.error('Add at least one target'); return; }
    setScanning(true);
    setActiveStep(0);

    const stepTimers = [
      setTimeout(() => setActiveStep(1), 1200),
      setTimeout(() => setActiveStep(2), 2400),
      setTimeout(() => setActiveStep(3), 3600),
    ];

    try {
      const [res] = await Promise.all([
        startScan(expandedTargets.map(t => ({ host: t.trim(), port: defaultPort })), { scanVpn, enableCleartextScan }),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
      toast.success(`Scan initiated for ${expandedTargets.length} target(s)!`);
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
        {/* Left Column — Target Input */}
        <motion.div className="card" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <div className="card-title" style={{ marginBottom: 20 }}>
            <Globe size={18} style={{ color: 'var(--brand-primary)' }} /> Target Endpoints
          </div>
          <form onSubmit={handleSubmit}>
            {targets.map((target, i) => (
              <motion.div key={i} className="form-group" style={{ display: 'flex', gap: 8, marginBottom: 8 }}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <input className="form-input" type="text" placeholder="e.g., google.com or 192.168.1.0/24"
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
                  <Play size={15} /> Start Scan {targets.filter(t => t.trim()).length > 1 ? `(${targets.filter(t => t.trim()).length} targets)` : ''}
                </motion.button>
              </div>
            </div>
          </form>

          {/* Scan Configuration */}
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-color)' }}>
            <div className="card-title" style={{ marginBottom: 14 }}>
              <Settings size={16} style={{ color: 'var(--brand-primary)' }} /> Scan Configuration
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="detail-item-label" style={{ display: 'block', marginBottom: 6 }}>DEFAULT PORT</label>
                <input type="number" className="form-input" value={defaultPort} min={1} max={65535}
                  onChange={(e) => setDefaultPort(parseInt(e.target.value) || 443)} disabled={scanning}
                  style={{ fontFamily: 'var(--font-mono)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label className="detail-item-label" style={{ display: 'block', marginBottom: 6 }}>VPN SCANNING</label>
                  <button type="button" className={`btn btn-sm ${scanVpn ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ width: '100%', height: 42 }}
                    onClick={() => setScanVpn(!scanVpn)}>
                    <Network size={14} /> {scanVpn ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div>
                  <label className="detail-item-label" style={{ display: 'block', marginBottom: 6 }}>CLEARTEXT PROTOCOLS (INTRANET)</label>
                  <button type="button" className={`btn btn-sm ${enableCleartextScan ? 'btn-danger' : 'btn-secondary'}`}
                    style={{ width: '100%', height: 42, display: 'flex', justifyContent: 'center' }}
                    onClick={() => setEnableCleartextScan(!enableCleartextScan)}>
                    <AlertCircle size={14} /> {enableCleartextScan ? 'Enabled (Slower)' : 'Disabled'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column — Bulk Import + Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* CSV Upload */}
          <motion.div className="card" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>
              <Upload size={18} style={{ color: 'var(--brand-primary)' }} /> Bulk Import
            </div>

            {/* CSV File Upload */}
            <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleCSVUpload}
              style={{ display: 'none' }} />
            <motion.button type="button" className="btn btn-secondary"
              style={{ width: '100%', marginBottom: 12, padding: '12px 16px', border: '2px dashed var(--border-color)', background: 'var(--bg-secondary)' }}
              whileHover={{ borderColor: 'var(--brand-primary)', background: 'var(--brand-gradient-soft)' }}
              onClick={() => fileInputRef.current?.click()} disabled={scanning}>
              <FileUp size={18} style={{ color: 'var(--brand-primary)' }} />
              <span style={{ marginLeft: 8 }}>Upload CSV / TXT File</span>
            </motion.button>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
              CSV format: one domain per line, or first column as domain. Headers are auto-skipped.
            </p>

            {/* Paste Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea className="form-input" placeholder={"google.com\ngithub.com\ncloudflare.com\n192.168.1.0/24"}
                style={{ minHeight: 100, fontFamily: 'var(--font-mono)', fontSize: 13 }}
                onChange={(e) => handleBulkInput(e.target.value)} disabled={scanning} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              Supports: domains, IPs, CIDR ranges (/24), comma/newline separated
            </p>
          </motion.div>

          {/* Info Card */}
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
