import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Activity, Search, MapPin, Camera, Zap, Cpu, Settings, Calendar, User } from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonTable from '../components/SkeletonTable';
import Modal from '../components/Modal';
import jsPDF from "jspdf";
import "jspdf-autotable";

const MaintenanceLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filters
  const [filterTech, setFilterTech] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  // Modal for details
  const [selectedLog, setSelectedLog] = useState(null);
  const [photosLoading, setPhotosLoading] = useState(false);

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

  const uniqueTechs = [...new Set(logs.map(l => l.tech_name).filter(Boolean))];
  const uniqueClients = [...new Set(logs.map(l => l.client_name).filter(Boolean))];

  const filteredLogs = logs.filter(log => {
    // Text search
    const matchesSearch = 
      log.machine_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.tech_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
    // Dropdown filters
    const matchesTech = filterTech ? log.tech_name === filterTech : true;
    const matchesClient = filterClient ? log.client_name === filterClient : true;
    
    // Date filters
    let matchesDate = true;
    if (filterStartDate || filterEndDate) {
      const logDate = log.created_at ? log.created_at.split('T')[0] : '';
      if (filterStartDate && logDate < filterStartDate) matchesDate = false;
      if (filterEndDate && logDate > filterEndDate) matchesDate = false;
    }

    return matchesSearch && matchesTech && matchesClient && matchesDate;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getFullYear()} ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  const handleViewDetails = async (log) => {
    setSelectedLog(log);
    setPhotosLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/maintenance/logs/${log.log_id}/photos`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        setSelectedLog(prev => ({
          ...prev,
          before_photo: res.data.before_photo,
          after_photo: res.data.after_photo
        }));
      }
    } catch (e) {
      console.error('Failed to load photos');
    } finally {
      setPhotosLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (filteredLogs.length === 0) {
      toast.error('No data available to export');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Header Data
    const title = 'Maintenance Logs Report';
    let finalClientName = 'All Logs';
    let filterTexts = [];
    if (filterClient) filterTexts.push(`Client: ${filterClient}`);
    if (filterTech) filterTexts.push(`Tech: ${filterTech}`);
    if (filterStartDate || filterEndDate) filterTexts.push(`Date: ${filterStartDate || '...'} to ${filterEndDate || '...'}`);
    if (searchQuery) filterTexts.push(`Search: ${searchQuery}`);
    
    if (filterTexts.length > 0) {
      finalClientName = filterTexts.join(' | ');
    }
    
    const sbImg = new Image();
    sbImg.src = "/SB_Logo.jpg";

    const drawPDF = (sbImgObj) => {
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // SmartBuddy Logo (Top Center)
      if (sbImgObj && sbImgObj.base64) {
        const sbMaxWidth = 35;
        const sbMaxHeight = 20;
        let sbCalcWidth = sbMaxWidth;
        let sbCalcHeight = (sbImgObj.height * sbMaxWidth) / sbImgObj.width;
        if (sbCalcHeight > sbMaxHeight) {
          sbCalcHeight = sbMaxHeight;
          sbCalcWidth = (sbImgObj.width * sbMaxHeight) / sbImgObj.height;
        }
        const sbYOffset = 8 + (sbMaxHeight - sbCalcHeight) / 2;
        doc.addImage(sbImgObj.base64, sbImgObj.ext, (pageWidth/2) - (sbCalcWidth/2), sbYOffset, sbCalcWidth, sbCalcHeight);
      }
      
      // Title
      doc.setTextColor(16, 185, 129); // Green
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(title.toUpperCase(), pageWidth/2, 33, { align: 'center' });
      
      doc.setTextColor(37, 99, 235); // Blue
      doc.setFontSize(10);
      doc.text(finalClientName, pageWidth/2, 39, { align: 'center' });
      
      // Separator Line
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(14, 43, pageWidth - 14, 43);

      const headers = ['Date', 'Machine ID', 'Client', 'Technician', 'Issue', 'PCB Cond', 'Status'];
      const rows = filteredLogs.map(log => [
        formatDate(log.created_at),
        log.machine_id,
        log.client_name || '-',
        log.tech_name || '-',
        log.reported_issue || '-',
        log.pcb_condition || '-',
        log.status || '-'
      ]);

      doc.autoTable({
        head: [headers],
        body: rows,
        startY: 47,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, lineColor: [37, 99, 235], lineWidth: 0.1 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { halign: 'center' },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        margin: { bottom: 35 },
        didDrawPage: (data) => {
          // Watermark
          try {
            if (sbImgObj && sbImgObj.base64) {
              doc.setGState(new doc.GState({opacity: 0.05}));
              const wmMaxWidth = 110;
              let wmWidth = wmMaxWidth;
              let wmHeight = (sbImgObj.height * wmMaxWidth) / sbImgObj.width;
              doc.addImage(sbImgObj.base64, sbImgObj.ext, (pageWidth/2) - (wmWidth/2), (pageHeight/2) - (wmHeight/2), wmWidth, wmHeight);
              doc.setGState(new doc.GState({opacity: 1}));
            }
          } catch (e) { }

          // Footer
          const sepY = pageHeight - 15;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(14, sepY, pageWidth - 14, sepY);

          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text('AARYA INNOVTECH PVT. LTD. CIN: U29305MH2019PTC327551 | +91 8806796868 | https://aaryainnovtech.com/', 14, sepY + 5);
          doc.text('Nashik Office: Flat No.4A, Sayali Darshan A-Wing, Makhamalabad Road, Nashik-422003.', 14, sepY + 9);
          
          const generateDate = formatDate(new Date().toISOString());
          doc.text(`Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, pageWidth - 14, sepY + 5, { align: 'right' });
          doc.text(`Generated on: ${generateDate}`, pageWidth - 14, sepY + 9, { align: 'right' });
        }
      });
      
      const sigY = pageHeight - 25;
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.2);
      
      doc.line(14, sigY, 64, sigY);
      doc.text('System Administrator', 39, sigY + 5, { align: 'center' });
      
      doc.line(pageWidth - 64, sigY, pageWidth - 14, sigY);
      doc.text('Authorized Signatory', pageWidth - 39, sigY + 5, { align: 'center' });
      
      doc.save(`Maintenance_Logs_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('HD PDF Report Downloaded');
    };

    sbImg.crossOrigin = "Anonymous";
    sbImg.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = sbImg.width;
      canvas.height = sbImg.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(sbImg, 0, 0);
      const dataURL = canvas.toDataURL("image/jpeg", 0.95);
      drawPDF({ base64: dataURL, width: sbImg.width, height: sbImg.height, ext: 'JPEG' });
    };
    sbImg.onerror = () => {
      drawPDF(null);
    };
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
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={handleExportPDF} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6', borderRadius: '20px' }}>
            Download PDF
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>Search Term</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
            <input 
              type="text" 
              placeholder="Machine, Tech..." 
              className="form-input"
              style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '8px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>Client</label>
          <select className="form-input" value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ borderRadius: '8px' }}>
            <option value="">All Clients</option>
            {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>Technician</label>
          <select className="form-input" value={filterTech} onChange={e => setFilterTech(e.target.value)} style={{ borderRadius: '8px' }}>
            <option value="">All Technicians</option>
            {uniqueTechs.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '130px' }}>
          <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>From Date</label>
          <input type="date" className="form-input" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} style={{ borderRadius: '8px' }} />
        </div>
        <div style={{ flex: 1, minWidth: '130px' }}>
          <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>To Date</label>
          <input type="date" className="form-input" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} style={{ borderRadius: '8px' }} />
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
                        onClick={() => handleViewDetails(log)}
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
              
              {photosLoading ? (
                <div style={{ display: 'flex', gap: '1rem', height: '150px', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner"></div> Loading high-res photos...
                </div>
              ) : (
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
              )}
            </div>

          </div>
        </Modal>
      )}
    </div>
  );
};

export default MaintenanceLogs;
