import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Search, ArrowUpDown, Eye, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import SkeletonTable from '../components/SkeletonTable';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';

const Machines = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMachine, setViewMachine] = useState(null);
  const [qrMachine, setQrMachine] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: 'machine_id', direction: 'asc' });
  const [formData, setFormData] = useState({
    machine_id: '', client_name: '', state: '', district: '', city: '', address: '', inst_address: '',
    project_name: '', po_date: '', dispatch_date: '', installation_date: '', status: 'ready',
    wall_clean: 'En', seats: '', flush_time: '5', floor_time: '5', wall_time: '', uses_amt: '5',
    free: 'No', coin: 'Yes', upi: 'Yes', smart_card: 'No', digital_token: 'No', gps_lat: '', gps_lng: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Dropdown states
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);

  const { user } = useAuth();

  const fetchMachines = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/machines`);
      setMachines(response.data.machines || []);
    } catch (error) {
      console.error("Failed to fetch machines", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/clients`).then(res => setClients(res.data.clients || [])).catch(console.error);
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/projects`).then(res => setProjects(res.data.projects || [])).catch(console.error);
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/locations/states`).then(res => setStatesList(res.data.data || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (formData.state) {
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/locations/districts/${formData.state}`).then(res => {
        setDistrictsList(res.data.data || []);
      }).catch(console.error);
    } else {
      setDistrictsList([]);
      setCitiesList([]);
    }
  }, [formData.state]);

  useEffect(() => {
    if (formData.district) {
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/locations/cities/${formData.district}`).then(res => {
        setCitiesList(res.data.data || []);
      }).catch(console.error);
    } else {
      setCitiesList([]);
    }
  }, [formData.district]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let errorMsg = '';

    if (name === 'machine_id' && value) {
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        errorMsg = 'Only letters, numbers, hyphens, and underscores allowed';
      }
    }

    setErrors(prev => {
      const newErrors = { ...prev };
      if (errorMsg) newErrors[name] = errorMsg;
      else delete newErrors[name];
      return newErrors;
    });

    setFormData({ ...formData, [name]: value });
  };

  const isFormValid = () => {
    if (Object.keys(errors).length > 0) return false;
    if (!formData.machine_id || !formData.status || !formData.client_name || !formData.project_name || !formData.state || !formData.district || !formData.city) return false;
    return true;
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setFormData({
      machine_id: '', client_name: '', state: (user.role === 'Operation' && user.assigned_state) ? user.assigned_state : '', district: '', city: '', address: '', inst_address: '',
      project_name: '', po_date: '', dispatch_date: '', installation_date: '', status: 'ready',
      wall_clean: 'En', seats: '', flush_time: '5', floor_time: '5', wall_time: '', uses_amt: '5',
      free: 'No', coin: 'Yes', upi: 'Yes', smart_card: 'No', digital_token: 'No', gps_lat: '', gps_lng: ''
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (machine) => {
    const fmt = m => m ? new Date(m).toISOString().split('T')[0] : '';
    setFormData({
      ...machine,
      po_date: fmt(machine.po_date),
      dispatch_date: fmt(machine.dispatch_date),
      installation_date: fmt(machine.installation_date),
      uses_amt: machine.uses_amt || '',
      flush_time: machine.flush_time || '',
      floor_time: machine.floor_time || '',
      gps_lat: machine.gps_lat || '',
      gps_lng: machine.gps_lng || ''
    });
    setEditingId(machine.id);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this machine?")) return;
    if (!window.confirm("WARNING: This action is permanent. Are you absolutely sure?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/machines/${id}`);
      toast.success("Machine deleted successfully");
      fetchMachines();
    } catch (error) {
      console.error("Failed to delete machine", error);
      toast.error("Error deleting machine");
    }
  };

  const handleAddMachine = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/machines/${editingId}`, formData);
        toast.success("Machine updated successfully");
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/machines`, formData);
        toast.success("Machine added successfully");
      }
      setIsModalOpen(false);
      fetchMachines();
    } catch (error) {
      console.error("Failed to save machine", error);
      toast.error(error.response?.data?.message || "Error saving machine");
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--slate-800)' }}>Machines</h1>
        </div>
        <SkeletonTable columns={8} />
      </div>
    );
  }

  // Pagination & Sorting Logic
  const filteredMachines = machines.filter(m => 
    m.machine_id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--slate-800)', letterSpacing: '-0.025em' }}>Machines</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>Manage and configure your registered IoT machines.</p>
        </div>
        {user.role === 'Admin' && (
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            Register Machine
          </button>
        )}
      </div>
      <div className="search-container glass-panel">
        <Search size={18} color="var(--slate-400)" />
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search machines by ID, Client, or Project..." 
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
              <th onClick={() => requestSort('status')} style={{cursor: 'pointer'}}>Status <ArrowUpDown size={14} style={{verticalAlign: 'middle', marginLeft: '4px'}}/></th>
              <th onClick={() => requestSort('uses_amt')} style={{cursor: 'pointer'}}>Assigned Amount <ArrowUpDown size={14} style={{verticalAlign: 'middle', marginLeft: '4px'}}/></th>
              <th onClick={() => requestSort('client_name')} style={{cursor: 'pointer'}}>Assigned Client <ArrowUpDown size={14} style={{verticalAlign: 'middle', marginLeft: '4px'}}/></th>
              <th onClick={() => requestSort('project_name')} style={{cursor: 'pointer'}}>Project Name <ArrowUpDown size={14} style={{verticalAlign: 'middle', marginLeft: '4px'}}/></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentMachines.length === 0 ? (
              <tr className="premium-row">
                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                  No machines found.
                </td>
              </tr>
            ) : (
              currentMachines.map((machine, idx) => (
                <tr key={machine.id} className="premium-row">
                  <td style={{ color: 'var(--slate-500)', fontWeight: '500' }}>{startIndex + idx + 1}</td>
                  <td style={{ fontWeight: '700', color: 'var(--slate-800)' }}>{machine.machine_id}</td>
                  <td>
                    <span className={`badge-glow ${
                      machine.status === 'active' ? 'active' : 
                      machine.status === 'ready' ? 'active' : 
                      machine.status === 'maintenance' ? 'maintenance' : 
                      machine.status === 'busy' ? 'maintenance' : 'failed'
                    }`}>
                      {machine.status === 'active' ? 'Active' : 
                       machine.status === 'ready' ? 'Ready' : 
                       machine.status === 'maintenance' ? 'Maintenance' : 
                       machine.status === 'busy' ? 'Busy' : 'Failed'}
                    </span>
                  </td>
                  <td style={{ fontWeight: '700', color: 'var(--slate-800)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ₹ {machine.uses_amt || '0'}
                    </div>
                  </td>
                  <td style={{ color: 'var(--slate-600)' }}>{machine.client_name || '-'}</td>
                  <td style={{ color: 'var(--slate-600)' }}>{machine.project_name || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.4rem', backgroundColor: '#3b82f6', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        onClick={() => setViewMachine(machine)} 
                        title="View Details"
                      >
                        <Eye size={16} color="white" />
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.4rem', backgroundColor: '#10b981', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        onClick={() => setQrMachine(machine)} 
                        title="Machine QR Code"
                      >
                        <QrCode size={16} color="white" />
                      </button>
                      {user.role === 'Admin' && (
                        <>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleEdit(machine)} title="Edit">
                            <Edit size={16} />
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.4rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(239,68,68,0.2)' }} onClick={() => handleDelete(machine.id)} title="Delete">
                            <Trash2 size={16} color="white" />
                          </button>
                        </>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Machine" : "Machine Details"}>
        <form onSubmit={handleAddMachine} className="form-grid">
          {/* Section: Basic Info */}
          <div className="full-width" style={{ fontWeight: '600', color: 'var(--slate-800)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Basic Information</div>
          <div className="form-group">
            <label className="form-label">Machine ID *</label>
            <input type="text" name="machine_id" value={formData.machine_id} onChange={handleInputChange} className={`form-input ${errors.machine_id ? 'error' : ''}`} required />
            {errors.machine_id && <small style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.machine_id}</small>}
          </div>
          <div className="form-group">
            <label className="form-label">Status *</label>
            <select name="status" value={formData.status} onChange={handleInputChange} className="form-input" required>
              <option value="ready">Ready</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Busy">Busy</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Client Name *</label>
            <select name="client_name" value={formData.client_name} onChange={handleInputChange} className="form-input" required>
              <option value="">-- Select Client --</option>
              {clients.map(c => <option key={c.id} value={c.client_name}>{c.client_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <select name="project_name" value={formData.project_name} onChange={handleInputChange} className="form-input" required>
              <option value="">-- Select Project --</option>
              {projects.map(p => <option key={p.id} value={p.project_name}>{p.project_name}</option>)}
            </select>
          </div>

          {/* Section: Location */}
          <div className="full-width" style={{ fontWeight: '600', color: 'var(--slate-800)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: '1rem' }}>Location Details</div>
          <div className="form-group">
            <label className="form-label">State</label>
            <select 
              name="state" 
              value={formData.state} 
              onChange={handleInputChange} 
              className="form-input"
              disabled={user.role === 'Operation' && !!user.assigned_state}
            >
              <option value="">-- Select State --</option>
              {statesList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">District</label>
            <select name="district" value={formData.district} onChange={handleInputChange} className="form-input" disabled={!formData.state}>
              <option value="">-- Select District --</option>
              {districtsList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <select name="city" value={formData.city} onChange={handleInputChange} className="form-input" disabled={!formData.district}>
              <option value="">-- Select City --</option>
              {citiesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea name="address" value={formData.address} onChange={handleInputChange} className="form-input" rows="1"></textarea>
          </div>
          <div className="form-group full-width">
            <label className="form-label">Installation Address</label>
            <textarea name="inst_address" value={formData.inst_address} onChange={handleInputChange} className="form-input" rows="1"></textarea>
          </div>
          <div className="form-group">
            <label className="form-label">GPS Latitude</label>
            <input type="text" name="gps_lat" value={formData.gps_lat} onChange={handleInputChange} className="form-input" placeholder="e.g. 19.0760" />
          </div>
          <div className="form-group">
            <label className="form-label">GPS Longitude</label>
            <input type="text" name="gps_lng" value={formData.gps_lng} onChange={handleInputChange} className="form-input" placeholder="e.g. 72.8777" />
          </div>

          {/* Section: Dates */}
          <div className="full-width" style={{ fontWeight: '600', color: 'var(--slate-800)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: '1rem' }}>Timeline</div>
          <div className="form-group">
            <label className="form-label">PO Date</label>
            <input type="date" name="po_date" value={formData.po_date} onChange={handleInputChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Dispatch Date</label>
            <input type="date" name="dispatch_date" value={formData.dispatch_date} onChange={handleInputChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Installation Date</label>
            <input type="date" name="installation_date" value={formData.installation_date} onChange={handleInputChange} className="form-input" />
          </div>

          {/* Section: Configuration & Pricing */}
          <div className="full-width" style={{ fontWeight: '600', color: 'var(--slate-800)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: '1rem' }}>Configuration & Pricing</div>
          <div className="form-group">
            <label className="form-label">Uses Amount (₹) *</label>
            <input 
              type="number" 
              name="uses_amt" 
              value={formData.uses_amt} 
              onChange={handleInputChange} 
              className="form-input" 
              required 
              disabled={formData.free === 'Yes'} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Wall Clean Mode</label>
            <select name="wall_clean" value={formData.wall_clean} onChange={handleInputChange} className="form-input">
              <option value="En">Enable</option>
              <option value="Dis">Disable</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Flush Time (s)</label>
            <input type="number" name="flush_time" value={formData.flush_time} onChange={handleInputChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Floor Time (s)</label>
            <input type="number" name="floor_time" value={formData.floor_time} onChange={handleInputChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Wall Time (s)</label>
            <input type="number" name="wall_time" value={formData.wall_time} onChange={handleInputChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">No. of Seats</label>
            <input type="number" name="seats" value={formData.seats} onChange={handleInputChange} className="form-input" />
          </div>

          {/* Section: Payment Modes */}
          <div className="full-width" style={{ fontWeight: '600', color: 'var(--slate-800)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginTop: '1rem' }}>Payment Modes Supported</div>
          
          <div className="full-width" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="checkbox" id="free_cb"
                checked={formData.free === 'Yes'} 
                onChange={(e) => {
                  const isFree = e.target.checked ? 'Yes' : 'No';
                  setFormData(prev => ({
                    ...prev, 
                    free: isFree,
                    ...(isFree === 'Yes' ? { uses_amt: 0, coin: 'No', upi: 'No', smart_card: 'No', digital_token: 'No' } : {})
                  }));
                }}
                style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="free_cb" style={{ marginBottom: 0, cursor: 'pointer', fontSize: '0.95rem', color: 'var(--slate-700)' }}>Free (Button)</label>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: formData.free === 'Yes' ? 0.5 : 1 }}>
              <input 
                type="checkbox" id="coin_cb"
                checked={formData.coin === 'Yes'} 
                onChange={(e) => setFormData({...formData, coin: e.target.checked ? 'Yes' : 'No'})} 
                disabled={formData.free === 'Yes'}
                style={{ width: '1.2rem', height: '1.2rem', cursor: formData.free === 'Yes' ? 'not-allowed' : 'pointer', accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="coin_cb" style={{ marginBottom: 0, cursor: formData.free === 'Yes' ? 'not-allowed' : 'pointer', fontSize: '0.95rem', color: 'var(--slate-700)' }}>Coin Acceptor</label>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: formData.free === 'Yes' ? 0.5 : 1 }}>
              <input 
                type="checkbox" id="upi_cb"
                checked={formData.upi === 'Yes'} 
                onChange={(e) => setFormData({...formData, upi: e.target.checked ? 'Yes' : 'No'})} 
                disabled={formData.free === 'Yes'}
                style={{ width: '1.2rem', height: '1.2rem', cursor: formData.free === 'Yes' ? 'not-allowed' : 'pointer', accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="upi_cb" style={{ marginBottom: 0, cursor: formData.free === 'Yes' ? 'not-allowed' : 'pointer', fontSize: '0.95rem', color: 'var(--slate-700)' }}>UPI (QR Code)</label>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: formData.free === 'Yes' ? 0.5 : 1 }}>
              <input 
                type="checkbox" id="smart_card_cb"
                checked={formData.smart_card === 'Yes'} 
                onChange={(e) => setFormData({...formData, smart_card: e.target.checked ? 'Yes' : 'No'})} 
                disabled={formData.free === 'Yes'}
                style={{ width: '1.2rem', height: '1.2rem', cursor: formData.free === 'Yes' ? 'not-allowed' : 'pointer', accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="smart_card_cb" style={{ marginBottom: 0, cursor: formData.free === 'Yes' ? 'not-allowed' : 'pointer', fontSize: '0.95rem', color: 'var(--slate-700)' }}>Smart Card</label>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: formData.free === 'Yes' ? 0.5 : 1 }}>
              <input 
                type="checkbox" id="digital_token_cb"
                checked={formData.digital_token === 'Yes'} 
                onChange={(e) => setFormData({...formData, digital_token: e.target.checked ? 'Yes' : 'No'})} 
                disabled={formData.free === 'Yes'}
                style={{ width: '1.2rem', height: '1.2rem', cursor: formData.free === 'Yes' ? 'not-allowed' : 'pointer', accentColor: 'var(--primary-color)' }}
              />
              <label htmlFor="digital_token_cb" style={{ marginBottom: 0, cursor: formData.free === 'Yes' ? 'not-allowed' : 'pointer', fontSize: '0.95rem', color: 'var(--slate-700)' }}>Digital Token</label>
            </div>
          </div>

          <div className="full-width" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={formLoading || !isFormValid()}>
              {formLoading ? 'Saving...' : 'Save Machine'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW MACHINE MODAL */}
      <Modal isOpen={!!viewMachine} onClose={() => setViewMachine(null)} title="Machine Details">
        {viewMachine && (
          <div style={{ padding: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', fontSize: '0.9rem', backgroundColor: 'white' }}>
              <tbody>
                {[
                  { label: 'Machine ID', value: viewMachine.machine_id },
                  { label: 'Client Name', value: viewMachine.client_name },
                  { label: 'State', value: viewMachine.state },
                  { label: 'District', value: viewMachine.district },
                  { label: 'City', value: viewMachine.city },
                  { label: 'Address', value: viewMachine.address },
                  { label: 'GPS Location', value: viewMachine.gps_lat ? `${viewMachine.gps_lat}, ${viewMachine.gps_lng}` : 'Not Set' },
                  { label: 'Project Name', value: viewMachine.project_name },
                  { label: 'PO Date', value: viewMachine.po_date ? new Date(viewMachine.po_date).toLocaleDateString() : '' },
                  { label: 'Installation Date', value: viewMachine.installation_date ? new Date(viewMachine.installation_date).toLocaleDateString() : '' },
                  { label: 'Uses Amount(Rs.)', value: viewMachine.uses_amt },
                  { label: 'Status', value: viewMachine.status },
                  { label: 'Wall Clean', value: viewMachine.wall_clean },
                  { label: 'Seats(After)', value: viewMachine.seats },
                  { label: 'Flush Time(Sec.)', value: viewMachine.flush_time },
                  { label: 'Floor Time(Sec.)', value: viewMachine.floor_time },
                  { label: 'Wall Time(Sec.)', value: viewMachine.wall_time },
                  { 
                    label: 'Payment Modes', 
                    value: (
                      <div style={{ lineHeight: '1.5' }}>
                        <div>Free: {viewMachine.free || 'No'}</div>
                        <div>Coin: {viewMachine.coin || 'No'}</div>
                        <div>UPI: {viewMachine.upi || 'No'}</div>
                        <div>Smart Card: {viewMachine.smart_card || 'No'}</div>
                        <div>Digital Token: {viewMachine.digital_token || 'No'}</div>
                      </div>
                    )
                  },
                  { 
                    label: 'QR Code', 
                    value: (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/pay/${viewMachine.machine_id}`)}`} 
                        alt="QR Code" 
                        style={{ width: '100px', height: '100px' }} 
                      />
                    ) 
                  }
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', borderRight: '1px solid #e2e8f0', color: '#64748b', fontWeight: '500', width: '35%', verticalAlign: 'top' }}>
                      {row.label}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#334155', verticalAlign: 'top' }}>
                      {row.value || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* QR CODE MODAL */}
      <Modal isOpen={!!qrMachine} onClose={() => setQrMachine(null)} title="Machine Payment QR">
        {qrMachine && (
          <div style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '10px', display: 'inline-block', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid var(--slate-200)' }}>
              <QRCodeCanvas 
                id="qr-code-canvas"
                value={`${window.location.origin}/pay/${qrMachine.machine_id}`}
                size={400}
                style={{ width: '220px', height: '220px', display: 'block', margin: '0 auto' }}
                level={"H"}
                includeMargin={true}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
              />
              <h3 style={{ marginTop: '0.5rem', color: '#1e293b', fontWeight: 'bold', fontSize: '1.25rem' }}>ID: {qrMachine.machine_id}</h3>
            </div>
            
            <p style={{ marginTop: '1rem', color: 'var(--slate-500)', fontSize: '0.9rem' }}>
              Clients can scan this QR code to make payments for <b>{qrMachine.machine_id}</b>.
            </p>

            <button 
              className="btn btn-primary" 
              style={{ marginTop: '1.5rem', padding: '0.75rem 2.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)' }}
              onClick={() => {
                const canvas = document.getElementById('qr-code-canvas');
                if (canvas) {
                  try {
                    const qrDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    const doc = new jsPDF({
                      orientation: 'portrait',
                      unit: 'mm',
                      format: 'a4'
                    });

                    // 1. Draw Page Borders
                    // Outer blue border
                    doc.setDrawColor(59, 130, 246); // #3B82F6
                    doc.setLineWidth(1.5);
                    doc.rect(8, 8, 194, 281);
                    
                    // Inner slate border
                    doc.setDrawColor(30, 41, 59); // #1E293B
                    doc.setLineWidth(0.5);
                    doc.rect(10, 10, 190, 277);

                    // 2. Top Header Banner
                    doc.setFillColor(30, 41, 59); // #1E293B
                    doc.rect(10, 10, 190, 30, 'F');
                    
                    // Header text
                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(18);
                    doc.text("AARYA INNOVTECH PVT. LTD.", 105, 23, { align: 'center' });
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    doc.setTextColor(165, 180, 252); // Light Indigo/Blue
                    doc.text("SMARTBUDDY AUTOMATED HYGIENE SERVICES", 105, 32, { align: 'center' });

                    // 3. Call to Action Title
                    doc.setTextColor(37, 99, 235); // #2563EB
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(26);
                    doc.text("SCAN & PAY HERE", 105, 58, { align: 'center' });
                    
                    doc.setTextColor(71, 85, 105); // #475569
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(12);
                    doc.text("Scan this QR code using any UPI app to access the toilet facility.", 105, 66, { align: 'center' });

                    // 4. QR Code Card Container
                    doc.setFillColor(248, 250, 252); // #F8FAFC
                    doc.setDrawColor(226, 232, 240); // #E2E8F0
                    doc.setLineWidth(0.5);
                    doc.roundedRect(45, 78, 120, 120, 4, 4, 'FD');

                    // 5. Draw QR Code inside container
                    doc.addImage(qrDataUrl, 'JPEG', 55, 84, 100, 100, undefined, 'FAST');

                    // 6. Draw Machine ID below QR
                    doc.setTextColor(15, 23, 42); // #0F172A
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(16);
                    doc.text(`ID: ${qrMachine.machine_id}`, 105, 192, { align: 'center' });

                    // 7. Instructions Block
                    doc.setFillColor(241, 245, 249); // #F1F5F9
                    doc.roundedRect(20, 208, 170, 50, 3, 3, 'F');
                    
                    doc.setTextColor(15, 23, 42); // #0F172A
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.text("HOW TO USE / कसे वापरावे:", 25, 216);

                    // Instruction Step 1
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.text("1. Scan QR:", 25, 224);
                    doc.setFont('helvetica', 'normal');
                    doc.text("Open GPay, PhonePe, Paytm, or Camera and scan the QR code.", 48, 224);

                    // Instruction Step 2
                    doc.setFont('helvetica', 'bold');
                    doc.text("2. Pay:", 25, 232);
                    doc.setFont('helvetica', 'normal');
                    doc.text("Enter/confirm the toilet entry fee and complete the payment.", 48, 232);

                    // Instruction Step 3
                    doc.setFont('helvetica', 'bold');
                    doc.text("3. Enter:", 25, 240);
                    doc.setFont('helvetica', 'normal');
                    doc.text("Once payment is successful, the smart lock will open automatically.", 48, 240);

                    // 8. Footer Info
                    doc.setTextColor(148, 163, 184); // #94A3B8
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.text("Powered by SmartBuddy IoT Platforms  |  Aarya Innovtech Pvt. Ltd.", 105, 276, { align: 'center' });

                    // 9. Save PDF
                    doc.save(`machine_${qrMachine.machine_id}_payment_qr.pdf`);
                    toast.success("Payment QR Poster downloaded as PDF successfully!");
                  } catch (pdfError) {
                    console.error("Error generating PDF:", pdfError);
                    toast.error("Failed to generate PDF. Downloading PNG instead...");
                    
                    // PNG Fallback
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL('image/png');
                    link.download = `machine_${qrMachine.machine_id}_qrcode.png`;
                    link.click();
                  }
                }
              }}
            >
              <QrCode size={18} /> Download QR PDF
            </button>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Machines;
