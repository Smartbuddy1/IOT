import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Shield } from 'lucide-react';
import Clients from './Clients';
import Staff from './Staff';

const UserManagement = () => {
  const { user } = useAuth();
  
  // Determine available tabs
  const canSeeClients = ['Admin', 'Field_Tech'].includes(user.role);
  const canSeeStaff = ['Admin', 'Maintenance_Head'].includes(user.role);
  
  const [activeTab, setActiveTab] = useState(canSeeClients ? 'clients' : 'staff');

  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users color="var(--primary-color)" /> User Management
          </h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>Manage all system users, clients, and operations staff.</p>
        </div>
      </div>

      {canSeeClients && canSeeStaff && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('clients')}
            style={{ 
              padding: '0.5rem 1rem', 
              background: 'transparent', 
              border: 'none', 
              borderBottom: activeTab === 'clients' ? '3px solid #4338ca' : '3px solid transparent',
              color: activeTab === 'clients' ? '#4338ca' : '#64748b',
              fontWeight: activeTab === 'clients' ? 'bold' : 'normal',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            <Users size={18} /> Clients
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            style={{ 
              padding: '0.5rem 1rem', 
              background: 'transparent', 
              border: 'none', 
              borderBottom: activeTab === 'staff' ? '3px solid #4338ca' : '3px solid transparent',
              color: activeTab === 'staff' ? '#4338ca' : '#64748b',
              fontWeight: activeTab === 'staff' ? 'bold' : 'normal',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            <Shield size={18} /> Operations Staff (Technicians)
          </button>
        </div>
      )}

      {activeTab === 'clients' && canSeeClients && <Clients isTab={true} />}
      {activeTab === 'staff' && canSeeStaff && <Staff isTab={true} />}
    </div>
  );
};

export default UserManagement;
