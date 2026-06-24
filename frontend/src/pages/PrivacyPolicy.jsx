import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container fade-in" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '2rem' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', marginBottom: '2rem', fontWeight: 'bold' }}>
        <ArrowLeft size={20} /> Back
      </button>
      <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>Privacy Policy</h1>
        
        <p style={{ color: '#64748b', marginBottom: '1rem', lineHeight: '1.6' }}>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginTop: '2rem', marginBottom: '1rem' }}>1. Information We Collect</h2>
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          We collect information that you provide directly to us when making a transaction. This includes standard payment data required by payment gateways (such as UPI ID or masked card numbers) and transaction timestamps. We do not store full credit card details.
        </p>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginTop: '2rem', marginBottom: '1rem' }}>2. How We Use Your Information</h2>
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          The information we collect is used to:
          <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
            <li>Process transactions securely.</li>
            <li>Activate IoT hardware (e.g., unlocking doors) based on payment success.</li>
            <li>Provide customer support and resolve payment disputes.</li>
          </ul>
        </p>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginTop: '2rem', marginBottom: '1rem' }}>3. Data Security</h2>
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          We implement a variety of security measures to maintain the safety of your personal information. All payment transactions are processed through Razorpay's secure servers and are encrypted via Secure Socket Layer (SSL) technology.
        </p>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginTop: '2rem', marginBottom: '1rem' }}>4. Data Sharing with Government Entities</h2>
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          SmartBuddy operates these services in partnership with Municipal Corporations and Government Authorities. Aggregated and anonymized usage data, as well as transaction records, may be shared with these governing bodies for auditing, public infrastructure planning, and compliance purposes.
        </p>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginTop: '2rem', marginBottom: '1rem' }}>5. DPDP Act Compliance & Data Localization</h2>
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          We comply strictly with the Digital Personal Data Protection (DPDP) Act of India. All citizen transaction data and logs are localized and stored on secure servers located within the territorial jurisdiction of India. We do not sell, trade, or otherwise transfer your personally identifiable information to commercial third parties.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
