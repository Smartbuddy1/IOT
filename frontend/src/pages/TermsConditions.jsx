import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container fade-in" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '2rem' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', marginBottom: '2rem', fontWeight: 'bold' }}>
        <ArrowLeft size={20} /> Back
      </button>
      <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>Terms and Conditions</h1>
        
        <p style={{ color: '#64748b', marginBottom: '1rem', lineHeight: '1.6' }}>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginTop: '2rem', marginBottom: '1rem' }}>1. Introduction</h2>
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          Welcome to SmartBuddy. By accessing and using our public toilet payment and automation systems ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
        </p>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginTop: '2rem', marginBottom: '1rem' }}>2. Use of Service & Government Partnership</h2>
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          You agree to use our Services only for lawful purposes. SmartBuddy provides IoT automation and payment collection facilities in official partnership with Municipal Corporations and Government Entities. You are responsible for any payments made through our QR codes or online gateways for utilizing these public facilities.
        </p>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginTop: '2rem', marginBottom: '1rem' }}>3. Payments and Transactions</h2>
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          All payments processed through our platform are securely handled by Razorpay. By initiating a transaction, you agree to their payment terms. We are not responsible for any banking errors, network failures, or delays beyond our control.
        </p>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginTop: '2rem', marginBottom: '1rem' }}>4. Modification of Terms</h2>
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          We reserve the right to change these conditions from time to time as we see fit and your continued use of the site will signify your acceptance of any adjustment to these terms.
        </p>
      </div>
    </div>
  );
};

export default TermsConditions;
