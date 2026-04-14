import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login, register } from '../services/api';
import { Shield, Lock, User, Mail, ArrowRight, Check, X, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const PASSWORD_RULES = [
  { key: 'minLength', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number (0-9)', test: (p) => /\d/.test(p) },
  { key: 'special', label: 'One special character (!@#$%...)', test: (p) => /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(p) },
];

/* ── Animated Cyber Grid Canvas ────────────────────────── */
function CyberGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let nodes = [];
    const NODE_COUNT = 45;

    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
      initNodes();
    };

    const initNodes = () => {
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        pulse: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const opacity = (1 - dist / 150) * 0.15;
            ctx.strokeStyle = `rgba(96, 165, 250, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach(node => {
        node.pulse += 0.02;
        const glowSize = Math.sin(node.pulse) * 0.5 + 1;
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 4 * glowSize);
        gradient.addColorStop(0, 'rgba(96, 165, 250, 0.6)');
        gradient.addColorStop(0.5, 'rgba(96, 165, 250, 0.1)');
        gradient.addColorStop(1, 'rgba(96, 165, 250, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 4 * glowSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(147, 197, 253, ${0.7 + Math.sin(node.pulse) * 0.3})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        // Move
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
      });

      animId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="qs-login-canvas" />;
}

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const passwordStrength = PASSWORD_RULES.filter(r => r.test(password)).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLogin) {
      if (!allRulesPassed) { toast.error('Password does not meet all requirements'); return; }
      if (!passwordsMatch) { toast.error('Passwords do not match'); return; }
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

  const switchMode = () => { setIsLogin(!isLogin); setPassword(''); setConfirmPassword(''); };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'][passwordStrength];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'][passwordStrength];

  return (
    <div className="qs-login">
      {/* ═══ Animated Background ═══ */}
      <CyberGrid />
      <div className="qs-login-bg-orb qs-login-bg-orb-1" />
      <div className="qs-login-bg-orb qs-login-bg-orb-2" />
      <div className="qs-login-bg-orb qs-login-bg-orb-3" />

      {/* ═══ Main Content ═══ */}
      <div className="qs-login-inner">
        {/* ── Left Branding ── */}
        <motion.div
          className="qs-login-brand"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="qs-login-brand-top">
            <div className="qs-login-brand-logo">
              <Shield size={24} />
            </div>
            <span className="qs-login-brand-name">QuantumShield</span>
          </div>
          <h1 className="qs-login-headline">
            Post-Quantum<br />
            <span>Cryptographic</span><br />
            Scanner
          </h1>
          <p className="qs-login-subline">
            Proactively identify and remediate cryptographic vulnerabilities
            before quantum computing makes them exploitable.
          </p>
          <div className="qs-login-trust">
            <div className="qs-login-trust-item">
              <div className="qs-login-trust-num">500+</div>
              <div className="qs-login-trust-label">Daily Scans</div>
            </div>
            <div className="qs-login-trust-sep" />
            <div className="qs-login-trust-item">
              <div className="qs-login-trust-num">99.9%</div>
              <div className="qs-login-trust-label">Uptime SLA</div>
            </div>
            <div className="qs-login-trust-sep" />
            <div className="qs-login-trust-item">
              <div className="qs-login-trust-num">256-bit</div>
              <div className="qs-login-trust-label">Encryption</div>
            </div>
          </div>
        </motion.div>

        {/* ── Right Card ── */}
        <motion.div
          className="qs-login-card"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Mobile logo */}
          <div className="qs-login-card-mlogo">
            <div className="qs-login-brand-logo"><Shield size={22} /></div>
            <span>QuantumShield</span>
          </div>

          <div className="qs-login-card-header">
            <AnimatePresence mode="wait">
              <motion.h2
                key={isLogin ? 'si' : 'su'}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
              >
                {isLogin ? 'Sign in' : 'Create account'}
              </motion.h2>
            </AnimatePresence>
            <p>{isLogin ? 'Access your security operations center' : 'Start your post-quantum security journey'}</p>
          </div>

          <form onSubmit={handleSubmit} className="qs-login-form">
            {/* Username */}
            <div className="qs-field">
              <label htmlFor="qs-username"><User size={14} /> Username</label>
              <div className="qs-input-box">
                <input id="qs-username" type="text" placeholder="Enter username"
                  value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" />
              </div>
            </div>

            {/* Email */}
            <AnimatePresence>
              {!isLogin && (
                <motion.div className="qs-field"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                  <label htmlFor="qs-email"><Mail size={14} /> Email</label>
                  <div className="qs-input-box">
                    <input id="qs-email" type="email" placeholder="Enter email"
                      value={email} onChange={e => setEmail(e.target.value)} required={!isLogin} autoComplete="email" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password */}
            <div className="qs-field">
              <label htmlFor="qs-password"><Lock size={14} /> Password</label>
              <div className="qs-input-box">
                <input id="qs-password" type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  autoComplete={isLogin ? 'current-password' : 'new-password'} />
                <button type="button" className="qs-eye" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength */}
              <AnimatePresence>
                {!isLogin && password.length > 0 && (
                  <motion.div className="qs-strength"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                    <div className="qs-strength-track">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="qs-strength-seg"
                          style={{ background: i <= passwordStrength ? strengthColor : 'rgba(255,255,255,0.06)' }} />
                      ))}
                    </div>
                    <span style={{ color: strengthColor }}>{strengthLabel}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Password requirements */}
            <AnimatePresence>
              {!isLogin && password.length > 0 && (
                <motion.div className="qs-reqs"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                  <div className="qs-reqs-title">Password Requirements</div>
                  {PASSWORD_RULES.map(rule => {
                    const ok = rule.test(password);
                    return (
                      <div key={rule.key} className={`qs-req ${ok ? 'ok' : ''}`}>
                        {ok ? <Check size={12} /> : <X size={12} />}
                        <span>{rule.label}</span>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirm */}
            <AnimatePresence>
              {!isLogin && (
                <motion.div className="qs-field"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                  <label htmlFor="qs-confirm"><Lock size={14} /> Confirm Password</label>
                  <div className="qs-input-box" style={confirmPassword.length > 0 ? {
                    borderColor: passwordsMatch ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)',
                    boxShadow: `0 0 0 3px ${passwordsMatch ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'}`,
                  } : {}}>
                    <input id="qs-confirm" type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter password" value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)} required={!isLogin} autoComplete="new-password" />
                    <button type="button" className="qs-eye" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <div className={`qs-match ${passwordsMatch ? 'ok' : ''}`}>
                      {passwordsMatch ? <><Check size={11} /> Passwords match</> : <><X size={11} /> Passwords do not match</>}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button type="submit" className="qs-submit"
              disabled={loading || (!isLogin && (!allRulesPassed || !passwordsMatch))}
              whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
              {loading ? <div className="spinner spinner-white" /> : (
                <>{isLogin ? 'Sign In' : 'Create Account'}<ArrowRight size={17} /></>
              )}
            </motion.button>
          </form>

          <p className="qs-switch">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <span onClick={switchMode}>{isLogin ? 'Sign Up' : 'Sign In'}</span>
          </p>

          <div className="qs-card-footer">
            <Lock size={11} />
            <span>End-to-end encrypted · SOC 2 Compliant</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
