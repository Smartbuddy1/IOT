import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Printer, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import axios from 'axios';
import PrintTemplate from '../components/PrintTemplate';

const Analytics = () => {
  const { user } = useAuth();
  
  const [clients, setClients] = useState([]);
  const [machines, setMachines] = useState([]);
  const [filteredMachines, setFilteredMachines] = useState([]);
  
  const [clientName, setClientName] = useState(user?.role === 'Client' ? user.name : '');
  const [machineId, setMachineId] = useState('');
  
  const [filterType, setFilterType] = useState('fy');
  const [fy, setFy] = useState('current');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFilters();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (clientName) {
      const filtered = machines.filter(m => m.client_name === clientName);
      setFilteredMachines(filtered);
    } else {
      setFilteredMachines(machines);
    }
  }, [clientName, machines]);

  useEffect(() => {
    if (clientName) {
      fetchAnalyticsData();
    }
    // eslint-disable-next-line
  }, [clientName, machineId, fy, filterType]);

  const getFyDates = (selectedFy) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    let startYear = currentYear;
    if (currentMonth < 4) startYear = currentYear - 1;

    if (selectedFy === 'current') return { start: `${startYear}-04-01`, end: `${startYear + 1}-03-31` };
    if (selectedFy === 'last') return { start: `${startYear - 1}-04-01`, end: `${startYear}-03-31` };
    if (selectedFy === 'previous') return { start: `${startYear - 2}-04-01`, end: `${startYear - 1}-03-31` };
    return { start: '', end: '' };
  };

  useEffect(() => {
    if (filterType === 'fy') {
      const dates = getFyDates(fy);
      setStartDate(dates.start);
      setEndDate(dates.end);
    } else {
      setStartDate('');
      setEndDate('');
    }
  }, [fy, filterType]);

  const fetchFilters = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/reports/filters`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        setClients(res.data.clients);
        setMachines(res.data.machines);
        setFilteredMachines(res.data.machines);
      }
    } catch (error) {
      toast.error('Failed to load filters');
    }
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_BASE_URL}/reports/analytics?client_name=${encodeURIComponent(clientName)}&machine_id=${encodeURIComponent(machineId)}&fy=${fy}`;
      if (filterType === 'date' && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) {
        setData(res.data.data);
      } else {
        toast.error('Failed to fetch analytics data');
      }
    } catch (error) {
      toast.error('Error fetching analytics');
    } finally {
      setLoading(false);
    }
  };

  // Determine Client and Machine details for Header & PDF exactly like Reports.jsx
  let headerClientName = clientName;
  let headerToiletId = machineId ? machineId : "All Machines";
  let headerLocation = "Various Locations";
  
  if (machineId) {
    const selectedMachine = machines.find(m => m.machine_id === machineId);
    if (selectedMachine) {
      headerLocation = selectedMachine.inst_address || selectedMachine.address || selectedMachine.city || "Location details not available";
      if (!headerClientName && selectedMachine.client_name) {
        headerClientName = selectedMachine.client_name;
      }
    }
  }

  const selectedClientObj = clients.find(c => c.client_name === headerClientName);
  let headerClientLogo = selectedClientObj && selectedClientObj.client_logo ? selectedClientObj.client_logo : null;
  if (headerClientLogo && !headerClientLogo.startsWith('http')) {
    headerClientLogo = window.location.origin + (headerClientLogo.startsWith('/') ? '' : '/') + headerClientLogo;
  }

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    const chart1 = document.getElementById('analytics-chart-1');
    const chart2 = document.getElementById('analytics-chart-2');
    if (!chart1 || !chart2) {
      toast.error('Nothing to export. Please load analytics data first.');
      return;
    }
    try {
      const toastId = toast.loading('Generating HD Report PDF...');

      // Helper: fetch Base64 for logos
      const getBase64FromUrl = async (url) => {
        try {
          const res = await axios.get(url, { responseType: 'blob' });
          const blob = res.data;
          if (!blob.type.startsWith('image/')) return null;
          const rawDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              if (blob.type === 'image/jpeg' || blob.type === 'image/png') {
                const ext = blob.type === 'image/jpeg' ? 'JPEG' : 'PNG';
                resolve({ base64: rawDataUrl, ext, width: img.width, height: img.height });
                return;
              }
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve({ base64: canvas.toDataURL('image/png', 1.0), ext: 'PNG', width: img.width, height: img.height });
              } catch (e) { resolve(null); }
            };
            img.onerror = () => resolve(null);
            img.src = rawDataUrl;
          });
        } catch (error) { return null; }
      };

      const sbLogoUrl = window.location.origin + `/logo_new.png`;
      const sbImgObj = await getBase64FromUrl(sbLogoUrl);

      const leftLogoUrl = headerClientLogo || (window.location.origin + `/logo_left.jpeg`);
      const leftImgObj = await getBase64FromUrl(leftLogoUrl);

      // Capture charts as images
      const canvas1 = await html2canvas(chart1, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData1 = canvas1.toDataURL('image/png', 1.0);

      const canvas2 = await html2canvas(chart2, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData2 = canvas2.toDataURL('image/png', 1.0);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Draw Top Header (exact match with Reports.jsx / Transactions.jsx)
      if (leftImgObj && leftImgObj.base64) {
        const leftMaxWidth = 35;
        const leftMaxHeight = 20;
        let leftCalcWidth = leftMaxWidth;
        let leftCalcHeight = (leftImgObj.height * leftMaxWidth) / leftImgObj.width;
        if (leftCalcHeight > leftMaxHeight) {
          leftCalcHeight = leftMaxHeight;
          leftCalcWidth = (leftImgObj.width * leftMaxHeight) / leftImgObj.height;
        }
        doc.addImage(leftImgObj.base64, leftImgObj.ext, 14, 8 + (leftMaxHeight - leftCalcHeight) / 2, leftCalcWidth, leftCalcHeight);
      } else {
        doc.setDrawColor(37, 99, 235);
        doc.rect(14, 10, 35, 20);
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text("Client Logo", 31.5, 21, { align: 'center' });
      }

      if (sbImgObj && sbImgObj.base64) {
        const sbMaxWidth = 35;
        const sbMaxHeight = 20;
        let sbCalcWidth = sbMaxWidth;
        let sbCalcHeight = (sbImgObj.height * sbMaxWidth) / sbImgObj.width;
        if (sbCalcHeight > sbMaxHeight) {
          sbCalcHeight = sbMaxHeight;
          sbCalcWidth = (sbImgObj.width * sbMaxHeight) / sbImgObj.height;
        }
        doc.addImage(sbImgObj.base64, sbImgObj.ext, pageWidth - 14 - sbCalcWidth, 8 + (sbMaxHeight - sbCalcHeight) / 2, sbCalcWidth, sbCalcHeight);
      }

      const centerX = pageWidth / 2;
      doc.setTextColor(16, 185, 129); // Hygienic Green
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("GRAPHICAL ANALYTICS REPORT", centerX, 15, { align: 'center', maxWidth: 110 });
      
      doc.setTextColor(37, 99, 235); // Blue
      doc.setFontSize(10);
      doc.text(`Client Name: ${headerClientName || 'All Clients'}`, centerX, 22, { align: 'center', maxWidth: 110 });
      
      doc.setTextColor(100, 100, 100); // Gray
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Toilet ID: ${headerToiletId}`, centerX, 28, { align: 'center', maxWidth: 110 });
      doc.text(`Location: ${headerLocation}`, centerX, 33, { align: 'center', maxWidth: 110 });

      // Separator Line
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(14, 38, pageWidth - 14, 38);

      // Draw Charts
      const contentWidth = pageWidth - 28; // 182mm
      const chartHeight1 = (canvas1.height * contentWidth) / canvas1.width;
      const chartHeight2 = (canvas2.height * contentWidth) / canvas2.width;

      let currentY = 42;
      doc.addImage(imgData1, 'PNG', 14, currentY, contentWidth, chartHeight1);
      currentY += chartHeight1 + 8;

      // Check if second chart fits before footer/signatures (need space up to ~230)
      if (currentY + chartHeight2 > pageHeight - 45) {
        doc.addPage();
        currentY = 20;
      }
      doc.addImage(imgData2, 'PNG', 14, currentY, contentWidth, chartHeight2);

      // Add Watermark, Footer, and Signatures across pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
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
        } catch (e) {}

        // Footer Section
        const sepY = pageHeight - 15;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(14, sepY, pageWidth - 14, sepY);

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text('AARYA INNOVTECH PVT. LTD. CIN: U29305MH2019PTC327551 | +91 8806796868 | https://aaryainnovtech.com/', 14, sepY + 5);
        doc.text('Nashik Office: Flat No.4A, Sayali Darshan A-Wing, Makhamalabad Road, Nashik-422003.', 14, sepY + 9);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, sepY + 5, { align: 'right' });
        doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - 14, sepY + 9, { align: 'right' });
      }

      // Draw Signatures ONLY on the last page
      doc.setPage(totalPages);
      const sigY = pageHeight - 25;
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.2);
      doc.line(14, sigY, 64, sigY);
      doc.text('System Administrator', 39, sigY + 5, { align: 'center' });
      doc.line(pageWidth - 64, sigY, pageWidth - 14, sigY);
      doc.text('Authorized Signatory', pageWidth - 39, sigY + 5, { align: 'center' });

      doc.save(`Graphical_Analytics_Report_${Date.now()}.pdf`);
      toast.dismiss(toastId);
      toast.success('HD PDF Report Downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="reports-container" style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Graphical Analytics</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handlePrint} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.5rem 1.25rem', fontWeight: '600' }}>
            <Printer size={18} /> Print
          </button>
          <button onClick={handleExportPDF} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6', borderRadius: '20px', padding: '0.5rem 1.25rem', fontWeight: '600', color: '#ffffff' }}>
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="no-print glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Row 1: Filter Type */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Filter Type</label>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer' }}>
              <input type="radio" name="filterType" checked={filterType === 'fy'} onChange={() => setFilterType('fy')} style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }} />
              Financial Year
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer' }}>
              <input type="radio" name="filterType" checked={filterType === 'date'} onChange={() => setFilterType('date')} style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }} />
              Date Range
            </label>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Client Name</label>
            <select
              className="form-input"
              value={clientName}
              onChange={(e) => { setClientName(e.target.value); setMachineId(''); }}
              disabled={user?.role === 'Client'}
              style={{ width: '100%', height: '42px', opacity: user?.role === 'Client' ? 0.7 : 1 }}
            >
              <option value="">-- Select Client --</option>
              {clients.map(c => (
                <option key={c.client_name} value={c.client_name}>{c.client_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Machine ID</label>
            <select
              className="form-input"
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              style={{ width: '100%', height: '42px' }}
            >
              <option value="">-- All Machines --</option>
              {filteredMachines.map(m => (
                <option key={m.machine_id} value={m.machine_id}>{m.machine_id}</option>
              ))}
            </select>
          </div>

          {filterType === 'fy' ? (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Financial Year</label>
              <select
                className="form-input"
                value={fy}
                onChange={(e) => setFy(e.target.value)}
                style={{ width: '100%', height: '42px' }}
              >
                <option value="current">Current FY (Apr-Mar)</option>
                <option value="last">Last FY</option>
                <option value="previous">Previous FY</option>
              </select>
            </div>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>From Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="form-input" 
                  style={{ width: '100%', height: '42px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>To Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="form-input" 
                  style={{ width: '100%', height: '42px' }}
                />
              </div>
              <div>
                <button 
                  onClick={fetchAnalyticsData} 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', fontWeight: 'bold' }}
                >
                  Apply Date Filter
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading analytics data...</div>
      ) : data.length > 0 ? (
        <div id="analytics-export-area">
          <PrintTemplate title="GRAPHICAL ANALYTICS" isTable={false} clientName={headerClientName} toiletId={headerToiletId} location={headerLocation} clientLogo={headerClientLogo}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              
              {/* Revenue Chart */}
              <div id="analytics-chart-1" className="glass-panel" style={{ borderRadius: '12px', padding: '2rem', pageBreakInside: 'avoid' }}>
                <h3 style={{ textAlign: 'center', color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '2rem' }}>💰 Yearly Transaction Revenue (₹)</h3>
                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="coinAmount" name="Coin Amount (₹)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="upiAmount" name="UPI Amount (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Usage Chart */}
              <div id="analytics-chart-2" className="glass-panel" style={{ borderRadius: '12px', padding: '2rem', pageBreakInside: 'avoid' }}>
                <h3 style={{ textAlign: 'center', color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '2rem' }}>⚙️ Yearly Usage Count</h3>
                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="coinCount" name="Coin Usage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="upiCount" name="UPI Usage" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="freeCount" name="Free Usage" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </PrintTemplate>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#fff', borderRadius: '8px' }}>
          Please select a Client to view the analytics.
        </div>
      )}

      {/* Print Styles specific to Analytics if any */}
      <style>{`
        @media print {
          /* Charts might overflow, scale them nicely */
          .recharts-wrapper {
            margin: 0 auto !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Analytics;
