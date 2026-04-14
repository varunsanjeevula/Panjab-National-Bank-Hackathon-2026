import { useState, useEffect, useRef, useCallback } from 'react';
import { getAiTopology } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Shield, X, RefreshCw, Cpu, Maximize2, ZoomIn, ZoomOut,
  Info, ChevronRight, Lock, Server, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

const PQC_COLORS = {
  'Fully Quantum Safe': '#10b981',
  'Hybrid Ready':       '#3b82f6',
  'Not PQC Ready':      '#ef4444',
  'Quantum Vulnerable': '#f59e0b',
  'Unknown':            '#94a3b8',
};

function getNodeColor(node) {
  if (node.type === 'scanner') return '#6366f1';
  if (node.status === 'failed') return '#94a3b8';
  return PQC_COLORS[node.pqcLabel] || '#94a3b8';
}

function getScoreGradient(score) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function NetworkTopology() {
  const [data, setData] = useState({ nodes: [], links: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: d } = await getAiTopology();
      setData(d);
    } catch (err) {
      toast.error('Failed to load topology');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Arrange nodes in a radial layout
  const layoutNodes = useCallback(() => {
    if (data.nodes.length === 0) return [];

    const cx = 450, cy = 300;
    const assetNodes = data.nodes.filter(n => n.type === 'asset');
    const scannerNode = data.nodes.find(n => n.type === 'scanner');

    const positioned = [];

    if (scannerNode) {
      positioned.push({ ...scannerNode, x: cx, y: cy });
    }

    const radius = Math.max(160, assetNodes.length * 28);
    assetNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / assetNodes.length - Math.PI / 2;
      positioned.push({
        ...node,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      });
    });

    return positioned;
  }, [data.nodes]);

  const positionedNodes = layoutNodes();

  const getNodePos = (id) => {
    const n = positionedNodes.find(n => n.id === id);
    return n ? { x: n.x, y: n.y } : { x: 450, y: 300 };
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(3, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  };

  // Pan handling
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'circle' || e.target.tagName === 'text') return;
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e) => {
    if (!dragStart) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragStart(null);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <div className="spinner spinner-lg" style={{ marginBottom: 16 }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Building network topology...</p>
    </div>
  );

  if (data.nodes.length === 0) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #6366f110, #8b5cf610)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Globe size={28} style={{ color: '#6366f1' }} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No scan data available</p>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Run a scan first to visualize your network topology</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Globe size={20} />
            </div>
            Interactive Network Topology
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Force-directed visualization of {data.nodes.length - 1} scanned assets • Avg score: {data.stats?.avgScore || 0}/100
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border-light)', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border-light)', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <ZoomOut size={16} />
          </button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border-light)', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Maximize2 size={16} />
          </button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border-light)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            <RefreshCw size={14} /> Refresh
          </motion.button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: '10px 16px', borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>Legend:</span>
        {Object.entries(PQC_COLORS).map(([label, color]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}60` }} />
            {label}
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#6366f1' }} />
          Scanner Hub
        </span>
      </div>

      {/* Topology Canvas */}
      <div ref={containerRef} style={{
        borderRadius: 16, border: '1px solid var(--border-light)', background: 'var(--bg-primary)',
        overflow: 'hidden', position: 'relative', height: 600, cursor: dragStart ? 'grabbing' : 'grab',
      }}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

        {/* Grid background */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle, var(--text-primary) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 900 600"
          style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transition: dragStart ? 'none' : 'transform 0.2s ease' }}>

          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="scannerGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </radialGradient>
          </defs>

          {/* Links */}
          {data.links.map((link, i) => {
            const s = getNodePos(link.source);
            const t = getNodePos(link.target);
            const isCA = link.type === 'ca-link';
            return (
              <g key={`link-${i}`}>
                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={isCA ? '#c7d2fe' : getScoreGradient((link.strength || 0.5) * 100)}
                  strokeWidth={isCA ? 1 : 1.5}
                  strokeDasharray={isCA ? '4,4' : 'none'}
                  opacity={0.4} />
                {/* Animated pulse along link */}
                {!isCA && (
                  <circle r="2" fill={getScoreGradient((link.strength || 0.5) * 100)} opacity={0.6}>
                    <animateMotion dur={`${3 + i * 0.5}s`} repeatCount="indefinite"
                      path={`M${s.x},${s.y} L${t.x},${t.y}`} />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {positionedNodes.map((node) => {
            const color = getNodeColor(node);
            const isScanner = node.type === 'scanner';
            const isHovered = hoveredNode === node.id;
            const r = isScanner ? 28 : (isHovered ? 18 : 14);

            return (
              <g key={node.id} style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); if (!isScanner) setSelectedNode(node); }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}>
                {/* Outer glow ring */}
                <circle cx={node.x} cy={node.y} r={r + 6}
                  fill="none" stroke={color} strokeWidth={1.5} opacity={isHovered ? 0.5 : 0.15}>
                  {!isScanner && <animate attributeName="r" from={r + 4} to={r + 10} dur="2s" repeatCount="indefinite" />}
                  {!isScanner && <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />}
                </circle>

                {/* Main circle */}
                <circle cx={node.x} cy={node.y} r={r}
                  fill={isScanner ? 'url(#scannerGrad)' : color}
                  filter="url(#glow)" opacity={0.9}
                  stroke="#fff" strokeWidth={2} />

                {/* Icon text inside circle */}
                <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="central"
                  fill="#fff" fontSize={isScanner ? 11 : 9} fontWeight="700" fontFamily="var(--font-sans)">
                  {isScanner ? '🛡️' : (node.score ?? '?')}
                </text>

                {/* Label below */}
                <text x={node.x} y={node.y + r + 14} textAnchor="middle" fill="var(--text-secondary)"
                  fontSize={isHovered ? 11 : 9} fontWeight={isHovered ? 600 : 400}
                  fontFamily="var(--font-sans)" style={{ transition: 'all 0.2s' }}>
                  {isScanner ? 'QuantumShield' : (node.label?.length > 22 ? node.label.slice(0, 20) + '…' : node.label)}
                </text>

                {/* TLS version badge */}
                {!isScanner && isHovered && (
                  <>
                    <rect x={node.x - 22} y={node.y - r - 18} width={44} height={14} rx={4} fill={color} opacity={0.8} />
                    <text x={node.x} y={node.y - r - 9} textAnchor="middle" fill="#fff" fontSize={8} fontWeight="600" fontFamily="monospace">
                      {node.tls || 'TLS'}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Stats overlay */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 8 }}>
          {[
            { label: 'Nodes', value: positionedNodes.length, color: '#6366f1' },
            { label: 'Links', value: data.links.length, color: '#8b5cf6' },
            { label: 'Avg Score', value: `${data.stats?.avgScore || 0}`, color: getScoreGradient(data.stats?.avgScore || 0) },
          ].map((s, i) => (
            <div key={i} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
              <span style={{ color: '#6b7280' }}>{s.label}:</span>
              <span style={{ color: '#111827' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Node Detail Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setSelectedNode(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              style={{ width: 440, borderRadius: 20, background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>

              {/* Header with score indicator */}
              <div style={{ padding: '24px 28px 18px', background: `linear-gradient(135deg, ${getNodeColor(selectedNode)}10, ${getNodeColor(selectedNode)}05)`, borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Server size={18} style={{ color: getNodeColor(selectedNode) }} />
                      {selectedNode.label}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{selectedNode.pqcLabel || 'Unknown'}</div>
                  </div>
                  <button onClick={() => setSelectedNode(null)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={14} />
                  </button>
                </div>
                {/* Score bar */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>PQC Readiness Score</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: getScoreGradient(selectedNode.score || 0) }}>{selectedNode.score || 0}/100</span>
                  </div>
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#e5e7eb' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${selectedNode.score || 0}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 4, background: `linear-gradient(135deg, ${getScoreGradient(selectedNode.score || 0)}, ${getScoreGradient(selectedNode.score || 0)}80)` }} />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div style={{ padding: '18px 28px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'TLS Version', value: selectedNode.tls, icon: <Lock size={13} /> },
                    { label: 'Key Algorithm', value: `${selectedNode.keyAlgo}-${selectedNode.keySize}`, icon: <Shield size={13} /> },
                    { label: 'Certificate Issuer', value: selectedNode.issuer?.slice(0, 25), icon: <Globe size={13} /> },
                    { label: 'Cipher Suites', value: `${selectedNode.cipherCount} found`, icon: <Activity size={13} /> },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>
                        {item.icon} {item.label}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>{item.value || 'N/A'}</div>
                    </div>
                  ))}
                </div>
                <a href={`/asset/${selectedNode.id?.replace('asset-', '')}`} style={{ display: 'none' }}>
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    View Full Asset Details <ChevronRight size={14} />
                  </motion.button>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
