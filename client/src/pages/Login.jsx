import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login, register } from '../services/api';
import { Shield, Lock, User, Mail, ArrowRight, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const PASSWORD_RULES = [
  { key: 'minLength', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number (0-9)', test: (p) => /\d/.test(p) },
  { key: 'special', label: 'One special character (!@#$%...)', test: (p) => /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(p) },
];

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLogin) {
      if (!allRulesPassed) {
        toast.error('Password does not meet all requirements');
        return;
      }
      if (!passwordsMatch) {
        toast.error('Passwords do not match');
        return;
      }
    }
    setLoading(true);
    try {
      const res = isLogin
        ? await login(username, password)
        : await register(username, email, password);
      loginUser(res.data.token, res.data.user);
      toast.success(`Welcome, ${res.data.user.username}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="login-logo">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
            style={{
              width: 52, height: 52, borderRadius: 14, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              margin: '0 auto', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Shield size={26} color="white" />
          </motion.div>
          <h1>QuantumShield</h1>
          <p>Post-Quantum Cryptographic Scanner</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <User size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
              Username
            </label>
            <input className="form-input" type="text" placeholder="Enter username"
              value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>

          <AnimatePresence>
            {!isLogin && (
              <motion.div className="form-group"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
              >
                <label className="form-label">
                  <Mail size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
                  Email
                </label>
                <input className="form-input" type="email" placeholder="Enter email"
                  value={email} onChange={(e) => setEmail(e.target.value)} required={!isLogin} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="form-group">
            <label className="form-label">
              <Lock size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
              Password
            </label>
            <input className="form-input" type="password" placeholder="Enter password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {/* Password Requirements Checklist — only shown during registration */}
          <AnimatePresence>
            {!isLogin && password.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  background: 'var(--bg-secondary, #f8f9fb)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 16,
                  border: '1px solid var(--border-light, #e5e7eb)'
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  Password Requirements
                </div>
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(password);
                  return (
                    <div key={rule.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 12 }}>
                      {passed
                        ? <Check size={13} style={{ color: '#22c55e', flexShrink: 0 }} />
                        : <X size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
                      }
                      <span style={{ color: passed ? '#22c55e' : 'var(--text-muted)', transition: 'color 0.2s' }}>
                        {rule.label}
                      </span>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confirm Password — only shown during registration */}
          <AnimatePresence>
            {!isLogin && (
              <motion.div className="form-group"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
              >
                <label className="form-label">
                  <Lock size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
                  Confirm Password
                </label>
                <input className="form-input" type="password" placeholder="Re-enter password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required={!isLogin}
                  style={confirmPassword.length > 0 ? {
                    borderColor: passwordsMatch ? '#22c55e' : '#ef4444',
                    boxShadow: `0 0 0 2px ${passwordsMatch ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`
                  } : {}}
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <X size={12} /> Passwords do not match
                  </div>
                )}
                {passwordsMatch && (
                  <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={12} /> Passwords match
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit" className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 4 }}
            disabled={loading || (!isLogin && (!allRulesPassed || !passwordsMatch))}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          >
            {loading ? <div className="spinner spinner-white" /> : (
              <>{isLogin ? 'Sign In' : 'Create Account'}<ArrowRight size={18} /></>
            )}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={switchMode}
            style={{ color: 'var(--brand-primary)', cursor: 'pointer', fontWeight: 600 }}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </motion.div>
    </div>
  );
}
