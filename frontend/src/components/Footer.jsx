import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Activity, Zap, ShieldCheck, PhoneCall } from 'lucide-react';
import logoImg from '../assets/e2t_logo.jpeg';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      marginTop: '3.5rem',
      fontFamily: "'Cambria', 'Georgia', serif",
      background: 'var(--card-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid var(--border-color)',
      borderRadius: '1.25rem',
      padding: '2rem 2.5rem',
      boxShadow: '0 10px 30px -10px var(--shadow-color)',
      color: 'var(--text-primary)'
    }}>
      {/* Top Main Section */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '2rem',
        paddingBottom: '1.75rem'
      }}>
        {/* Left: Brand identity & system badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem' }}>
          <img 
            src={logoImg} 
            alt="SmartBuddy Logo" 
            style={{
              height: '52px',
              width: 'auto',
              maxHeight: '52px',
              objectFit: 'contain',
              borderRadius: '8px'
            }} 
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.45rem' }}>
              <span style={{ fontWeight: '800', fontSize: '1.28rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Electronic ECO Toilet
              </span>
              <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: '900',
                fontSize: '1.28rem'
              }}>
                (E2T) Dashboard
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              marginTop: '0.25rem',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}>
              <span>Industrial Telemetry & Machine Operations</span>
              <span style={{ color: 'var(--border-color)' }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontWeight: '600' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 6px #10b981',
                  display: 'inline-block'
                }}></span>
                Live System Active
              </span>
            </div>
          </div>
        </div>

        {/* Right: Enterprise Capabilities Highlights */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '999px',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            color: '#3b82f6',
            fontSize: '0.78rem',
            fontWeight: '600'
          }}>
            <Zap size={14} />
            <span>Real-Time MQTT Telemetry</span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '999px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#10b981',
            fontSize: '0.78rem',
            fontWeight: '600'
          }}>
            <ShieldCheck size={14} />
            <span>Role-Based Enterprise Security</span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '999px',
            backgroundColor: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            color: '#8b5cf6',
            fontSize: '0.78rem',
            fontWeight: '600'
          }}>
            <Activity size={14} />
            <span>24/7 Asset Monitoring</span>
          </div>

          <a
            href="tel:9359604384"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.95rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              color: '#f97316',
              fontSize: '0.78rem',
              fontWeight: '700',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(249, 115, 22, 0.15)'
            }}
            title="Click to dial 24/7 Support Helpline"
          >
            <PhoneCall size={14} />
            <span>Support: 9359604384</span>
          </a>
        </div>
      </div>

      {/* Decorative Divider Line */}
      <div style={{
        height: '1px',
        width: '100%',
        background: 'linear-gradient(90deg, var(--border-color) 0%, rgba(59, 130, 246, 0.35) 50%, var(--border-color) 100%)',
        margin: '0 0 1.5rem 0'
      }} />

      {/* Bottom Legal & Signature Section */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.25rem',
        fontSize: '0.84rem',
        color: 'var(--text-secondary)'
      }}>
        {/* Copyright */}
        <div style={{ fontWeight: '500' }}>
          © {currentYear} <strong style={{ color: 'var(--text-primary)', fontWeight: '700' }}>Electronic ECO Toilet (E2T) Dashboard</strong>. All rights reserved.
        </div>

        {/* Policy Links */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '1.5rem',
          fontWeight: '600'
        }}>
          <Link to="/terms-conditions" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}>
            Terms & Conditions
          </Link>
          <Link to="/privacy-policy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}>
            Privacy Policy
          </Link>
          <Link to="/refund-policy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}>
            Refund Policy
          </Link>
          <Link to="/contact-us" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}>
            Contact Us
          </Link>
          <a href="tel:9359604384" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#f97316', textDecoration: 'none', fontWeight: '700' }}>
            <PhoneCall size={13} /> 9359604384
          </a>
        </div>

        {/* Elegant Architectural Credit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
          <span>Architected by</span>
          <a
            href="https://aaryainnovtech.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#3b82f6',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            Aarya Innovtech <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
