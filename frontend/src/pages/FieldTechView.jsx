import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Power, Settings, ShieldAlert, CheckCircle, Camera, MapPin, Zap, Cpu, ToggleRight } from 'lucide-react';
import Modal from '../components/Modal';

const FieldTechView = () => {
  const [machines, setMachines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  
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

  useEffect(() => {
    fetchMyMachines();
  }, []);

  const fetchMyMachines = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/maintenance/my-machines`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        setMachines(res.data.machines);
      }
    } catch (error) {
      toast.error('Failed to fetch assigned machines');
    } finally {
      setIsLoading(false);
    }
  };

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

  const openMaintenanceForm = (machine_id) => {
    setSelectedMachine(machine_id);
    setFormData({ 
      reported_issue: '', root_cause: '', action_taken: '', 
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

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!formData.gps_lat || !formData.gps_lng) {
      return toast.error("Missing GPS coordinates!");
    }
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/maintenance/submit-log`, { machine_id: selectedMachine, ...formData }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setIsModalOpen(false);
        fetchMyMachines();
      }
    } catch (error) {
      toast.error('Failed to submit maintenance log');
    }
  };

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1e293b' }}>Hardware Testing</h1>
      <p style={{ color: '#64748b', marginTop: '0.5rem', marginBottom: '2rem' }}>Test Door, Flush, Payment, and view machine health.</p>

      {isLoading ? <p>Loading machines...</p> : machines.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>You're all caught up!</h2>
          <p style={{ color: '#64748b' }}>There are no machines currently assigned to you for maintenance. Enjoy your break!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {machines.map(m => (
            <div key={m.machine_id} className="card" style={{ padding: '1.5rem', borderTop: m.machine_status === 'active' ? '4px solid #10b981' : '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{m.machine_id}</h3>
                <span className={`badge-glow ${m.machine_status === 'active' ? 'badge-success' : 'badge-error'}`}>{m.machine_status}</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{m.project_name} | {m.client_name}</p>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>Water</span>
                  <strong style={{ color: '#0ea5e9' }}>{m.water_level || '0'}%</strong>
                </div>
                <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>Door</span>
                  <strong style={{ color: m.door_lock === '1' ? '#ef4444' : '#10b981' }}>{m.door_lock === '1' ? 'LOCKED' : 'OPEN'}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <button onClick={() => handleTestHardware(m.machine_id, 'TEST_DOOR')} className="btn" style={{ backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '0.8rem', padding: '0.5rem' }}>Test Door</button>
                <button onClick={() => handleTestHardware(m.machine_id, 'TEST_FLUSH')} className="btn" style={{ backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '0.8rem', padding: '0.5rem' }}>Test Flush</button>
              </div>

              <button onClick={() => openMaintenanceForm(m.machine_id)} className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                <Settings size={18} /> Fix / Submit Log
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Premium Maintenance Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Maintenance Log: ${selectedMachine}`}>
        <form onSubmit={handleLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
          
          {/* Location Verification Section */}
          <div style={{ backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#065f46', border: '1px solid #a7f3d0' }}>
            <MapPin size={24} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Location Verified</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{formData.gps_lat}, {formData.gps_lng}</div>
            </div>
          </div>

          {/* Section 1: General Info */}
          <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#334155', fontSize: '1rem', fontWeight: 'bold' }}>
              <Settings size={18} /> General Diagnostics
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Reported Issue <span style={{color:'red'}}>*</span></label>
                <input type="text" className="form-input" required value={formData.reported_issue} onChange={e => setFormData({...formData, reported_issue: e.target.value})} placeholder="e.g. Door was jammed" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Root Cause Analysis <span style={{color:'red'}}>*</span></label>
                <input type="text" className="form-input" required value={formData.root_cause} onChange={e => setFormData({...formData, root_cause: e.target.value})} placeholder="e.g. 12V Relay short circuit" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Action Taken <span style={{color:'red'}}>*</span></label>
                <input type="text" className="form-input" required value={formData.action_taken} onChange={e => setFormData({...formData, action_taken: e.target.value})} placeholder="e.g. Replaced relay and tested" />
              </div>
            </div>
          </div>

          {/* Section 2: PCB & Hardware Check */}
          <div style={{ padding: '1rem', border: '1px solid #e0e7ff', borderRadius: '8px', backgroundColor: '#eef2ff' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#4338ca', fontSize: '1rem', fontWeight: 'bold' }}>
              <Cpu size={18} /> PCB & Hardware Checks
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input type="checkbox" id="relays" checked={formData.relays_checked} onChange={e => setFormData({...formData, relays_checked: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: '#4338ca' }} />
                <label htmlFor="relays" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#334155', cursor: 'pointer' }}>Relays Tested OK</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input type="checkbox" id="sensors" checked={formData.sensors_checked} onChange={e => setFormData({...formData, sensors_checked: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: '#4338ca' }} />
                <label htmlFor="sensors" style={{ fontSize: '0.9rem', fontWeight: '500', color: '#334155', cursor: 'pointer' }}>Sensors Checked</label>
              </div>

            </div>
          </div>

          {/* Section 3: Visual Evidence */}
          <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#334155', fontSize: '1rem', fontWeight: 'bold' }}>
              <Camera size={18} /> Visual Evidence
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Before Photo URL</label>
                <input type="text" className="form-input" value={formData.before_photo} onChange={e => setFormData({...formData, before_photo: e.target.value})} placeholder="Image Link" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">After Photo URL</label>
                <input type="text" className="form-input" value={formData.after_photo} onChange={e => setFormData({...formData, after_photo: e.target.value})} placeholder="Image Link" />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', height: '48px', fontSize: '1.05rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} /> Submit Verified Log
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default FieldTechView;
