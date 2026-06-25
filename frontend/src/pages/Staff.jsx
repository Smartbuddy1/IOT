import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Search, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import SkeletonTable from '../components/SkeletonTable';

const Staff = ({ isTab = false }) => {
  const [users, setUsers] = useState([]);
  const [states, setStates] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    role: user?.role === 'Maintenance_Head' ? 'Field_Tech' : 'Maintenance_Head',
    status: 1,
    assigned_state: '',
    assigned_client: '',
    assigned_project: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchStates();
    fetchClientsAndProjects();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (error) {
      toast.error('Failed to fetch staff members');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStates = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/locations/states`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (res.data.success) {
        setStates(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch states');
    }
  };

  const fetchClientsAndProjects = async () => {
    try {
      const clientRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/clients`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (clientRes.data.success) setClients(clientRes.data.clients || []);
      
      const projectRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/projects`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (projectRes.data.success) setProjects(projectRes.data.projects || []);
    } catch (error) {
      console.error('Failed to fetch clients or projects for dropdowns');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/users/${editingId}`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
        if (res.data.success) {
          toast.success('User updated successfully');
          setIsModalOpen(false);
          fetchUsers();
        } else {
          toast.error(res.data.message || 'Error updating user');
        }
      } else {
        const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
        if (res.data.success) {
          toast.success(res.data.message);
          setIsModalOpen(false);
          fetchUsers();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save staff member');
    }
  };

  const handleEdit = (staff) => {
    setFormData({
      name: staff.name || '',
      mobile: staff.mobile || '',
      email: staff.email || '',
      password: '', // Blank unless they want to change it
      role: staff.role || (user?.role === 'Maintenance_Head' ? 'Field_Tech' : 'Maintenance_Head'),
      status: staff.status !== undefined ? staff.status : 1,
      assigned_state: staff.assigned_state || '',
      assigned_client: staff.assigned_client || '',
      assigned_project: staff.assigned_project || ''
    });
    setEditingId(staff.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      if (window.confirm('WARNING: This action is permanent. Are you absolutely sure?')) {
        try {
          const res = await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/users/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
          if (res.data.success) {
            toast.success(res.data.message);
            fetchUsers();
          }
        } catch (error) {
          toast.error('Failed to delete user');
        }
      }
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      mobile: '',
      email: '',
      password: '',
      role: user?.role === 'Maintenance_Head' ? 'Field_Tech' : 'Maintenance_Head',
      status: 1,
      assigned_state: '',
      assigned_client: '',
      assigned_project: ''
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const filteredUsers = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.mobile && u.mobile.includes(searchTerm)) ||
    (u.role && u.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={isTab ? "" : "page-container fade-in"}>
      <div className="page-header" style={{ display: 'flex', justifyContent: isTab ? 'flex-end' : 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        {!isTab && (
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Shield color="var(--primary-color)" /> Operations Management
            </h1>
            <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>Manage admin and operation (maintenance) users.</p>
          </div>
        )}
        <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} /> Add User
        </button>
      </div>

      <div className="card">
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
            <input
              type="text"
              placeholder="Search staff by name, mobile or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', outline: 'none' }}
            />
          </div>
        </div>

        {isLoading ? (
          <SkeletonTable columns={6} rows={5} />
        ) : (
          <div className="table-container glass-panel">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Role</th>
                  <th>Jurisdiction (State / Client / Project)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((staff) => (
                    <tr key={staff.id} className="premium-row">
                      <td style={{ fontWeight: '500', color: 'var(--slate-500)' }}>#{staff.id}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: staff.role === 'Admin' ? 'var(--slate-200)' : '#e0e7ff', color: staff.role === 'Admin' ? 'var(--slate-600)' : '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {staff.name ? staff.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--slate-800)' }}>{staff.name || 'N/A'}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>{staff.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: '500', color: 'var(--slate-600)' }}>{staff.mobile}</td>
                      <td>
                        <span className={`badge-glow ${staff.role === 'Admin' ? 'badge-warning' : 'badge-info'}`}>
                          {staff.role}
                        </span>
                      </td>
                      <td>
                        {(staff.role === 'Maintenance_Head' || staff.role === 'Field_Tech') ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span style={{ color: '#10b981', fontWeight: '500', fontSize: '0.85rem' }}>State: {staff.assigned_state || 'All'}</span>
                            <span style={{ color: '#3b82f6', fontWeight: '500', fontSize: '0.85rem' }}>Client: {staff.assigned_client || 'All'}</span>
                            <span style={{ color: '#8b5cf6', fontWeight: '500', fontSize: '0.85rem' }}>Project: {staff.assigned_project || 'All'}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--slate-400)' }}>-</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge-glow ${staff.status === 1 ? 'badge-success' : 'badge-error'}`}>
                          {staff.status === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {(user?.role === 'Admin' || (user?.role === 'Maintenance_Head' && staff.role === 'Field_Tech')) && (
                            <>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', borderRadius: '0.5rem' }} 
                                onClick={() => handleEdit(staff)}
                              >
                                Edit
                              </button>
                              {user.id !== staff.id && (
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', borderRadius: '0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', boxShadow: '0 4px 6px rgba(239,68,68,0.2)' }} 
                                  onClick={() => handleDelete(staff.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="premium-row">
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
                      No users found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit User' : 'Add New User'}>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Name <span style={{color:'red'}}>*</span></label>
              <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. John Doe" />
            </div>
            
            <div className="form-group">
              <label className="form-label">Mobile Number <span style={{color:'red'}}>*</span></label>
              <input type="text" className="form-input" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} required placeholder="10-digit mobile" maxLength="10" />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Email address" autoComplete="off" />
            </div>

            <div className="form-group">
              <label className="form-label">Password {editingId ? '(Leave blank to keep same)' : <span style={{color:"red"}}>*</span>}</label>
              <input type="password" className="form-input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingId} placeholder="Login password" autoComplete="new-password" />
            </div>

            <div className="form-group">
              <label className="form-label">Role <span style={{color:'red'}}>*</span></label>
              <select className="form-input" value={formData.role} onChange={e => {
                setFormData({...formData, role: e.target.value, assigned_state: e.target.value === 'Admin' ? '' : formData.assigned_state})
              }} required disabled={user?.role === 'Maintenance_Head'}>
                {user?.role === 'Admin' && <option value="Admin">Admin (Superuser)</option>}
                {user?.role === 'Admin' && <option value="Maintenance_Head">Maintenance Head</option>}
                <option value="Field_Tech">Field Technician</option>
              </select>
            </div>

            {(formData.role === 'Maintenance_Head' || formData.role === 'Field_Tech') && (
              <>
                <div className="form-group">
                  <label className="form-label">Assign State</label>
                  <select className="form-input" value={formData.assigned_state} onChange={e => setFormData({...formData, assigned_state: e.target.value, assigned_client: '', assigned_project: ''})}>
                    <option value="">-- All States --</option>
                    {states.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Assign Client</label>
                  <select className="form-input" value={formData.assigned_client} onChange={e => setFormData({...formData, assigned_client: e.target.value, assigned_project: ''})}>
                    <option value="">-- All Clients --</option>
                    {clients
                      .filter(c => !formData.assigned_state || c.client_state === formData.assigned_state)
                      .map(c => (
                      <option key={c.id} value={c.client_name}>{c.client_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Project</label>
                  <select className="form-input" value={formData.assigned_project} onChange={e => setFormData({...formData, assigned_project: e.target.value})}>
                    <option value="">-- All Projects --</option>
                    {projects
                      .filter(p => !formData.assigned_client || p.client_name === formData.assigned_client)
                      .map(p => (
                      <option key={p.id} value={p.project_name}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: parseInt(e.target.value)})}>
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} /> {editingId ? 'Update User' : 'Save User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Staff;
