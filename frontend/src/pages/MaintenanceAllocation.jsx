import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import SkeletonTable from '../components/SkeletonTable';

const MaintenanceAllocation = () => {
  const [allocations, setAllocations] = useState([]);
  const [techs, setTechs] = useState([]);
  const [machines, setMachines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({ tech_id: '', machine_id: '' });
  
  // Cascading Filters
  const [selectedState, setSelectedState] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProject, setSelectedProject] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    fetchAllocations();
    fetchMachines();
  }, []);

  const fetchAllocations = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/maintenance/allocations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        setAllocations(res.data.allocations);
        setTechs(res.data.techs);
      }
    } catch (error) {
      toast.error('Failed to fetch allocations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMachines = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/machines`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
        setMachines(res.data.machines || res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch machines');
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!formData.tech_id || !formData.machine_id) {
      return toast.error('Please select both a technician and a machine');
    }
    
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/maintenance/allocate`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setFormData({ tech_id: '', machine_id: '' });
        fetchAllocations();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to allocate machine');
    }
  };

  // Derive unique lists based on selections
  const states = [...new Set(machines.map(m => m.state).filter(Boolean))];
  const clients = [...new Set(machines.filter(m => !selectedState || m.state === selectedState).map(m => m.client_name).filter(Boolean))];
  const projects = [...new Set(machines.filter(m => (!selectedState || m.state === selectedState) && (!selectedClient || m.client_name === selectedClient)).map(m => m.project_name).filter(Boolean))];
  const filteredMachines = machines.filter(m => 
    (!selectedState || m.state === selectedState) &&
    (!selectedClient || m.client_name === selectedClient) &&
    (!selectedProject || m.project_name === selectedProject)
  );

  const handleStateChange = (e) => { setSelectedState(e.target.value); setSelectedClient(''); setSelectedProject(''); setFormData({...formData, machine_id: ''}); };
  const handleClientChange = (e) => { setSelectedClient(e.target.value); setSelectedProject(''); setFormData({...formData, machine_id: ''}); };
  const handleProjectChange = (e) => { setSelectedProject(e.target.value); setFormData({...formData, machine_id: ''}); };

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1e293b' }}>Task Allocation</h1>
      <p style={{ color: '#64748b', marginTop: '0.5rem', marginBottom: '2rem' }}>Assign machines to Field Technicians.</p>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Assign Machine Workflow</h3>
        <form onSubmit={handleAllocate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">1. Select State</label>
              <select className="form-input" value={selectedState} onChange={handleStateChange}>
                <option value="">-- All States --</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">2. Select Client</label>
              <select className="form-input" value={selectedClient} onChange={handleClientChange} disabled={!selectedState && states.length > 0}>
                <option value="">-- All Clients --</option>
                {clients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">3. Select Project</label>
              <select className="form-input" value={selectedProject} onChange={handleProjectChange} disabled={!selectedClient && clients.length > 0}>
                <option value="">-- All Projects --</option>
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#e2e8f0', width: '100%' }}></div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">4. Select Machine <span style={{color:'red'}}>*</span></label>
              <select className="form-input" value={formData.machine_id} onChange={e => setFormData({...formData, machine_id: e.target.value})} required>
                <option value="">-- Select Machine --</option>
                {filteredMachines.map(m => <option key={m.machine_id} value={m.machine_id}>{m.machine_id}</option>)}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">5. Select Field Technician <span style={{color:'red'}}>*</span></label>
              <select className="form-input" value={formData.tech_id} onChange={e => setFormData({...formData, tech_id: e.target.value})} required>
                <option value="">-- Select Technician --</option>
                {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem', height: '42px', minWidth: '150px' }}>Allocate Task</button>
          </div>
        </form>
      </div>

      <div className="card">
        {isLoading ? <SkeletonTable columns={4} rows={3} /> : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Machine ID</th>
                  <th>Project Name</th>
                  <th>Assigned Technician</th>
                  <th>Assigned At</th>
                </tr>
              </thead>
              <tbody>
                {allocations.length > 0 ? allocations.map(a => (
                  <tr key={`${a.machine_id}-${a.tech_id}`} className="premium-row">
                    <td style={{ fontWeight: '600' }}>{a.machine_id}</td>
                    <td>{a.project_name}</td>
                    <td><span className="badge-glow badge-info">{a.tech_name}</span></td>
                    <td>{new Date(a.assigned_at).toLocaleString()}</td>
                  </tr>
                )) : <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No allocations found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceAllocation;
