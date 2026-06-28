import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import SkeletonTable from '../components/SkeletonTable';
import Modal from '../components/Modal';
import { Search, Filter, Ticket, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

const MaintenanceTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [machines, setMachines] = useState([]);
  const [techs, setTechs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewLogsModal, setViewLogsModal] = useState(false);
  const [currentLogs, setCurrentLogs] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
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
                    <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'var(--slate-100)', color: 'var(--text-primary)' }} onClick={() => viewWorklogs(ticket)}>View Logs</button>
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
    </div>
  );
};

export default MaintenanceTickets;
