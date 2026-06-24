import React from 'react';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ContactUs = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container fade-in" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '2rem' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', marginBottom: '2rem', fontWeight: 'bold' }}>
        <ArrowLeft size={20} /> Back
      </button>
      <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>Contact Us</h1>
        
        <p style={{ color: '#475569', marginBottom: '2rem', lineHeight: '1.6' }}>
          We are here to help! If you have any questions, payment disputes, or issues with our automated systems, please reach out to our support team using the information below.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ backgroundColor: '#eef2ff', padding: '1rem', borderRadius: '50%', color: '#4f46e5' }}>
              <Mail size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#334155' }}>Email</h3>
              <p style={{ color: '#64748b' }}>admin@smartbuddy.co.in</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ backgroundColor: '#eef2ff', padding: '1rem', borderRadius: '50%', color: '#4f46e5' }}>
              <Phone size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#334155' }}>Phone</h3>
              <p style={{ color: '#64748b' }}>+91 9359604384</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ backgroundColor: '#eef2ff', padding: '1rem', borderRadius: '50%', color: '#4f46e5', marginTop: '0.25rem' }}>
              <MapPin size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#334155' }}>Nashik Office</h3>
              <p style={{ color: '#64748b', lineHeight: '1.5' }}>
                Flat No.4A, Sayali Darshan -A-Wing.<br />
                Radha Nagar, Makhamalabad Road,<br />
                Panchavati, Nashik, Maharashtra-422003
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ backgroundColor: '#eef2ff', padding: '1rem', borderRadius: '50%', color: '#4f46e5', marginTop: '0.25rem' }}>
              <MapPin size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#334155' }}>Mumbai Office</h3>
              <p style={{ color: '#64748b', lineHeight: '1.5' }}>
                Flat No.C-03, The Maharashtra Chs Ltd.<br />
                C Wing Ground Floor, Ambekar Nagar,<br />
                G. D. Ambekar Mark, Parel Mumbai City,<br />
                Maharashtra - 400012
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ backgroundColor: '#eef2ff', padding: '1rem', borderRadius: '50%', color: '#4f46e5', marginTop: '0.25rem' }}>
              <MapPin size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#334155' }}>Factory</h3>
              <p style={{ color: '#64748b', lineHeight: '1.5' }}>
                S-27, Near Emerson, Ambad MIDC,<br />
                Nashik, Maharashtra - 422010
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
