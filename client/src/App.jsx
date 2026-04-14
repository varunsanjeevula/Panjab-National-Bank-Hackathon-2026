import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, LayoutDashboard, Scan, FileText, LogOut, Settings, Clock, CalendarClock, Box, ShieldCheck, Award, Crosshair, Moon, Sun, Map, ClipboardCheck, GitCompareArrows, Route as RouteIcon, ListChecks, ChevronDown, Sparkles, Search, Bell, HelpCircle, ChevronRight, MessageCircle, Brain, Radio, Globe, Radar } from 'lucide-react';
import Login from './pages/Login';
import { ChatProvider, useChat } from './context/ChatContext';
import ChatBot from './components/ChatBot';
import Dashboard from './pages/Dashboard';
import ScanConfig from './pages/ScanConfig';
import ScanResults from './pages/ScanResults';
import AssetDetail from './pages/AssetDetail';
import Reports from './pages/Reports';
import AdminPanel from './pages/AdminPanel';
import ScanHistory from './pages/ScanHistory';
import AssetInventory from './pages/AssetInventory';
import ScheduleManager from './pages/ScheduleManager';
import CbomDashboard from './pages/CbomDashboard';
import CyberRating from './pages/CyberRating';
import PqcPosture from './pages/PqcPosture';
import RiskHeatmap from './pages/RiskHeatmap';
import ComplianceMapping from './pages/ComplianceMapping';
import ScanComparison from './pages/ScanComparison';
import MigrationRoadmap from './pages/MigrationRoadmap';
import RemediationTracker from './pages/RemediationTracker';
import ThreatIntelligence from './pages/ThreatIntelligence';
import NetworkTopology from './pages/NetworkTopology';
import VulnerabilityNarrative from './pages/VulnerabilityNarrative';
import PortScanner from './pages/PortScanner';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
}

function AnalystRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'viewer') return <Navigate to="/dashboard" />;
  return children;
}

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('qs_theme') === 'dark');

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('theme-transition');
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('qs_theme', dark ? 'dark' : 'light');
    setTimeout(() => html.classList.remove('theme-transition'), 350);
  }, [dark]);

  return [dark, () => setDark(d => !d)];
}

function Sidebar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [dark, toggleTheme] = useTheme();
  const [additionalOpen, setAdditionalOpen] = useState(() => {
    const path = window.location.pathname;
    return ['/risk-heatmap', '/compliance', '/compare', '/roadmap', '/remediation', '/port-scanner'].includes(path);
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();
      if (key === 'd') { e.preventDefault(); navigate('/dashboard'); }
      else if (key === 'n' && user?.role !== 'viewer') { e.preventDefault(); navigate('/scan'); }
      else if (key === 'h') { e.preventDefault(); navigate('/history'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, user?.role]);

  const initials = user?.username?.slice(0, 2) || 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><Shield size={18} /></div>
        <div className="sidebar-logo-text">QuantumShield</div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main</div>
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>
        {user?.role !== 'viewer' && (
          <NavLink to="/scan" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Scan size={18} /> New Scan
          </NavLink>
        )}
        <NavLink to="/history" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Clock size={18} /> Scan History
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <FileText size={18} /> Reports
        </NavLink>
        {user?.role !== 'viewer' && (
          <NavLink to="/schedules" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <CalendarClock size={18} /> Scheduling
          </NavLink>
        )}

        <div className="sidebar-section-label">Analytics</div>
        <NavLink to="/asset-inventory" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Box size={18} /> Asset Inventory
        </NavLink>
        <NavLink to="/cbom" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <ShieldCheck size={18} /> CBOM
        </NavLink>
        <NavLink to="/cyber-rating" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Award size={18} /> Cyber Rating
        </NavLink>
        <NavLink to="/pqc-posture" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Crosshair size={18} /> Posture of PQC
        </NavLink>

        {/* Additional Features collapsible section */}
        <button
          className={`sidebar-section-toggle ${additionalOpen ? 'open' : ''}`}
          onClick={() => setAdditionalOpen(o => !o)}
        >
          <Sparkles size={18} /> Additional Features
          <ChevronDown size={14} className="chevron-icon" />
        </button>
        {additionalOpen && (
          <div className="sidebar-section-links">
            <NavLink to="/risk-heatmap" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Map size={16} /> Risk Heatmap
            </NavLink>
            <NavLink to="/compliance" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <ClipboardCheck size={16} /> Compliance
            </NavLink>
            <NavLink to="/compare" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <GitCompareArrows size={16} /> Compare Scans
            </NavLink>
            <NavLink to="/roadmap" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <RouteIcon size={16} /> Roadmap
            </NavLink>
            <NavLink to="/remediation" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <ListChecks size={16} /> Remediation
            </NavLink>
            <NavLink to="/port-scanner" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Radar size={16} /> Port Scanner
            </NavLink>
          </div>
        )}

        {user?.role === 'admin' && (
          <>
            <div className="sidebar-section-label">System</div>
            <NavLink to="/admin" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Settings size={18} /> Admin Panel
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-user">
          <div className="sidebar-footer-avatar">{initials}</div>
          <div className="sidebar-footer-info">
            <div className="sidebar-footer-name">{user?.username}</div>
            <div className="sidebar-footer-role">{user?.role}</div>
          </div>
          <div className="sidebar-footer-actions">
            <button className="sidebar-footer-btn" onClick={toggleTheme}
              title={dark ? 'Light Mode' : 'Dark Mode'}>
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button className="sidebar-footer-btn danger" onClick={() => { logoutUser(); navigate('/login'); }}
              title="Sign Out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Route label mapping for breadcrumb
const routeLabels = {
  '/dashboard': 'Dashboard',
  '/scan': 'New Scan',
  '/history': 'Scan History',
  '/asset-inventory': 'Asset Inventory',
  '/cbom': 'CBOM',
  '/cyber-rating': 'Cyber Rating',
  '/pqc-posture': 'Posture of PQC',
  '/reports': 'Reports',
  '/schedules': 'Scheduling',
  '/admin': 'Admin Panel',
  '/risk-heatmap': 'Risk Heatmap',
  '/compliance': 'Compliance',
  '/compare': 'Compare Scans',
  '/roadmap': 'Migration Roadmap',
  '/remediation': 'Remediation Tracker',
  '/ai/threat-feed': 'Threat Intelligence',
  '/ai/topology': 'Network Topology',
  '/ai/narrative': 'AI Vulnerability Narrative',
  '/port-scanner': 'Port Scanner',
};

function TopHeader() {
  const { user } = useAuth();
  const location = window.location.pathname;
  const pageName = routeLabels[location] || 'QuantumShield';
  const initials = user?.username?.slice(0, 2) || 'U';

  return (
    <header className="top-header">
      <div className="top-header-left">
        <div className="breadcrumb">
          <span>QuantumShield</span>
          <ChevronRight size={14} />
          <span className="breadcrumb-current">{pageName}</span>
        </div>
        <div className="header-search">
          <Search size={14} className="header-search-icon" />
          <input type="text" placeholder="Search features... (Ctrl+K)" />
        </div>
      </div>
      <div className="top-header-right">
        <AiFeaturesDropdown />
        <button className="header-icon-btn" title="Notifications">
          <Bell size={18} />
          <span className="badge-dot"></span>
        </button>
        <button className="header-icon-btn" title="Help">
          <HelpCircle size={18} />
        </button>
        <ChatHeaderButton />
        <div className="header-divider"></div>
        <div className="header-user">
          <div className="header-user-avatar">{initials}</div>
          <div className="header-user-info">
            <span className="header-user-name">{user?.username}</span>
            <span className="header-user-role">{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function ChatHeaderButton() {
  const { toggleChat } = useChat();
  return (
    <button className="header-icon-btn header-chat-btn" onClick={toggleChat} title="AI Assistant (Ctrl+/)">
      <MessageCircle size={18} />
      <span className="badge-dot"></span>
    </button>
  );
}

function AiFeaturesDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const features = [
    { path: '/ai/threat-feed', label: 'Threat Intelligence', desc: 'Real-time quantum threat monitoring', icon: <Radio size={16} />, color: '#ef4444' },
    { path: '/ai/topology', label: 'Network Topology', desc: 'Interactive asset visualization', icon: <Globe size={16} />, color: '#6366f1' },
    { path: '/ai/narrative', label: 'Vulnerability Narrative', desc: 'AI-generated security briefing', icon: <Brain size={16} />, color: '#8b5cf6' },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 10,
          border: '1px solid', borderColor: open ? '#818cf8' : 'var(--border-light)',
          background: open ? 'linear-gradient(135deg, #6366f110, #8b5cf610)' : 'var(--bg-primary)',
          color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          transition: 'all 0.2s',
        }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Brain size={12} color="#fff" />
        </div>
        AI Features
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 300,
              borderRadius: 16, background: '#fff', border: '1px solid #e5e7eb',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)', zIndex: 100, overflow: 'hidden',
            }}>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} style={{ color: '#8b5cf6' }} /> AI-Powered Features
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Privacy-safe local intelligence engine</div>
            </div>
            <div style={{ padding: '8px' }}>
              {features.map((f, i) => (
                <motion.div key={f.path}
                  whileHover={{ backgroundColor: '#f9fafb' }}
                  onClick={() => { navigate(f.path); setOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px', borderRadius: 10,
                    cursor: 'pointer', color: 'inherit', transition: 'all 0.15s',
                  }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${f.color}10`, color: f.color, flexShrink: 0 }}>
                    {f.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{f.desc}</div>
                  </div>
                  <ChevronRight size={14} style={{ color: '#d1d5db' }} />
                </motion.div>
              ))}
            </div>
            <div style={{ padding: '10px 16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>✨ Cross-referenced with your live scan data</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <TopHeader />
      <main className="main-content">{children}</main>
      <ChatBot />
    </div>
  );
}

export default function App() {
  const isDark = localStorage.getItem('qs_theme') === 'dark';

  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'var(--font-sans)',
            background: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f1f5f9' : '#0f172a',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)',
            borderRadius: 12,
            fontSize: 14,
            padding: '12px 16px'
          }
        }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><ChatProvider><AppLayout><Dashboard /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/scan" element={<AnalystRoute><ChatProvider><AppLayout><ScanConfig /></AppLayout></ChatProvider></AnalystRoute>} />
          <Route path="/history" element={<ProtectedRoute><ChatProvider><AppLayout><ScanHistory /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/asset-inventory" element={<ProtectedRoute><ChatProvider><AppLayout><AssetInventory /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/cbom" element={<ProtectedRoute><ChatProvider><AppLayout><CbomDashboard /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/cyber-rating" element={<ProtectedRoute><ChatProvider><AppLayout><CyberRating /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/pqc-posture" element={<ProtectedRoute><ChatProvider><AppLayout><PqcPosture /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/results/:id" element={<ProtectedRoute><ChatProvider><AppLayout><ScanResults /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/asset/:id" element={<ProtectedRoute><ChatProvider><AppLayout><AssetDetail /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/risk-heatmap" element={<ProtectedRoute><ChatProvider><AppLayout><RiskHeatmap /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/compliance" element={<ProtectedRoute><ChatProvider><AppLayout><ComplianceMapping /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute><ChatProvider><AppLayout><ScanComparison /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/roadmap" element={<ProtectedRoute><ChatProvider><AppLayout><MigrationRoadmap /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/remediation" element={<ProtectedRoute><ChatProvider><AppLayout><RemediationTracker /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/port-scanner" element={<AnalystRoute><ChatProvider><AppLayout><PortScanner /></AppLayout></ChatProvider></AnalystRoute>} />
          <Route path="/ai/threat-feed" element={<ProtectedRoute><ChatProvider><AppLayout><ThreatIntelligence /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/ai/topology" element={<ProtectedRoute><ChatProvider><AppLayout><NetworkTopology /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/ai/narrative" element={<ProtectedRoute><ChatProvider><AppLayout><VulnerabilityNarrative /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ChatProvider><AppLayout><Reports /></AppLayout></ChatProvider></ProtectedRoute>} />
          <Route path="/schedules" element={<AnalystRoute><ChatProvider><AppLayout><ScheduleManager /></AppLayout></ChatProvider></AnalystRoute>} />
          <Route path="/admin" element={<AdminRoute><ChatProvider><AppLayout><AdminPanel /></AppLayout></ChatProvider></AdminRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
