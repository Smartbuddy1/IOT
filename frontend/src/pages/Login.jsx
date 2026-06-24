import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Smartphone, Lock, Eye, EyeOff, Sun, Moon, AlertCircle, Loader2, CheckCircle2, ArrowRight, LockKeyhole } from 'lucide-react';
const logoImg = "/SB_Logo.jpg";

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
    <div className="auth-split-container">
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
      
      {/* Split Auth Card */}
      <div className="auth-split-card animate-entrance">
        {/* Left Side (Gradient Panel with Logo & Features) */}
        <div className="auth-split-left">
          <div className="auth-split-left-top">
            <div className="auth-split-brand">
              <img src={logoImg} alt="SmartBuddy Logo" className="auth-split-logo-img" />
              <span className="auth-split-logo-text">SmartBuddy</span>
            </div>
            
            <div className="auth-split-promo">
              <h2>Secure Access Portal</h2>
              <p>Enterprise-grade authentication system with advanced security features and QR-based access management.</p>
            </div>
          </div>
          
          <div className="auth-features-list">
            <div className="auth-feature-item">
              <CheckCircle2 className="auth-feature-icon" size={18} />
              <span>Multi-factor authentication</span>
            </div>
            <div className="auth-feature-item">
              <CheckCircle2 className="auth-feature-icon" size={18} />
              <span>Encrypted session management</span>
            </div>
            <div className="auth-feature-item">
              <CheckCircle2 className="auth-feature-icon" size={18} />
              <span>Real-time access monitoring</span>
            </div>
            <div className="auth-feature-item">
              <CheckCircle2 className="auth-feature-icon" size={18} />
              <span>Role-based permissions</span>
            </div>
          </div>
        </div>

        {/* Right Side (Form Panel) */}
        <div className="auth-split-right">
          <div className="auth-split-right-header">
            <h2>Welcome Back</h2>
            <p>Please enter your credentials to continue</p>
          </div>

          {/* Error Notification Block */}
          {error && (
            <div className="auth-error">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Username / Mobile Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="username" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                <Smartphone size={16} /> Mobile Number
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="username"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  className="form-input"
                  value={username}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) setUsername(val);
                  }}
                  required
                  autoFocus
                  placeholder="Enter 10-digit mobile number"
                  title="Mobile number must be exactly 10 digits"
                />
              </div>
            </div>
            
            {/* Password Field */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" htmlFor="password" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                <Lock size={16} /> Password
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              <a 
                href="#forgot" 
                className="auth-forgot-link" 
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
              style={{ display: 'flex', gap: '8px', height: '3.5rem', fontSize: '1.05rem', marginTop: '1.25rem' }}
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
