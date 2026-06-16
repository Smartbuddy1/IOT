import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, X, Search, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import SkeletonTable from '../components/SkeletonTable';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: 'client_name', direction: 'asc' });
  const [formData, setFormData] = useState({
    client_name: '', client_phone: '', client_address: '', client_website: '', 
    client_state: '', clinet_district: '', client_city: '', client_type: '', 
    contact_person: '', contact_mobile: '', password: '', contact_email: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  
  // Location states
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);

  const { user } = useAuth();

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/clients`);
      setClients(response.data.clients || []);
    } catch (error) {
      console.error("Failed to fetch clients", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/locations/states`).then(res => setStates(res.data.data || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (formData.client_state) {
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/locations/districts/${formData.client_state}`).then(res => {
        setDistricts(res.data.data || []);
      }).catch(console.error);
    } else {
      setDistricts([]);
      setCities([]);
    }
  }, [formData.client_state]);

  useEffect(() => {
    if (formData.clinet_district) {
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/locations/cities/${formData.clinet_district}`).then(res => {
        setCities(res.data.data || []);
      }).catch(console.error);
    } else {
      setCities([]);
    }
  }, [formData.clinet_district]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setLogoFile(null);
    setFormData({
      client_name: '', client_phone: '', client_address: '', client_website: '', 
      client_state: (user.role === 'Operation' && user.assigned_state) ? user.assigned_state : '', 
      clinet_district: '', client_city: '', client_type: '', 
      contact_person: '', contact_mobile: '', password: '', contact_email: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (client) => {
    setLogoFile(null);
    setFormData({
      ...client,
      client_state: client.client_state || '',
      clinet_district: client.clinet_district || '',
      client_city: client.client_city || ''
    });
    setEditingId(client.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    if (!window.confirm("WARNING: This action is permanent. Are you absolutely sure?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/clients/${id}`);
      toast.success("Client deleted successfully");
      fetchClients();
    } catch (error) {
      console.error("Failed to delete client", error);
      toast.error("Error deleting client");
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    const submitData = new FormData();
    for (const key in formData) {
      submitData.append(key, formData[key] === null ? '' : formData[key]);
    }
    if (logoFile) {
      submitData.append('client_logo_file', logoFile);
    }

    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/clients/${editingId}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("Client updated successfully");
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/clients`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("Client added successfully");
      }
      setIsModalOpen(false);
      fetchClients(); 
    } catch (error) {
      console.error("Failed to save client", error);
      toast.error(error.response?.data?.message || "Error saving client");
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--slate-800)' }}>Clients</h1>
        </div>
        <SkeletonTable columns={5} />
      </div>
    );
  }

  // Pagination & Sorting Logic
  const filteredClients = clients.filter(c => 
    c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.client_city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedClients = [...filteredClients].sort((a, b) => {
    let aVal = a[sortConfig.key] || '';
    let bVal = b[sortConfig.key] || '';
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentClients = sortedClients.slice(startIndex, startIndex + itemsPerPage);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--slate-800)', letterSpacing: '-0.025em' }}>Clients</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>Manage your corporate and individual clients.</p>
        </div>
        {user.role === 'Admin' && (
          <button className="btn btn-primary" onClick={handleOpenModal}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Add Client
          </button>
        )}
      </div>
      <div className="search-container glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
        <Search size={18} color="var(--slate-400)" />
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search clients by Name, Email, or City..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem' }}
        />
      </div>

      <div className="table-container glass-panel">
        <table className="premium-table">
          <thead>
            <tr>
              <th>ID</th>
              <th onClick={() => requestSort('client_name')} style={{cursor: 'pointer'}}>Client Name <ArrowUpDown size={14} style={{verticalAlign: 'middle', marginLeft: '4px'}}/></th>
              <th onClick={() => requestSort('client_phone')} style={{cursor: 'pointer'}}>Phone <ArrowUpDown size={14} style={{verticalAlign: 'middle', marginLeft: '4px'}}/></th>
              <th onClick={() => requestSort('client_city')} style={{cursor: 'pointer'}}>Location <ArrowUpDown size={14} style={{verticalAlign: 'middle', marginLeft: '4px'}}/></th>
              <th onClick={() => requestSort('client_type')} style={{cursor: 'pointer'}}>Type <ArrowUpDown size={14} style={{verticalAlign: 'middle', marginLeft: '4px'}}/></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentClients.length === 0 ? (
              <tr className="premium-row">
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-500)' }}>No clients found.</td>
              </tr>
            ) : (
              currentClients.map((client, idx) => (
                <tr key={client.id} className="premium-row">
                  <td style={{ color: 'var(--slate-500)', fontWeight: '500' }}>{startIndex + idx + 1}</td>
                  <td style={{ fontWeight: '700', color: 'var(--slate-800)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {client.client_logo ? (
                        <img src={client.client_logo} alt="logo" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)', backgroundColor: 'white' }} />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--slate-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-500)', fontSize: '0.8rem', flexShrink: 0 }}>
                          {client.client_name ? client.client_name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      {client.client_name}
                    </div>
                  </td>
                  <td style={{ fontWeight: '500', color: 'var(--slate-600)' }}>{client.client_phone}</td>
                  <td style={{ color: 'var(--slate-600)' }}>{client.client_city ? `${client.client_city}, ${client.client_state}` : 'N/A'}</td>
                  <td>
                    <span className="badge-glow badge-info">
                      {client.client_type || 'N/A'}
                    </span>
                  </td>
                  <td>
                    {user.role === 'Admin' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleEdit(client)} title="Edit">
                          <Edit size={16} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '0.4rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(239,68,68,0.2)' }} onClick={() => handleDelete(client.id)} title="Delete">
                          <Trash2 size={16} color="white" />
                        </button>
                      </div>
                    )}
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Client" : "Client Details"}>
        <form onSubmit={handleAddClient} className="form-grid">
          {/* Section: Basic Info */}
          <div className="full-width" style={{ fontWeight: '600', color: 'var(--slate-800)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Basic Information
          </div>
          
          <div className="form-group full-width">
            <label className="form-label">Client Logo (Optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="form-input" style={{ padding: '0.5rem', background: 'transparent' }} />
          </div>

          <div className="form-group">
            <label className="form-label">Client Name *</label>
            <input type="text" name="client_name" value={formData.client_name || ''} onChange={handleInputChange} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Client Phone *</label>
            <input type="text" name="client_phone" value={formData.client_phone || ''} onChange={handleInputChange} className="form-input" maxLength="10" required />
          </div>
          <div className="form-group full-width">
            <label className="form-label">Client Address *</label>
            <textarea name="client_address" value={formData.client_address || ''} onChange={handleInputChange} className="form-input" rows="2" required></textarea>
          </div>
          <div className="form-group">
            <label className="form-label">Client Website</label>
            <input type="text" name="client_website" value={formData.client_website || ''} onChange={handleInputChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Client Type *</label>
            <select name="client_type" value={formData.client_type || ''} onChange={handleInputChange} className="form-input" required>
              <option value="">-- Select Type --</option>
              <option value="Government">Government</option>
              <option value="Private">Private</option>
              <option value="Individual">Individual</option>
              <option value="NGO">NGO</option>
            </select>
          </div>

          {/* Section: Location */}
          <div className="full-width" style={{ fontWeight: '600', color: 'var(--slate-800)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: '1rem' }}>
            Location Details
          </div>
          <div className="form-group">
            <label className="form-label">State *</label>
            <select 
              name="client_state" 
              value={formData.client_state || ''} 
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
            <label className="form-label">District *</label>
            <select name="clinet_district" value={formData.clinet_district || ''} onChange={handleInputChange} className="form-input" required disabled={!formData.client_state}>
              <option value="">-- Select District --</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">City *</label>
            <select name="client_city" value={formData.client_city || ''} onChange={handleInputChange} className="form-input" required disabled={!formData.clinet_district}>
              <option value="">-- Select City --</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Section: Contact Person */}
          <div className="full-width" style={{ fontWeight: '600', color: 'var(--slate-800)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: '1rem' }}>
            Contact Person Details
          </div>
          <div className="form-group">
            <label className="form-label">Contact Name</label>
            <input type="text" name="contact_person" value={formData.contact_person || ''} onChange={handleInputChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Mobile *</label>
            <input type="text" name="contact_mobile" value={formData.contact_mobile || ''} onChange={handleInputChange} className="form-input" maxLength="10" required />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Email</label>
            <input type="email" name="contact_email" value={formData.contact_email || ''} onChange={handleInputChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Password *</label>
            <input type="text" name="password" value={formData.password || ''} onChange={handleInputChange} className="form-input" minLength="8" maxLength="10" required />
            <small style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>8-10 characters</small>
          </div>

          <div className="full-width" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={formLoading}>
              {formLoading ? 'Saving...' : 'Save Client'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Clients;
