import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Camera, MapPin, CheckCircle, Zap, Cpu, Settings, Image as ImageIcon } from 'lucide-react';

const TestForm = () => {
  const [formData, setFormData] = useState({
    machine_id: '',
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

  const [locationStatus, setLocationStatus] = useState('Fetching location...');

  const [cameraMode, setCameraMode] = useState(false);
  const [currentPhotoTarget, setCurrentPhotoTarget] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (cameraMode) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.log('Play error:', e));
          }
        })
        .catch(err => {
          toast.error('Camera access denied or unavailable.');
          setCameraMode(false);
        });
    }

    return () => {
      // Cleanup function to stop camera when unmounting or changing mode
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraMode]);

  const capturePhoto = () => {
    try {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({ ...prev, [currentPhotoTarget]: dataUrl }));
        
        // Stop tracks immediately for better responsiveness
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setCameraMode(false);
      }
    } catch (e) {
      toast.error('Failed to capture: ' + e.message);
      setCameraMode(false);
    }
  };

  const cancelCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraMode(false);
  };

  const startCamera = (target) => {
    setCurrentPhotoTarget(target);
    setCameraMode(true);
  };

  useEffect(() => {
    // Get location immediately
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({ ...prev, gps_lat: position.coords.latitude, gps_lng: position.coords.longitude }));
          setLocationStatus('Location Captured');
          toast.success('Location verified successfully!');
        },
        (error) => {
          setLocationStatus('Location Denied/Failed');
          toast.error('Location access denied. Cannot submit maintenance log.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationStatus('Geolocation not supported');
      toast.error("Geolocation is not supported by this browser.");
    }
  }, []);

  const handleTestHardware = async (action_type) => {
    if (!formData.machine_id) return toast.error("Please enter a Machine ID first!");
    if (!formData.gps_lat || !formData.gps_lng) return toast.error("Location not captured yet!");
    
    if (!window.confirm(`Are you sure you want to test ${action_type} on ${formData.machine_id}?`)) return;
    
    toast.loading(`Testing ${formData.machine_id}...`, { id: 'test-hw' });
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/maintenance/test-hardware`, { 
        machine_id: formData.machine_id, 
        action_type,
        gps_lat: formData.gps_lat,
        gps_lng: formData.gps_lng
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        toast.success(res.data.message, { id: 'test-hw' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send test command', { id: 'test-hw' });
    }
  };

  const handleImageCapture = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [fieldName]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!formData.gps_lat || !formData.gps_lng) {
      return toast.error("Form cannot be submitted without capturing GPS location!");
    }
    if (!formData.machine_id) {
      return toast.error("Please enter a Machine ID");
    }

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/maintenance/submit-log`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        toast.success(res.data.message);
        // Reset form but keep location
        setFormData({
          machine_id: '', reported_issue: '', root_cause: '', action_taken: '',
          before_photo: '', after_photo: '', gps_lat: formData.gps_lat, gps_lng: formData.gps_lng,
          pcb_condition: 'Good', voltage_reading: '', relays_checked: false, sensors_checked: false
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit maintenance log');
    }
  };

  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          Test Maintenance Form
        </h1>
        <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>Standalone form for testing field reports with live camera and GPS tags.</p>
      </div>

      <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <form onSubmit={handleLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Location Verification Section */}
          <div style={{ backgroundColor: formData.gps_lat ? '#ecfdf5' : '#fef2f2', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: formData.gps_lat ? '#065f46' : '#991b1b', border: `1px solid ${formData.gps_lat ? '#a7f3d0' : '#fecaca'}` }}>
            <MapPin size={24} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{locationStatus}</div>
              {formData.gps_lat && (
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{formData.gps_lat}, {formData.gps_lng}</div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Machine ID <span style={{color:'red'}}>*</span></label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="text" className="form-input" required value={formData.machine_id} onChange={e => setFormData({...formData, machine_id: e.target.value})} placeholder="Enter Machine ID" style={{ flex: 1 }} />
              <button type="button" onClick={() => handleTestHardware('TEST_DOOR')} className="btn" style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '0.5rem 1rem', height: '42px', fontWeight: 'bold' }}>Test Door</button>
              <button type="button" onClick={() => handleTestHardware('TEST_FLUSH')} className="btn" style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '0.5rem 1rem', height: '42px', fontWeight: 'bold' }}>Test Flush</button>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              
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
              <Camera size={18} /> Visual Evidence (Live Camera)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Before Photo</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => startCamera('before_photo')} className="btn btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569' }}>
                    <Camera size={16} /> Camera
                  </button>
                  <label className="btn btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569' }}>
                    <ImageIcon size={16} /> Gallery
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'before_photo')} />
                  </label>
                </div>
                {formData.before_photo && <img src={formData.before_photo} alt="Before" style={{ marginTop: '0.75rem', width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">After Photo</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => startCamera('after_photo')} className="btn btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569' }}>
                    <Camera size={16} /> Camera
                  </button>
                  <label className="btn btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569' }}>
                    <ImageIcon size={16} /> Gallery
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageCapture(e, 'after_photo')} />
                  </label>
                </div>
                {formData.after_photo && <img src={formData.after_photo} alt="After" style={{ marginTop: '0.75rem', width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />}
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={!formData.gps_lat} style={{ marginTop: '0.5rem', height: '48px', fontSize: '1.05rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: !formData.gps_lat ? 0.5 : 1 }}>
            <CheckCircle size={20} /> Submit Verified Log
          </button>
        </form>
      </div>

      {cameraMode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 9999 }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline autoPlay muted />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem 1rem', display: 'flex', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}>
            <button type="button" onClick={cancelCamera} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#475569', color: '#fff', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button type="button" onClick={capturePhoto} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: '#fff', borderRadius: '50px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }}>
              <Camera size={20} /> Capture
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default TestForm;
