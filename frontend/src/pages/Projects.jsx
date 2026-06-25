import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Search, Edit, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [formData, setFormData] = useState({
    project_name: '', client_name: '', project_starts: '', project_end: '', 
    work_ord_no: '', sale_ord_no: '', project_status: '', remark: '', state: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [states, setStates] = useState([]);
  
  // Dropdowns
  const [clients, setClients] = useState([]);

  const { user } = useAuth();

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/projects`);
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/clients`).then(res => setClients(res.data.clients || [])).catch(console.error);
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/locations/states`).then(res => setStates(res.data.data || [])).catch(console.error);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    let errorMsg = '';

    if (name === 'project_end' || name === 'project_starts') {
      const start = name === 'project_starts' ? value : formData.project_starts;
      const end = name === 'project_end' ? value : formData.project_end;
      if (start && end && new Date(end) < new Date(start)) {
        errorMsg = 'End date cannot be before start date';
      }
    }

    setErrors(prev => {
      const newErrors = { ...prev };
      if (errorMsg) newErrors.project_end = errorMsg;
      else delete newErrors.project_end;
      return newErrors;
    });

    setFormData(newFormData);
  };

  const isFormValid = () => {
    if (Object.keys(errors).length > 0) return false;
    if (!formData.project_name || !formData.client_name || !formData.sale_ord_no || !formData.state || !formData.project_starts || !formData.project_status) return false;
    if (formData.project_status === 'Completed' && !formData.project_end) return false;
    return true;
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setFormData({
      project_name: '', client_name: '', project_starts: '', project_end: '', 
      work_ord_no: '', sale_ord_no: '', project_status: '', remark: '',
      state: (user.role === 'Operation' && user.assigned_state) ? user.assigned_state : ''
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (project) => {
    const fmt = d => d ? new Date(d).toISOString().split('T')[0] : '';
    setFormData({
      ...project,
      project_starts: fmt(project.project_starts),
      project_end: fmt(project.project_end),
      state: project.state || ''
    });
    setEditingId(project.id);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    if (!window.confirm("WARNING: This action is permanent. Are you absolutely sure?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/projects/${id}`);
      fetchProjects();
    } catch (error) {
      console.error("Failed to delete project", error);
      alert("Error deleting project");
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/projects/${editingId}`, formData);
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/projects`, formData);
      }
      setIsModalOpen(false);
      fetchProjects(); 
    } catch (error) {
      console.error("Failed to save project", error);
      alert(error.response?.data?.message || "Error saving project");
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--slate-800)' }}>Projects</h1>
        </div>
        <div className="grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`skel-${i}`} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', height: '200px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton-box" style={{ height: '24px', width: '60%' }}></div>
              <div className="skeleton-box" style={{ height: '16px', width: '40%' }}></div>
              <div className="skeleton-box" style={{ height: '16px', width: '80%', marginTop: 'auto' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <div className="skeleton-box" style={{ height: '16px', width: '30%' }}></div>
                <div className="skeleton-box" style={{ height: '24px', width: '60px', borderRadius: '4px' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Pagination Logic
  const filteredProjects = projects.filter(p => 
    p.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--slate-800)', letterSpacing: '-0.025em' }}>Projects</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>Manage ongoing and completed projects.</p>
        </div>
        {user.role === 'Admin' && (
          <button className="btn btn-primary" onClick={handleOpenModal}>
            Create Project
          </button>
        )}
      </div>

      <div className="search-container glass-panel">
        <Search size={18} color="var(--slate-400)" />
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search projects by Name or Client..." 
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <div className="grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {currentProjects.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--slate-500)', borderRadius: '1rem' }}>
            No projects found.
          </div>
        ) : (
          currentProjects.map((project) => (
            <div key={project.id} className="glass-panel hover-float" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--slate-800)' }}>{project.project_name}</h3>
                <span className={`badge-glow ${project.project_status === 'Completed' ? 'badge-success' : project.project_status === 'Ongoing' ? 'badge-info' : 'badge-warning'}`}>
                  {project.project_status || 'Ongoing'}
                </span>
              </div>
              <p style={{ color: 'var(--slate-600)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Client: <strong>{project.client_name}</strong></p>
              <p style={{ color: 'var(--slate-600)', fontSize: '0.875rem', marginBottom: '1.5rem', flex: 1 }}>{project.remark || 'No remark provided.'}</p>
              
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Start: {project.project_starts ? new Date(project.project_starts).toLocaleDateString() : 'N/A'}</span>
                {user.role === 'Admin' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleEdit(project)} title="Edit">
                      <Edit size={16} />
                    </button>
                    <button className="btn btn-danger" style={{ padding: '0.4rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(239,68,68,0.2)' }} onClick={() => handleDelete(project.id)} title="Delete">
                      <Trash2 size={16} color="white" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination-container">
          <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>Prev</button>
          <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--slate-600)' }}>Page {currentPage} of {totalPages}</span>
          <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Next</button>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Project" : "Project Details"}>
        <form onSubmit={handleAddProject} className="form-grid">
          <div className="form-group">
            <label className="form-label">Client Name *</label>
            <select name="client_name" value={formData.client_name} onChange={handleInputChange} className="form-input" required>
              <option value="">-- Select Client --</option>
              {clients.map(c => <option key={c.id} value={c.client_name}>{c.client_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input type="text" name="project_name" value={formData.project_name} onChange={handleInputChange} className="form-input" maxLength="50" required />
          </div>
          
          <div className="form-group">
            <label className="form-label">Work Order No</label>
            <input type="text" name="work_ord_no" value={formData.work_ord_no} onChange={handleInputChange} className="form-input" maxLength="50" />
          </div>
          <div className="form-group">
            <label className="form-label">Sale Order No *</label>
            <input type="text" name="sale_ord_no" value={formData.sale_ord_no} onChange={handleInputChange} className="form-input" maxLength="50" required />
          </div>
          
          <div className="form-group">
            <label className="form-label">State *</label>
            <select 
              name="state" 
              value={formData.state} 
              onChange={handleInputChange} 
              className="form-input" 
              required
              disabled={user.role === 'Operation' && !!user.assigned_state}
            >
              <option value="">-- Select State --</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Project Start Date *</label>
            <input type="date" name="project_starts" value={formData.project_starts} onChange={handleInputChange} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Project Status *</label>
            <select name="project_status" value={formData.project_status} onChange={handleInputChange} className="form-input" required>
              <option value="">-- Select Status --</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Upcoming">Upcoming</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Project Completed Date</label>
            <input type="date" name="project_end" value={formData.project_end} onChange={handleInputChange} className={`form-input ${errors.project_end ? 'error' : ''}`} disabled={formData.project_status !== 'Completed'} required={formData.project_status === 'Completed'} />
            {errors.project_end && <small style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.project_end}</small>}
          </div>
          <div className="form-group full-width">
            <label className="form-label">Remarks</label>
            <textarea name="remark" value={formData.remark} onChange={handleInputChange} className="form-input" rows="2"></textarea>
          </div>

          <div className="full-width" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={formLoading || !isFormValid()}>
              {formLoading ? 'Saving...' : 'Save Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Projects;
