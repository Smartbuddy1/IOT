import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RefundPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container fade-in" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '2rem' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', marginBottom: '2rem', fontWeight: 'bold' }}>
        <ArrowLeft size={20} /> Back
      </button>
      <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>Cancellation & Refund Policy</h1>
        
        <p style={{ color: '#64748b', marginBottom: '1rem', lineHeight: '1.6' }}>Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginTop: '2rem', marginBottom: '1rem' }}>1. General Policy</h2>
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          SmartBuddy provides instant access to automated facilities upon successful payment. Due to the immediate nature of our physical services (e.g., door unlocking), standard transactions are generally non-refundable once the service is rendered.
        </p>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginTop: '2rem', marginBottom: '1rem' }}>2. Failed Transactions & Hardware Issues</h2>
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          If money is debited from your account but our hardware (e.g., the door lock) fails to operate due to network issues or technical faults, you are eligible for a 100% refund.
        </p>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginTop: '2rem', marginBottom: '1rem' }}>3. Refund Process</h2>
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          To claim a refund for a failed hardware response, please contact our support team within 24 hours of the transaction. Provide your transaction ID and the location of the machine. Once verified, refunds will be processed to the original payment method within 5-7 business days.
        </p>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginTop: '2rem', marginBottom: '1rem' }}>4. Cancellations</h2>
        <p style={{ color: '#475569', marginBottom: '1rem', lineHeight: '1.6' }}>
          Once a payment is successfully processed and the IoT command is executed by the machine, the transaction cannot be cancelled.
        </p>
      </div>
    </div>
  );
};

export default RefundPolicy;
