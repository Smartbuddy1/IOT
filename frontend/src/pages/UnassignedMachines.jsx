import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ArrowUpDown, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import SkeletonTable from '../components/SkeletonTable';
import Modal from '../components/Modal';

const UnassignedMachines = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });

  // For Edit/Assign
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    machine_id: '', client_name: '', project_name: '', status: 'ready', uses_amt: '5', toilet_type: 'Unisex'
  });
  const [formLoading, setFormLoading] = useState(false);

  const { user } = useAuth();

  const fetchUnassignedMachines = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/machines/unassigned/list`);
      setMachines(response.data.machines || []);
    } catch (error) {
      console.error("Failed to fetch unassigned machines", error);
      toast.error("Error fetching unassigned machines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnassignedMachines();
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/clients`).then(res => setClients(res.data.clients || [])).catch(console.error);
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/projects`).then(res => setProjects(res.data.projects || [])).catch(console.error);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'client_name') {
      setFormData({ ...formData, client_name: value, project_name: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleEdit = (machine) => {
    setFormData({
      ...machine,
      uses_amt: machine.uses_amt || '5',
      client_name: machine.client_name || '',
      project_name: machine.project_name || '',
      status: machine.status || 'ready',
      toilet_type: machine.toilet_type || 'Unisex'
    });
    setEditingId(machine.id);
    setIsModalOpen(true);
  };

  const handleAssignMachine = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/machines/${editingId}`, formData);
        toast.success("Machine assigned successfully");
      }
      setIsModalOpen(false);
      fetchUnassignedMachines();
    } catch (error) {
      console.error("Failed to assign machine", error);
      toast.error(error.response?.data?.message || "Error assigning machine");
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--slate-800)' }}>Unassigned Machines</h1>
        </div>
        <SkeletonTable columns={4} />
      </div>
    );
  }

  // Filter projects based on selected client in modal
  const filteredProjects = formData.client_name
    ? projects.filter(p => !p.client_name || p.client_name.trim() === '' || p.client_name.trim().toLowerCase() === formData.client_name.trim().toLowerCase())
    : projects;

  // Pagination & Sorting Logic
  const filteredMachines = machines.filter(m => 
    m.machine_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedMachines = [...filteredMachines].sort((a, b) => {
    let aVal = a[sortConfig.key] || '';
    let bVal = b[sortConfig.key] || '';
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedMachines.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentMachines = sortedMachines.slice(startIndex, startIndex + itemsPerPage);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--slate-800)', letterSpacing: '-0.025em' }}>Unassigned Machines</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>Machines that have connected but are not yet assigned to any client.</p>
        </div>
      </div>
      
      <div className="search-container glass-panel">
        <Search size={18} color="var(--slate-400)" />
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search by Machine ID..." 
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <div className="table-container glass-panel">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th onClick={() => requestSort('machine_id')} style={{cursor: 'pointer'}}>Machine ID <ArrowUpDown size={14} style={{verticalAlign: 'middle', marginLeft: '4px'}}/></th>
              <th onClick={() => requestSort('uses_amt')} style={{cursor: 'pointer'}}>Amount <ArrowUpDown size={14} style={{verticalAlign: 'middle', marginLeft: '4px'}}/></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentMachines.length === 0 ? (
              <tr className="premium-row">
                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                  No unassigned machines found.
                </td>
              </tr>
            ) : (
              currentMachines.map((machine, idx) => (
                <tr key={machine.id} className="premium-row">
                  <td style={{ color: 'var(--slate-500)', fontWeight: '500' }}>{startIndex + idx + 1}</td>
                  <td style={{ fontWeight: '700', color: 'var(--slate-800)' }}>{machine.machine_id}</td>
                  <td style={{ fontWeight: '700', color: 'var(--slate-800)' }}>₹ {machine.uses_amt || '0'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {user.role === 'Admin' && (
                        <button className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleEdit(machine)} title="Assign to Client">
                          <Edit size={16} /> Assign
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-container">
          <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>Prev</button>
          <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--slate-600)' }}>Page {currentPage} of {totalPages}</span>
          <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Next</button>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign Machine">
        <form onSubmit={handleAssignMachine} className="form-grid">
          <div className="form-group full-width">
            <label className="form-label">Machine ID</label>
            <input type="text" value={formData.machine_id} className="form-input" disabled />
          </div>
          
          <div className="form-group full-width">
            <label className="form-label">Client Name *</label>
            <select name="client_name" value={formData.client_name} onChange={handleInputChange} className="form-input" required>
              <option value="">-- Select Client --</option>
              {clients.map(c => <option key={c.id} value={c.client_name}>{c.client_name}</option>)}
            </select>
          </div>

          <div className="form-group full-width">
            <label className="form-label">Project Name</label>
            <select name="project_name" value={formData.project_name} onChange={handleInputChange} className="form-input">
              <option value="">-- Select Project --</option>
              {filteredProjects.map(p => <option key={p.id} value={p.project_name}>{p.project_name}</option>)}
            </select>
          </div>

          <div className="form-group full-width">
            <label className="form-label">Toilet Type</label>
            <select name="toilet_type" value={formData.toilet_type || 'Unisex'} onChange={handleInputChange} className="form-input">
              <option value="Unisex">Unisex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="full-width" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={formLoading || !formData.client_name}>
              {formLoading ? 'Saving...' : 'Assign Client'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default UnassignedMachines;
