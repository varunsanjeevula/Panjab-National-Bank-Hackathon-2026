import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login, register } from '../services/api';
import { Shield, Lock, User, Mail, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
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

          <motion.button
            type="submit" className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 4 }}
            disabled={loading}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          >
            {loading ? <div className="spinner spinner-white" /> : (
              <>{isLogin ? 'Sign In' : 'Create Account'}<ArrowRight size={18} /></>
            )}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => setIsLogin(!isLogin)}
            style={{ color: 'var(--brand-primary)', cursor: 'pointer', fontWeight: 600 }}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </motion.div>
    </div>
  );
}
