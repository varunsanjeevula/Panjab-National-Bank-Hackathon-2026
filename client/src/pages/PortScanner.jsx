import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Play, Shield, AlertTriangle, CheckCircle, XCircle, Clock, Server, Wifi, Lock, Unlock, Bug, ChevronDown, ChevronRight, ExternalLink, Activity, Target, Zap, Eye, Radio } from 'lucide-react';
import { startPortScan, getPortScan, getPortScans } from '../services/api';
import toast from 'react-hot-toast';

const PROFILES = {
  quick: { label: 'Quick Scan', ports: 18, time: '~5s', desc: 'Top 18 common ports — fast results' },
  standard: { label: 'Standard Scan', ports: 34, time: '~15s', desc: 'Top 34 ports including databases, admin panels' },
  full: { label: 'Full Scan', ports: 1024, time: '~2min', desc: 'All 1024 well-known ports — comprehensive' },
};

const RISK_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  info: '#6b7280',
};

const STATE_COLORS = {
  open: '#22c55e',
  closed: '#374151',
  filtered: '#eab308',
};

export default function PortScanner() {
  const [target, setTarget] = useState('');
  const [profile, setProfile] = useState('standard');
  const [scanning, setScanning] = useState(false);
  const [scanId, setScanId] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activeTab, setActiveTab] = useState('ports');
  const [expandedVuln, setExpandedVuln] = useState(null);
  const [history, setHistory] = useState([]);
  const [consent, setConsent] = useState(false);
  const pollRef = useRef(null);

  // Load scan history on mount
  useEffect(() => {
    loadHistory();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const loadHistory = async () => {
    try {
      const { data } = await getPortScans();
      setHistory(data);
    } catch { /* ignore */ }
  };

  const handleStartScan = async () => {
    if (!target.trim()) { toast.error('Enter a target hostname or IP'); return; }
    if (!consent) { toast.error('Please acknowledge scan authorization'); return; }

    setScanning(true);
    setScanResult(null);
    setProgress({ scanned: 0, total: PROFILES[profile]?.ports || 34, openCount: 0 });
    setActiveTab('ports');

    try {
      const { data } = await startPortScan(target.trim(), profile);
      setScanId(data.scanId);
      toast.success(`Port scan started on ${data.target}`);

      // Poll for results
      pollRef.current = setInterval(async () => {
        try {
          const { data: result } = await getPortScan(data.scanId);
          setProgress(result.progress);

          if (result.status === 'completed' || result.status === 'failed') {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setScanResult(result);
            setScanning(false);
            loadHistory();
            if (result.status === 'completed') {
              toast.success(`Scan complete — ${result.openPorts?.length || 0} open ports found`);
            } else {
              toast.error(`Scan failed: ${result.error}`);
            }
          }
        } catch {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setScanning(false);
          toast.error('Failed to fetch scan results');
        }
      }, 2000);
    } catch (err) {
      setScanning(false);
      toast.error(err.response?.data?.error || 'Failed to start scan');
    }
  };

  const loadPreviousScan = async (id) => {
    try {
      const { data } = await getPortScan(id);
      setScanResult(data);
      setTarget(data.target);
      setActiveTab('ports');
    } catch {
      toast.error('Failed to load scan');
    }
  };

  const riskScore = scanResult?.vulnAssessment?.riskScore || 0;
  const riskLevel = scanResult?.vulnAssessment?.riskLevel || 'N/A';
  const openPorts = scanResult?.openPorts || [];
  const vulns = scanResult?.vulnAssessment?.vulnerabilities || [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Port Scanner & Vulnerability Assessment</h1>
        <p className="page-subtitle">TCP connect scan with service fingerprinting — 100% local, zero external APIs</p>
      </div>

      <div className="grid-2">
        {/* Left — Scanner Input */}
        <div>
          <motion.div className="card" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>
              <Target size={18} style={{ color: 'var(--brand-primary)' }} /> Target Configuration
            </div>

            {/* Target Input */}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="detail-item-label" style={{ display: 'block', marginBottom: 6 }}>TARGET HOST</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g., scanme.nmap.org or 192.168.1.1"
                value={target}
                onChange={e => setTarget(e.target.value)}
                disabled={scanning}
                style={{ fontFamily: 'var(--font-mono)' }}
                onKeyDown={e => { if (e.key === 'Enter') handleStartScan(); }}
              />
            </div>

            {/* Scan Profile */}
            <label className="detail-item-label" style={{ display: 'block', marginBottom: 8 }}>SCAN PROFILE</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {Object.entries(PROFILES).map(([key, info]) => (
                <motion.button
                  key={key}
                  className={`btn ${profile === key ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setProfile(key)}
                  disabled={scanning}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    textAlign: 'left', padding: '10px 14px', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{info.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{info.desc}</div>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', opacity: 0.8 }}>
                    {info.ports} ports • {info.time}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Consent */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginBottom: 16 }}>
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={scanning}
                style={{ marginTop: 2, accentColor: 'var(--brand-primary)' }} />
              <span>I confirm I have authorization to scan this target. Unauthorized scanning may violate computer fraud laws.</span>
            </label>

            {/* Start Button */}
            <motion.button
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px 16px', fontSize: 14, fontWeight: 600 }}
              onClick={handleStartScan}
              disabled={scanning || !target.trim() || !consent}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
            >
              {scanning ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Scanning...</>
              ) : (
                <><Radar size={16} /> Launch Port Scan</>
              )}
            </motion.button>

            {/* Progress */}
            <AnimatePresence>
              {scanning && progress && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    <span>Scanning ports...</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {progress.scanned}/{progress.total} • {progress.openCount} open
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                    <motion.div
                      style={{ height: '100%', background: 'var(--brand-primary)', borderRadius: 3 }}
                      animate={{ width: `${progress.total > 0 ? (progress.scanned / progress.total) * 100 : 0}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Radio size={10} style={{ color: '#22c55e' }} /> {progress.openCount} open
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Activity size={10} /> {progress.scanned - progress.openCount} closed/filtered
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Scan History */}
          {history.length > 0 && (
            <motion.div className="card" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              style={{ marginTop: 16 }}>
              <div className="card-title" style={{ marginBottom: 12 }}>
                <Clock size={16} style={{ color: 'var(--brand-primary)' }} /> Recent Scans
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {history.slice(0, 8).map(scan => (
                  <motion.button
                    key={scan._id}
                    className="btn btn-secondary"
                    onClick={() => loadPreviousScan(scan._id)}
                    whileHover={{ scale: 1.01 }}
                    style={{
                      textAlign: 'left', padding: '10px 12px', display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center', fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Server size={14} style={{ color: 'var(--brand-primary)' }} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{scan.target}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {scan.profile} • {new Date(scan.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: scan.openPortCount > 5 ? '#fef2f2' : scan.openPortCount > 0 ? '#fffbeb' : '#f0fdf4',
                        color: scan.openPortCount > 5 ? '#dc2626' : scan.openPortCount > 0 ? '#d97706' : '#16a34a',
                      }}>
                        {scan.openPortCount} open
                      </span>
                      {scan.riskLevel && scan.riskLevel !== 'N/A' && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                          background: RISK_COLORS[scan.riskLevel?.toLowerCase()] || '#6b7280',
                          color: '#fff',
                        }}>
                          {scan.riskLevel}
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right — Results */}
        <div>
          {!scanResult && !scanning && (
            <motion.div className="card" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              style={{ textAlign: 'center', padding: '60px 40px' }}>
              <Radar size={56} style={{ color: 'var(--brand-primary)', opacity: 0.3, marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Ready to Scan</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
                Enter a target and select a scan profile to discover open ports, running services, and potential vulnerabilities.
                All scanning is performed locally using Node.js TCP connections.
              </p>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24,
                fontSize: 12, color: 'var(--text-secondary)',
              }}>
                {[
                  { icon: <Wifi size={14} />, text: 'TCP Connect Scan' },
                  { icon: <Eye size={14} />, text: 'Service Fingerprinting' },
                  { icon: <Bug size={14} />, text: 'CVE Assessment' },
                  { icon: <Shield size={14} />, text: 'Quantum Risk Analysis' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <span style={{ color: 'var(--brand-primary)' }}>{item.icon}</span> {item.text}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Scanning Animation */}
          {scanning && !scanResult && (
            <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '50px 30px' }}>
              <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 24px' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: '3px solid var(--border-color)',
                    borderTopColor: 'var(--brand-primary)',
                  }}
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  style={{
                    position: 'absolute', inset: 12, borderRadius: '50%',
                    border: '2px solid var(--border-color)',
                    borderTopColor: '#8b5cf6',
                  }}
                />
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Radar size={28} style={{ color: 'var(--brand-primary)' }} />
                </div>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Scanning {target}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Probing {PROFILES[profile]?.ports || '...'} ports via TCP connect...
              </p>
            </motion.div>
          )}

          {/* Results */}
          {scanResult && scanResult.status === 'completed' && (
            <>
              {/* Stats Bar */}
              <motion.div className="card" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{openPorts.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Open Ports</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{scanResult.portsScanned}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Ports Scanned</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: vulns.length > 0 ? '#ef4444' : '#22c55e' }}>{vulns.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Vulnerabilities</div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: 28, fontWeight: 800,
                      color: riskScore >= 80 ? '#ef4444' : riskScore >= 50 ? '#f97316' : riskScore >= 20 ? '#eab308' : '#22c55e',
                    }}>{riskScore}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Risk Score</div>
                  </div>
                </div>
                <div style={{
                  marginTop: 12, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                  background: riskScore >= 80 ? '#fef2f2' : riskScore >= 50 ? '#fffbeb' : '#f0fdf4',
                  color: riskScore >= 80 ? '#991b1b' : riskScore >= 50 ? '#92400e' : '#166534',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {riskScore >= 80 ? <AlertTriangle size={14} /> : riskScore >= 50 ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                  <span style={{ fontWeight: 600 }}>{riskLevel}</span>
                  <span style={{ opacity: 0.8 }}>
                    — Scanned in {(scanResult.scanDuration / 1000).toFixed(1)}s •
                    {' '}{scanResult.filteredCount} filtered, {scanResult.closedCount} closed
                  </span>
                </div>
              </motion.div>

              {/* Tab Navigation */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                {[
                  { key: 'ports', label: 'Open Ports', icon: <Wifi size={14} />, count: openPorts.length },
                  { key: 'vulns', label: 'Vulnerabilities', icon: <Bug size={14} />, count: vulns.length },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1, padding: '10px 16px', border: 'none', cursor: 'pointer',
                      background: activeTab === tab.key ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                      color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
                      fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 6, transition: 'all 0.2s',
                    }}
                  >
                    {tab.icon} {tab.label}
                    <span style={{
                      fontSize: 11, padding: '1px 6px', borderRadius: 8,
                      background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
                    }}>{tab.count}</span>
                  </button>
                ))}
              </div>

              {/* Port Results Tab */}
              {activeTab === 'ports' && (
                <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="card-title" style={{ marginBottom: 12 }}>
                    <Server size={16} style={{ color: 'var(--brand-primary)' }} /> Discovered Services
                  </div>
                  {openPorts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                      <CheckCircle size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <p>No open ports discovered. Target may be well-protected or behind a firewall.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {openPorts.map((port, i) => (
                        <motion.div
                          key={port.port}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          style={{
                            padding: '12px 14px', borderRadius: 10,
                            border: `1px solid ${port.riskLevel === 'critical' ? '#fecaca' : port.riskLevel === 'high' ? '#fed7aa' : 'var(--border-color)'}`,
                            background: port.riskLevel === 'critical' ? 'rgba(239,68,68,0.03)' : port.riskLevel === 'high' ? 'rgba(249,115,22,0.03)' : 'var(--bg-secondary)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `${RISK_COLORS[port.riskLevel] || '#6b7280'}15`,
                                color: RISK_COLORS[port.riskLevel] || '#6b7280',
                                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                              }}>
                                {port.port}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {port.service}
                                  <span style={{
                                    padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                                    background: RISK_COLORS[port.riskLevel] || '#6b7280',
                                    color: '#fff', textTransform: 'uppercase',
                                  }}>{port.riskLevel}</span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{port.description}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
                              <div style={{ fontFamily: 'var(--font-mono)' }}>{port.responseTime}ms</div>
                              <div style={{ color: '#22c55e', fontWeight: 600 }}>OPEN</div>
                            </div>
                          </div>
                          {port.banner && (
                            <div style={{
                              marginTop: 8, padding: '6px 10px', borderRadius: 6,
                              background: 'var(--bg-tertiary)', fontFamily: 'var(--font-mono)',
                              fontSize: 11, color: 'var(--text-secondary)', wordBreak: 'break-all',
                            }}>
                              Banner: {port.banner.substring(0, 120)}
                            </div>
                          )}
                          {port.quantumNote && (
                            <div style={{
                              marginTop: 6, padding: '6px 10px', borderRadius: 6,
                              background: 'rgba(139,92,246,0.06)', fontSize: 11, color: '#7c3aed',
                              display: 'flex', alignItems: 'flex-start', gap: 6,
                            }}>
                              <Zap size={12} style={{ marginTop: 1, flexShrink: 0 }} />
                              <span><strong>Quantum:</strong> {port.quantumNote}</span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Vulnerabilities Tab */}
              {activeTab === 'vulns' && (
                <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="card-title" style={{ marginBottom: 4 }}>
                    <Bug size={16} style={{ color: '#ef4444' }} /> Vulnerability Assessment
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                    {scanResult.vulnAssessment?.summary}
                  </p>

                  {/* CVSS Distribution */}
                  {vulns.length > 0 && (
                    <div style={{
                      display: 'flex', gap: 12, marginBottom: 16, padding: '12px 14px', borderRadius: 10,
                      background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    }}>
                      {[
                        { label: 'Critical', count: scanResult.vulnAssessment?.criticalCount || 0, color: '#ef4444' },
                        { label: 'High', count: scanResult.vulnAssessment?.highCount || 0, color: '#f97316' },
                        { label: 'Medium', count: scanResult.vulnAssessment?.mediumCount || 0, color: '#eab308' },
                        { label: 'Low', count: scanResult.vulnAssessment?.lowCount || 0, color: '#22c55e' },
                      ].map((item, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.count}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {vulns.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                      <Shield size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <p>No known vulnerabilities found for the discovered services.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {vulns.map((vuln, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          style={{
                            borderRadius: 10, overflow: 'hidden',
                            border: `1px solid ${vuln.severity === 'critical' ? '#fecaca' : vuln.severity === 'high' ? '#fed7aa' : 'var(--border-color)'}`,
                          }}
                        >
                          {/* Vuln Header */}
                          <button
                            onClick={() => setExpandedVuln(expandedVuln === i ? null : i)}
                            style={{
                              width: '100%', padding: '12px 14px', border: 'none', cursor: 'pointer',
                              background: vuln.severity === 'critical' ? 'rgba(239,68,68,0.04)' : 'var(--bg-secondary)',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              color: 'var(--text-primary)', textAlign: 'left',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                              <div style={{
                                padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                                background: RISK_COLORS[vuln.severity], color: '#fff', textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}>{vuln.severity}</div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {vuln.cveId}
                                  {vuln.exploitAvailable && (
                                    <span style={{
                                      padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                                      background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                                    }}>⚡ EXPLOIT</span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                  {vuln.affectedService} (port {vuln.affectedPort}) • CVSS {vuln.cvss.toFixed(1)}
                                </div>
                              </div>
                            </div>
                            {expandedVuln === i ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>

                          {/* Vuln Details */}
                          <AnimatePresence>
                            {expandedVuln === i && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{ overflow: 'hidden' }}
                              >
                                <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
                                    {vuln.description}
                                  </div>
                                  <div style={{
                                    padding: '8px 10px', borderRadius: 6, marginBottom: 8,
                                    background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, color: '#166534',
                                  }}>
                                    <strong>Recommendation:</strong> {vuln.recommendation}
                                  </div>
                                  {vuln.quantumRelevance && (
                                    <div style={{
                                      padding: '8px 10px', borderRadius: 6,
                                      background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
                                      fontSize: 12, color: '#7c3aed',
                                    }}>
                                      <strong>⚛️ Quantum Threat:</strong> {vuln.quantumRelevance}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
