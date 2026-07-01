import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Smartphone, Lock, Eye, EyeOff, Sun, Moon, AlertCircle, Loader2, CheckCircle2, ArrowRight, LockKeyhole } from 'lucide-react';
import logoImg from '../assets/logo.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Local theme state synchronized with document and localStorage
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    if (result.success) {
      if (result.role === 'Field_Tech') {
        navigate('/field-tech');
      } else if (result.role === 'Maintenance_Head') {
        navigate('/allocations');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-split-container" style={{ padding: '1rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', overflow: 'hidden' }}>
      {/* Decorative Animated Mesh Blobs */}
      <div className="auth-bg-shape-1"></div>
      <div className="auth-bg-shape-2"></div>

      {/* Glassmorphic Theme Switcher */}
      <button 
        type="button"
        className="auth-theme-toggle"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>
      
      {/* Centered Auth Card */}
      <div className="auth-card" style={{ width: '100%', maxWidth: '400px', backgroundColor: theme === 'dark' ? 'var(--surface-bg)' : '#ffffff', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08)', zIndex: 10, padding: '2.5rem 2rem' }}>
        {/* Top Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src={logoImg} 
            alt="Aarya Innovtech" 
            style={{ 
              height: '80px', 
              width: 'auto',
              maxWidth: '100%',
              margin: '0 auto 1.25rem auto', 
              display: 'block',
              objectFit: 'contain',
              backgroundColor: theme === 'dark' ? '#ffffff' : 'transparent',
              padding: theme === 'dark' ? '8px 16px' : '0',
              borderRadius: theme === 'dark' ? '12px' : '0'
            }} 
          />
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.3rem', letterSpacing: '-0.02em' }}>Welcome</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Please enter your credentials to access your portal</p>
        </div>

        {/* Form Section */}
        <div>
          {error && (
            <div style={{ backgroundColor: 'var(--bg-danger)', borderLeft: '4px solid var(--danger-color)', color: 'var(--danger-color)', padding: '0.6rem 0.85rem', borderRadius: '0 6px 6px 0', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Mobile Number Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Mobile Number</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Smartphone size={18} className="input-icon" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.75rem', height: '3.25rem', fontSize: '1rem', backgroundColor: 'var(--surface-bg)' }}
                  placeholder="Registered mobile"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Password</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock size={18} className="input-icon" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '2.75rem', height: '3.25rem', fontSize: '1rem', backgroundColor: 'var(--surface-bg)' }}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <a 
                href="#" 
                style={{ color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: '500', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={(e) => { 
                  e.preventDefault(); 
                  alert("Please contact your administrator to reset your password."); 
                }}
              >
                <LockKeyhole size={14} /> Forgot Password?
              </a>
            </div>
            
            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '3.25rem', fontSize: '1rem', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Logging in...
                </>
              ) : (
                <>
                  Login to Continue
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Public Legal Links for Razorpay */}
      <div style={{ position: 'absolute', bottom: '1.5rem', width: '100%', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.75rem', zIndex: 10 }}>
        <a href="/terms-conditions" style={{ color: 'inherit', textDecoration: 'underline' }}>Terms & Conditions</a>
        <span style={{ opacity: 0.5 }}>|</span>
        <a href="/privacy-policy" style={{ color: 'inherit', textDecoration: 'underline' }}>Privacy Policy</a>
        <span style={{ opacity: 0.5 }}>|</span>
        <a href="/refund-policy" style={{ color: 'inherit', textDecoration: 'underline' }}>Refund Policy</a>
        <span style={{ opacity: 0.5 }}>|</span>
        <a href="/contact-us" style={{ color: 'inherit', textDecoration: 'underline' }}>Contact Us</a>
      </div>
    </div>
  );
};

export default Login;
