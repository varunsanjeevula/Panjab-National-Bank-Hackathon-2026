import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { Shield, LayoutDashboard, Scan, FileText, LogOut } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ScanConfig from './pages/ScanConfig';
import ScanResults from './pages/ScanResults';
import AssetDetail from './pages/AssetDetail';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;
  return user ? children : <Navigate to="/login" />;
}

function Sidebar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><Shield size={20} /></div>
        <div className="sidebar-logo-text">QuantumShield</div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>
        <NavLink to="/scan" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Scan size={20} /> New Scan
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <FileText size={20} /> Reports
        </NavLink>
      </nav>

      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16, marginTop: 8 }}>
        <div style={{ padding: '8px 14px', marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.username}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
        </div>
        <button className="sidebar-link" onClick={() => { logoutUser(); navigate('/login'); }}
          style={{ color: 'var(--color-danger)' }}>
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </aside>
  );
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          duration: 3500,
          style: { fontFamily: 'var(--font-sans)', background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)', borderRadius: 12, fontSize: 14, padding: '12px 16px' }
        }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/scan" element={<ProtectedRoute><AppLayout><ScanConfig /></AppLayout></ProtectedRoute>} />
          <Route path="/results/:id" element={<ProtectedRoute><AppLayout><ScanResults /></AppLayout></ProtectedRoute>} />
          <Route path="/asset/:id" element={<ProtectedRoute><AppLayout><AssetDetail /></AppLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
