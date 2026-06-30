import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Power, Settings, ShieldAlert, CheckCircle, Camera, ImageIcon, MapPin, Zap, Cpu, ToggleRight } from 'lucide-react';
import Modal from '../components/Modal';

const FieldTechView = () => {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  const [formData, setFormData] = useState({
    reported_issue: '',
    root_cause: '',
    action_taken: '',
    before_photo: '',
    after_photo: '',
    gps_lat: '',
    gps_lng: '',
    pcb_condition: 'Good',
    voltage_reading: '',
    relays_checked: false,
    sensors_checked: false
  });

  const fetchMyTickets = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/maintenance/tickets`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        setTickets(res.data.tickets);
      }
    } catch (error) {
      toast.error('Failed to fetch assigned tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const handleTestHardware = async (machine_id, action_type) => {
    if (!window.confirm(`Are you sure you want to test ${action_type} on ${machine_id}?\n\nNote: You must be physically present at the machine location.`)) return;
    
    if (navigator.geolocation) {
      toast.loading(`Verifying your location to test ${machine_id}...`, { id: 'loc-test' });
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/maintenance/test-hardware`, { 
              machine_id, 
              action_type,
              gps_lat: position.coords.latitude,
              gps_lng: position.coords.longitude
            }, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.success) {
              toast.success(res.data.message, { id: 'loc-test' });
            }
          } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send test command', { id: 'loc-test' });
          }
        },
        (error) => {
          toast.error('Location access denied. Cannot perform real-time test.', { id: 'loc-test' });
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation is not supported by this browser.");
    }
  };

  const openMaintenanceForm = (ticket) => {
    setSelectedTicket(ticket);
    setFormData({ 
      reported_issue: ticket.title, root_cause: '', action_taken: '', 
      before_photo: '', after_photo: '', gps_lat: '', gps_lng: '',
      pcb_condition: 'Good', voltage_reading: '', relays_checked: false, sensors_checked: false
    });
    
    // Get GeoLocation immediately
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({ ...prev, gps_lat: position.coords.latitude, gps_lng: position.coords.longitude }));
          toast.success('Location verified successfully!');
          setIsModalOpen(true);
        },
        (error) => {
          toast.error('Location access denied. Cannot submit maintenance log.');
        }
      );
    } else {
      toast.error("Geolocation is not supported by this browser.");
    }
  };

  const submitLog = async (e) => {
    e.preventDefault();
    try {
      toast.loading('Submitting maintenance log...', { id: 'submit-log' });
      const payload = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'before_photo' || key === 'after_photo') {
          if (formData[key] instanceof File) {
            payload.append(key, formData[key]);
          }
        } else {
          payload.append(key, formData[key]);
        }
      });
      payload.append('machine_id', selectedTicket.machine_id);
      payload.append('ticket_id', selectedTicket.ticket_id);

      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/maintenance/submit-log`, payload, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data.success) {
        toast.success(res.data.message, { id: 'submit-log' });
        setIsModalOpen(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit log', { id: 'submit-log' });
    }
  };

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1e293b' }}>My Assigned Tickets</h1>
      <p style={{ color: '#64748b', marginTop: '0.5rem', marginBottom: '2rem' }}>View your assigned maintenance tickets and add worklogs.</p>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton-box" style={{ height: '220px', borderRadius: '12px' }}></div>)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {tickets.length > 0 ? tickets.map(ticket => (
            <div key={ticket.ticket_id} className="card hover-float glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 'bold' }}>{ticket.machine_id}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{ticket.client_name} - {ticket.project_name}</p>
                </div>
                <span className={`badge-glow ${ticket.status === 'Open' ? 'badge-danger' : 'badge-warning'}`}>{ticket.status}</span>
              </div>
              
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '1.5rem', borderLeft: `4px solid ${ticket.priority === 'High' ? 'var(--danger-color)' : 'var(--warning-color)'}`, flexGrow: 1 }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {ticket.priority === 'High' && <ShieldAlert size={16} color="var(--danger-color)" />}
                  {ticket.ticket_id}
                </p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{ticket.title}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button className="btn btn-primary" onClick={() => openMaintenanceForm(ticket)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', fontWeight: '600', width: '100%', fontSize: '1rem' }}>
                  <Settings size={18} /> Add Worklog
                </button>
              </div>
            </div>
          )) : (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
              <CheckCircle size={48} color="var(--success-color)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>All Caught Up!</h3>
              <p style={{ color: 'var(--text-secondary)' }}>No open maintenance tickets assigned to you right now.</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && selectedTicket && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Add Worklog: ${selectedTicket.ticket_id}`}>
          <form onSubmit={submitLog} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
            
            {/* Location Verification Section */}
            <div style={{ backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#065f46', border: '1px solid #a7f3d0' }}>
              <MapPin size={24} />
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Location Verified</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{formData.gps_lat}, {formData.gps_lng}</div>
              </div>
            </div>

          {/* Section 1: General Info */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <Settings size={20} color="var(--primary-color)" /> General Diagnostics
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Reported Issue <span style={{color:'var(--danger-color)'}}>*</span></label>
                <input type="text" className="form-input" required value={formData.reported_issue} onChange={e => setFormData({...formData, reported_issue: e.target.value})} placeholder="e.g. Door was jammed" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Root Cause Analysis <span style={{color:'var(--danger-color)'}}>*</span></label>
                <input type="text" className="form-input" required value={formData.root_cause} onChange={e => setFormData({...formData, root_cause: e.target.value})} placeholder="e.g. 12V Relay short circuit" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Action Taken <span style={{color:'var(--danger-color)'}}>*</span></label>
                <input type="text" className="form-input" required value={formData.action_taken} onChange={e => setFormData({...formData, action_taken: e.target.value})} placeholder="e.g. Replaced relay and tested" />
              </div>
            </div>
          </div>

          {/* Section 2: PCB & Hardware Check */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <Cpu size={20} color="var(--primary-color)" /> PCB & Hardware Checks
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">PCB Condition</label>
                <select className="form-input" value={formData.pcb_condition} onChange={e => setFormData({...formData, pcb_condition: e.target.value})}>
                  <option value="Good">Good</option>
                  <option value="Moisture Detected">Moisture Detected</option>
                  <option value="Burnt Components">Burnt Components</option>
                  <option value="Needs Replacement">Needs Replacement</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Zap size={14} /> Voltage Reading</label>
                <input type="text" className="form-input" value={formData.voltage_reading} onChange={e => setFormData({...formData, voltage_reading: e.target.value})} placeholder="e.g. 12.4V" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', background: 'var(--surface-bg)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <input type="checkbox" id="relays" checked={formData.relays_checked} onChange={e => setFormData({...formData, relays_checked: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }} />
                <label htmlFor="relays" style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer', flexGrow: 1 }}>Relays Tested OK</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', background: 'var(--surface-bg)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <input type="checkbox" id="sensors" checked={formData.sensors_checked} onChange={e => setFormData({...formData, sensors_checked: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }} />
                <label htmlFor="sensors" style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer', flexGrow: 1 }}>Sensors Checked</label>
              </div>

            </div>
          </div>

          {/* Section 3: Visual Evidence */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <Camera size={20} color="var(--primary-color)" /> Visual Evidence
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Before Photo</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input type="file" id="before_photo_cam" accept="image/*" capture="environment" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }} onChange={e => setFormData({...formData, before_photo: e.target.files[0]})} />
                    <label htmlFor="before_photo_cam" className={`btn ${formData.before_photo ? 'btn-primary' : 'btn-secondary'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', fontWeight: '500', height: '48px', transition: 'all 0.2s' }}>
                      <Camera size={20} /> {formData.before_photo ? 'Added' : 'Camera'}
                    </label>
                  </div>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input type="file" id="before_photo_gal" accept="image/*" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }} onChange={e => setFormData({...formData, before_photo: e.target.files[0]})} />
                    <label htmlFor="before_photo_gal" className={`btn ${formData.before_photo ? 'btn-primary' : 'btn-secondary'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', fontWeight: '500', height: '48px', transition: 'all 0.2s' }}>
                      <ImageIcon size={20} /> {formData.before_photo ? 'Added' : 'Files'}
                    </label>
                  </div>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">After Photo</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input type="file" id="after_photo_cam" accept="image/*" capture="environment" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }} onChange={e => setFormData({...formData, after_photo: e.target.files[0]})} />
                    <label htmlFor="after_photo_cam" className={`btn ${formData.after_photo ? 'btn-primary' : 'btn-secondary'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', fontWeight: '500', height: '48px', transition: 'all 0.2s' }}>
                      <Camera size={20} /> {formData.after_photo ? 'Added' : 'Camera'}
                    </label>
                  </div>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input type="file" id="after_photo_gal" accept="image/*" style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }} onChange={e => setFormData({...formData, after_photo: e.target.files[0]})} />
                    <label htmlFor="after_photo_gal" className={`btn ${formData.after_photo ? 'btn-primary' : 'btn-secondary'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', fontWeight: '500', height: '48px', transition: 'all 0.2s' }}>
                      <ImageIcon size={20} /> {formData.after_photo ? 'Added' : 'Files'}
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

export default FieldTechView;
