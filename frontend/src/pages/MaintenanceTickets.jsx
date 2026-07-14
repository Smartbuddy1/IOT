import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import SkeletonTable from '../components/SkeletonTable';
import Modal from '../components/Modal';
import { Search, Filter, Ticket, AlertCircle, Clock, CheckCircle2, Camera, ImageIcon, Settings, Cpu, CheckCircle, MapPin, Zap } from 'lucide-react';

const MaintenanceTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [machines, setMachines] = useState([]);
  const [techs, setTechs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewLogsModal, setViewLogsModal] = useState(false);
  const [showWorklogModal, setShowWorklogModal] = useState(false);
  const [currentLogs, setCurrentLogs] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  const [worklogFormData, setWorklogFormData] = useState({
    reported_issue: '',
    root_cause: '',
    action_taken: '',
    before_photo: '',
    after_photo: '',
    gps_lat: '18.5204',
    gps_lng: '73.8567',
    pcb_condition: 'Good',
    voltage_reading: '',
    relays_checked: false,
    sensors_checked: false
  });
  
  const [formData, setFormData] = useState({
    machine_id: '',
    title: '',
    description: '',
    priority: 'Medium',
    assigned_tech_id: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const { user } = useAuth();

  useEffect(() => {
    fetchTickets();
    if (user.role === 'Admin' || user.role === 'Maintenance_Head') {
      fetchMachines();
      fetchTechs();
    }
  }, []);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/maintenance/tickets`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        setTickets(res.data.tickets);
      }
    } catch (error) {
      toast.error('Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMachines = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/machines`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        setMachines(res.data.machines || res.data.data || []);
      }
    } catch (error) {}
  };

  const fetchTechs = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        setTechs(res.data.users.filter(u => u.role === 'Field_Tech'));
      }
    } catch (error) {}
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/maintenance/tickets`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        toast.success('Ticket created successfully');
        setShowModal(false);
        setFormData({ machine_id: '', title: '', description: '', priority: 'Medium', assigned_tech_id: '' });
        fetchTickets();
      }
    } catch (error) {
      toast.error('Failed to create ticket');
    }
  };

  const handleUpdateStatus = async (ticket_id, newStatus) => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/maintenance/tickets/${ticket_id}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (res.data.success) {
        toast.success(`Status updated to ${newStatus}`);
        fetchTickets();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const viewWorklogs = async (ticket) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/maintenance/tickets/${ticket.ticket_id}/worklogs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        setCurrentLogs(res.data.worklogs);
        setSelectedTicket(ticket);
        setViewLogsModal(true);
      }
    } catch (error) {
      toast.error('Failed to fetch worklogs');
    }
  };

  const openWorklogModal = (ticket) => {
    setSelectedTicket(ticket);
    setWorklogFormData({
      reported_issue: ticket.title || ticket.reported_issue || '',
      root_cause: '',
      action_taken: '',
      before_photo: '',
      after_photo: '',
      gps_lat: '18.5204',
      gps_lng: '73.8567',
      pcb_condition: 'Good',
      voltage_reading: '',
      relays_checked: false,
      sensors_checked: false
    });
    setShowWorklogModal(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setWorklogFormData(prev => ({ ...prev, gps_lat: position.coords.latitude, gps_lng: position.coords.longitude }));
        },
        () => {},
        { timeout: 5000, enableHighAccuracy: false }
      );
    }
  };

  const handleWorklogSubmit = async (e) => {
    e.preventDefault();
    try {
      toast.loading('Submitting maintenance log...', { id: 'submit-log' });
      const payload = new FormData();
      Object.keys(worklogFormData).forEach(key => {
        if (key === 'before_photo' || key === 'after_photo') {
          if (worklogFormData[key] instanceof File) {
            payload.append(key, worklogFormData[key]);
          }
        } else {
          payload.append(key, worklogFormData[key]);
        }
      });
      payload.append('machine_id', selectedTicket?.machine_id || 'GENERAL-MCH');
      payload.append('ticket_id', selectedTicket?.ticket_id || '');

      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/maintenance/submit-log`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Worklog submitted successfully!', { id: 'submit-log' });
        setShowWorklogModal(false);
        fetchTickets();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit log', { id: 'submit-log' });
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.ticket_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ticket.machine_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ticket.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'Open').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    resolved: tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length
  };

  return (
    <div className="page-content animate-entrance">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Issue Tickets</h1>
          <p className="page-subtitle">Track machine issues and tech assignments</p>
        </div>
        {(user.role === 'Admin' || user.role === 'Maintenance_Head') && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Create Ticket
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #6366f1', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.15)', padding: '1rem', borderRadius: '50%', color: '#4f46e5' }}><Ticket size={24} /></div>
          <div><h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{stats.total}</h3><p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.875rem' }}>Total Tickets</p></div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '1rem', borderRadius: '50%', color: '#dc2626' }}><AlertCircle size={24} /></div>
          <div><h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{stats.open}</h3><p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.875rem' }}>Open Issues</p></div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '1rem', borderRadius: '50%', color: '#2563eb' }}><Clock size={24} /></div>
          <div><h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{stats.inProgress}</h3><p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.875rem' }}>In Progress</p></div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '1rem', borderRadius: '50%', color: '#059669' }}><CheckCircle2 size={24} /></div>
          <div><h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{stats.resolved}</h3><p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.875rem' }}>Resolved</p></div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
          <input type="text" className="form-input" placeholder="Search by Ticket ID, Machine, or Title..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: '2.8rem', margin: 0 }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--slate-50)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
          <Filter size={16} color="var(--slate-500)" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontWeight: '500' }}>
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--slate-50)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
          <Filter size={16} color="var(--slate-500)" />
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontWeight: '500' }}>
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        {isLoading ? <SkeletonTable /> : (
          <table className="premium-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Machine</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned Tech</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length > 0 ? filteredTickets.map(ticket => (
                <tr key={ticket.ticket_id}>
                  <td style={{ fontWeight: 'bold' }}>{ticket.ticket_id}</td>
                  <td>{ticket.machine_id} <br/><small>{ticket.client_name}</small></td>
                  <td>{ticket.title}</td>
                  <td>
                    <span className={`badge-glow ${ticket.priority === 'High' ? 'failed' : ticket.priority === 'Medium' ? 'maintenance' : 'active'}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    {(user.role === 'Admin' || user.role === 'Maintenance_Head') && ticket.status !== 'Closed' ? (
                      <select 
                        value={ticket.status} 
                        onChange={(e) => handleUpdateStatus(ticket.ticket_id, e.target.value)}
                        className="form-input"
                        style={{ padding: '0.25rem 0.5rem', minWidth: '120px', height: 'auto' }}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    ) : (
                      <span style={{ fontWeight: '600', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', backgroundColor: ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'rgba(16, 185, 129, 0.1)' : 'var(--slate-100)', color: ticket.status === 'Resolved' || ticket.status === 'Closed' ? '#10b981' : 'var(--text-primary)' }}>
                        {ticket.status}
                      </span>
                    )}
                  </td>
                  <td>{ticket.assigned_tech_name || 'Unassigned'}</td>
                  <td>{new Date(ticket.created_at).toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'var(--slate-100)', color: 'var(--text-primary)' }} onClick={() => viewWorklogs(ticket)}>View Logs</button>
                      {ticket.status !== 'Closed' && (
                        <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => openWorklogModal(ticket)}>
                          <Settings size={14} /> + Add Worklog
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="8" style={{ textAlign: 'center' }}>No tickets found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Ticket">
          <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Machine ID <span style={{color:'red'}}>*</span></label>
              <select className="form-input" required value={formData.machine_id} onChange={e => setFormData({...formData, machine_id: e.target.value})}>
                <option value="">Select Machine</option>
                {machines.map(m => (
                  <option key={m.machine_id} value={m.machine_id}>{m.machine_id} ({m.client_name})</option>
                ))}
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Priority</label>
              <select className="form-input" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Issue Title <span style={{color:'red'}}>*</span></label>
              <input type="text" className="form-input" required placeholder="Short description of problem" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description (Optional)</label>
              <textarea className="form-input" rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Assign to Tech (Optional)</label>
              <select className="form-input" value={formData.assigned_tech_id} onChange={e => setFormData({...formData, assigned_tech_id: e.target.value})}>
                <option value="">None (Open for pickup)</option>
                {techs.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Ticket</button>
              <button type="button" className="btn" style={{ flex: 1, backgroundColor: '#e2e8f0' }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {viewLogsModal && selectedTicket && (
        <Modal isOpen={viewLogsModal} onClose={() => setViewLogsModal(false)} title={`Worklogs: ${selectedTicket.ticket_id} - ${selectedTicket.title}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {currentLogs.length > 0 ? currentLogs.map(log => (
              <div key={log.log_id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}><strong>Tech:</strong> {log.tech_name} | <strong>Date:</strong> {new Date(log.created_at).toLocaleString()}</p>
                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-secondary)' }}><strong>Action Taken:</strong> {log.action_taken}</p>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>PCB Condition:</strong> {log.pcb_condition || 'N/A'}</p>
              </div>
            )) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-500)', backgroundColor: 'var(--slate-50)', borderRadius: '8px' }}>
                No worklogs available for this ticket yet.
              </div>
            )}
          </div>
        </Modal>
      )}

      {showWorklogModal && selectedTicket && (
        <Modal isOpen={showWorklogModal} onClose={() => setShowWorklogModal(false)} title={`Add Worklog: ${selectedTicket.ticket_id} - ${selectedTicket.title}`}>
          <form onSubmit={handleWorklogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
            
            <div style={{ backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#065f46', border: '1px solid #a7f3d0' }}>
              <MapPin size={24} />
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Location Verified</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{worklogFormData.gps_lat}, {worklogFormData.gps_lng}</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 'bold' }}>
                <Settings size={20} color="var(--primary-color)" /> General Diagnostics
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reported Issue <span style={{color:'var(--danger-color)'}}>*</span></label>
                  <input type="text" className="form-input" required value={worklogFormData.reported_issue} onChange={e => setWorklogFormData({...worklogFormData, reported_issue: e.target.value})} placeholder="e.g. Door was jammed" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Root Cause Analysis <span style={{color:'var(--danger-color)'}}>*</span></label>
                  <input type="text" className="form-input" required value={worklogFormData.root_cause} onChange={e => setWorklogFormData({...worklogFormData, root_cause: e.target.value})} placeholder="e.g. 12V Relay short circuit" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Action Taken <span style={{color:'var(--danger-color)'}}>*</span></label>
                  <input type="text" className="form-input" required value={worklogFormData.action_taken} onChange={e => setWorklogFormData({...worklogFormData, action_taken: e.target.value})} placeholder="e.g. Replaced relay and tested" />
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 'bold' }}>
                <Cpu size={20} color="var(--primary-color)" /> PCB & Hardware Checks
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">PCB Condition</label>
                  <select className="form-input" value={worklogFormData.pcb_condition} onChange={e => setWorklogFormData({...worklogFormData, pcb_condition: e.target.value})}>
                    <option value="Good">Good</option>
                    <option value="Moisture Detected">Moisture Detected</option>
                    <option value="Burnt Components">Burnt Components</option>
                    <option value="Needs Replacement">Needs Replacement</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Zap size={14} /> Voltage Reading</label>
                  <input type="text" className="form-input" value={worklogFormData.voltage_reading} onChange={e => setWorklogFormData({...worklogFormData, voltage_reading: e.target.value})} placeholder="e.g. 12.4V" />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', background: 'var(--surface-bg)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" id="relays_m" checked={worklogFormData.relays_checked} onChange={e => setWorklogFormData({...worklogFormData, relays_checked: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }} />
                  <label htmlFor="relays_m" style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer', flexGrow: 1 }}>Relays Tested OK</label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', background: 'var(--surface-bg)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" id="sensors_m" checked={worklogFormData.sensors_checked} onChange={e => setWorklogFormData({...worklogFormData, sensors_checked: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }} />
                  <label htmlFor="sensors_m" style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer', flexGrow: 1 }}>Sensors Checked</label>
                </div>

              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 'bold' }}>
                <Camera size={20} color="var(--primary-color)" /> Visual Evidence
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Before Photo</label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input type="file" id="before_photo_cam_m" accept="image/*" capture="environment" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }} onChange={e => setWorklogFormData({...worklogFormData, before_photo: e.target.files[0]})} />
                      <label htmlFor="before_photo_cam_m" className={`btn ${worklogFormData.before_photo ? 'btn-primary' : 'btn-secondary'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', fontWeight: '500', height: '48px', transition: 'all 0.2s' }}>
                        <Camera size={20} /> {worklogFormData.before_photo ? 'Added' : 'Camera'}
                      </label>
                    </div>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input type="file" id="before_photo_gal_m" accept="image/*" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }} onChange={e => setWorklogFormData({...worklogFormData, before_photo: e.target.files[0]})} />
                      <label htmlFor="before_photo_gal_m" className={`btn ${worklogFormData.before_photo ? 'btn-primary' : 'btn-secondary'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', fontWeight: '500', height: '48px', transition: 'all 0.2s' }}>
                        <ImageIcon size={20} /> {worklogFormData.before_photo ? 'Added' : 'Files'}
                      </label>
                    </div>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">After Photo</label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input type="file" id="after_photo_cam_m" accept="image/*" capture="environment" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }} onChange={e => setWorklogFormData({...worklogFormData, after_photo: e.target.files[0]})} />
                      <label htmlFor="after_photo_cam_m" className={`btn ${worklogFormData.after_photo ? 'btn-primary' : 'btn-secondary'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', fontWeight: '500', height: '48px', transition: 'all 0.2s' }}>
                        <Camera size={20} /> {worklogFormData.after_photo ? 'Added' : 'Camera'}
                      </label>
                    </div>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input type="file" id="after_photo_gal_m" accept="image/*" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }} onChange={e => setWorklogFormData({...worklogFormData, after_photo: e.target.files[0]})} />
                      <label htmlFor="after_photo_gal_m" className={`btn ${worklogFormData.after_photo ? 'btn-primary' : 'btn-secondary'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', fontWeight: '500', height: '48px', transition: 'all 0.2s' }}>
                        <ImageIcon size={20} /> {worklogFormData.after_photo ? 'Added' : 'Files'}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', height: '48px', fontSize: '1.05rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={20} /> Submit Verified Log
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default MaintenanceTickets;
