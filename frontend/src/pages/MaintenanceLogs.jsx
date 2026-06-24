import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Activity, Search, MapPin, Camera, Zap, Cpu, Settings, Calendar, User } from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonTable from '../components/SkeletonTable';
import Modal from '../components/Modal';

const MaintenanceLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal for details
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/maintenance/logs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setLogs(response.data.logs);
      }
    } catch (error) {
      toast.error('Failed to fetch maintenance logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.machine_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.tech_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getFullYear()} ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity color="var(--primary-color)" /> Maintenance Logs
          </h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>Review hardware diagnostics and field tech reports.</p>
        </div>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
          <input 
            type="text" 
            placeholder="Search by Machine, Tech, or Client..." 
            className="form-input"
            style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '20px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <SkeletonTable columns={6} />
      ) : (
        <div className="table-container glass-panel">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Machine ID</th>
                <th>Client</th>
                <th>Technician</th>
                <th>Issue Reported</th>
                <th>PCB Condition</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-500)' }}>
                    No maintenance logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.log_id} className="premium-row">
                    <td style={{ color: 'var(--slate-600)', fontSize: '0.9rem' }}>{formatDate(log.created_at)}</td>
                    <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{log.machine_id}</td>
                    <td>{log.client_name || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                          {log.tech_name?.charAt(0).toUpperCase() || 'T'}
                        </div>
                        {log.tech_name}
                      </div>
                    </td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.reported_issue}</td>
                    <td>
                      <span className={`badge-glow ${log.pcb_condition === 'Good' ? 'badge-success' : 'badge-warning'}`}>
                        {log.pcb_condition || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', backgroundColor: '#f1f5f9', color: '#334155' }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title={`Log Details: ${selectedLog.machine_id}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
            
            {/* Header Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Technician</span>
                <strong style={{ color: '#334155' }}>{selectedLog.tech_name}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Date</span>
                <strong style={{ color: '#334155' }}>{formatDate(selectedLog.created_at)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Status</span>
                <span className="badge-glow badge-success">{selectedLog.status}</span>
              </div>
            </div>

            {/* General Issue */}
            <div style={{ borderLeft: '4px solid #4338ca', paddingLeft: '1rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                <Settings size={18} /> Diagnostics
              </h4>
              <p style={{ margin: '0.25rem 0', fontSize: '0.95rem' }}><strong style={{ color: '#64748b' }}>Reported Issue:</strong> {selectedLog.reported_issue}</p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.95rem' }}><strong style={{ color: '#64748b' }}>Root Cause:</strong> {selectedLog.root_cause}</p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.95rem' }}><strong style={{ color: '#64748b' }}>Action Taken:</strong> {selectedLog.action_taken}</p>
            </div>

            {/* PCB Check */}
            <div style={{ backgroundColor: '#eef2ff', padding: '1rem', borderRadius: '8px', border: '1px solid #e0e7ff' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4338ca', marginBottom: '1rem', fontWeight: 'bold' }}>
                <Cpu size={18} /> PCB & Hardware Report
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ backgroundColor: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>PCB Condition</span>
                  <strong style={{ color: selectedLog.pcb_condition === 'Good' ? '#10b981' : '#ef4444' }}>{selectedLog.pcb_condition || 'N/A'}</strong>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Zap size={12}/> Voltage</span>
                  <strong style={{ color: '#334155' }}>{selectedLog.voltage_reading || 'N/A'}</strong>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Relays OK?</span>
                  <strong style={{ color: selectedLog.relays_checked ? '#10b981' : '#ef4444' }}>{selectedLog.relays_checked ? 'Yes' : 'No'}</strong>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Sensors OK?</span>
                  <strong style={{ color: selectedLog.sensors_checked ? '#10b981' : '#ef4444' }}>{selectedLog.sensors_checked ? 'Yes' : 'No'}</strong>
                </div>
              </div>
            </div>

            {/* GPS Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065f46', backgroundColor: '#ecfdf5', padding: '0.75rem', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <MapPin size={20} />
              <div style={{ fontSize: '0.9rem' }}>
                <strong>GPS Verfied Location:</strong> {selectedLog.gps_lat}, {selectedLog.gps_lng}
              </div>
            </div>

            {/* Photos */}
            <div style={{ marginTop: '0.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', marginBottom: '1rem', fontWeight: 'bold' }}>
                <Camera size={18} /> Visual Evidence
              </h4>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>Before</span>
                  {selectedLog.before_photo ? (
                    <img src={selectedLog.before_photo} alt="Before" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  ) : (
                    <div style={{ width: '100%', height: '150px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No Image</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>After</span>
                  {selectedLog.after_photo ? (
                    <img src={selectedLog.after_photo} alt="After" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  ) : (
                    <div style={{ width: '100%', height: '150px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No Image</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </Modal>
      )}
    </div>
  );
};

export default MaintenanceLogs;
