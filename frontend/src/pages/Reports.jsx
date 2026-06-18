import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Printer, FileSpreadsheet, FileText, Filter, IndianRupee, Activity, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonTable from '../components/SkeletonTable';
import PrintTemplate from '../components/PrintTemplate';
import jsPDF from "jspdf";
import "jspdf-autotable";
const logoImage = "/smartbuddy.png";

const Reports = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters State
  const [reportType, setReportType] = useState('revenue'); // revenue, footfall, maintenance
  const [clientName, setClientName] = useState('');
  const [machineId, setMachineId] = useState('');
  const [fy, setFy] = useState('current');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Dropdown Options
  const [clientsOptions, setClientsOptions] = useState([]);
  const [machinesOptions, setMachinesOptions] = useState([]);
  const [filteredMachines, setFilteredMachines] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    // Auto-fetch when report type changes
    if(clientsOptions.length > 0 || user.role === 'Client') {
      fetchReportData();
    }
  }, [reportType]);

  useEffect(() => {
    if (clientName) {
      setFilteredMachines(machinesOptions.filter(m => m.client_name === clientName));
    } else {
      setFilteredMachines(machinesOptions);
    }
    setMachineId(''); // Reset machine when client changes
  }, [clientName, machinesOptions]);

  const [filterType, setFilterType] = useState('fy'); // 'fy' or 'date'

  // Auto-calculate FY dates for display
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
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/reports/filters`);
      if (response.data.success) {
        setClientsOptions(response.data.clients);
        setMachinesOptions(response.data.machines);
        setFilteredMachines(response.data.machines);
        
        if (response.data.clients.length === 1) {
          setClientName(response.data.clients[0].client_name);
        }
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      let url = `${import.meta.env.VITE_API_BASE_URL}/reports/generate?type=${reportType}`;
      if (clientName) url += `&client_name=${encodeURIComponent(clientName)}`;
      if (machineId) url += `&machine_id=${encodeURIComponent(machineId)}`;
      
      if (filterType === 'fy') {
        url += `&fy=${fy}`;
      } else {
        url += `&fy=custom&start_date=${startDate}&end_date=${endDate}`;
      }
      
      const response = await axios.get(url);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchReportData();
  };

  const getVisibleModes = () => {
    let machinesToCheck = filteredMachines;
    if (machineId) {
      const selectedMachine = machinesOptions.find(m => m.machine_id === machineId);
      if (selectedMachine) {
        machinesToCheck = [selectedMachine];
      }
    }
    
    let hasFree = false;
    let hasCoin = false;
    let hasUpi = false;

    machinesToCheck.forEach(m => {
      if (m.free == 1 || m.free == 'Yes' || m.free === true) hasFree = true;
      if (m.coin == 1 || m.coin == 'Yes' || m.coin === true) hasCoin = true;
      if (m.upi == 1 || m.upi == 'Yes' || m.upi === true) hasUpi = true;
    });

    if (!hasFree && !hasCoin && !hasUpi) {
      return { hasFree: true, hasCoin: true, hasUpi: true };
    }

    return { hasFree, hasCoin, hasUpi };
  };

  const { hasFree, hasCoin, hasUpi } = getVisibleModes();

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = hours + ':' + minutes + ' ' + ampm;
    return `${day}-${month}-${year} ${strTime}`;
  };

  const exportData = (format) => {
    if (data.length === 0) {
      toast.error('No data available to export');
      return;
    }

    let headers = [];
    let rows = [];
    let title = '';

    if (reportType === 'revenue') {
      title = 'Day-wise Transaction Revenue Report';
      headers = ['Date', 'Machine ID', 'Total Transactions', 'Total Revenue'];
      rows = data.map(r => [formatDate(r.log_date), r.machine_id, r.total_transactions, r.total_revenue]);
      const totalTrans = data.reduce((sum, row) => sum + parseInt(row.total_transactions || 0, 10), 0);
      const totalRev = data.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0).toFixed(2);
      rows.push(['', 'OVERALL GRAND TOTAL:', totalTrans, totalRev]);
    } else if (reportType === 'footfall') {
      title = 'Footfall & Usage Report';
      
      headers = ['Date', 'Machine ID'];
      if (hasFree) headers.push('Free Uses');
      if (hasCoin) headers.push('Coin Uses');
      if (hasUpi) headers.push('UPI Uses');
      headers.push('Total Uses', 'Total Revenue');

      rows = data.map(r => {
        const row = [formatDate(r.log_date), r.machine_id];
        if (hasFree) row.push(r.free_uses);
        if (hasCoin) row.push(r.coin_uses);
        if (hasUpi) row.push(r.upi_uses);
        row.push(r.total_uses, r.total_revenue);
        return row;
      });
      
      const totalFree = data.reduce((sum, row) => sum + parseInt(row.free_uses || 0, 10), 0);
      const totalCoin = data.reduce((sum, row) => sum + parseInt(row.coin_uses || 0, 10), 0);
      const totalUpi = data.reduce((sum, row) => sum + parseInt(row.upi_uses || 0, 10), 0);
      const totalUses = data.reduce((sum, row) => sum + parseInt(row.total_uses || 0, 10), 0);
      const totalRev = data.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0).toFixed(2);
      
      const footerRow = ['OVERALL GRAND TOTAL:', ''];
      if (hasFree) footerRow.push(totalFree);
      if (hasCoin) footerRow.push(totalCoin);
      if (hasUpi) footerRow.push(totalUpi);
      footerRow.push(totalUses, totalRev);

      rows.push(footerRow);
    } else if (reportType === 'maintenance') {
      title = 'Machine Maintenance Status Report';
      headers = ['Machine ID', 'Client', 'Project', 'Status', 'Last Active', 'Address'];
      rows = data.map(r => [r.machine_id, r.client_name, r.project_name || '-', r.status || 'Offline', formatDateTime(r.last_update), r.address || '-']);
    }

    if (format === 'csv') {
      const csvRows = [headers.join(',')];
      rows.forEach(row => {
        csvRows.push(row.map(val => `"${val}"`).join(','));
      });
      const csvData = csvRows.join('\n');
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Excel Report Downloaded');
    } else if (format === 'pdf') {
      // Set to standard A4 Landscape for wide tables
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      // Determine Client and Machine details for Header
      const selectedClient = clientsOptions.find(c => c.client_name === clientName);
      const clientLogoUrl = selectedClient && selectedClient.client_logo 
        ? (selectedClient.client_logo.startsWith('http') ? selectedClient.client_logo : `${import.meta.env.VITE_SERVER_URL}${selectedClient.client_logo}?t=${new Date().getTime()}`)
        : null;

      let toiletIdStr = machineId ? machineId : "All Machines";
      let toiletLocationStr = "Various Locations";
      
      if (machineId) {
        const selectedMachine = machinesOptions.find(m => m.machine_id === machineId);
        if (selectedMachine) {
          toiletLocationStr = selectedMachine.inst_address || selectedMachine.address || selectedMachine.city || "Location details not available";
        }
      }

      // Load SmartBuddy Logo
      const sbImg = new Image();
      sbImg.src = logoImage;

      // Helper function to draw the rest of the PDF once images are loaded
      const drawPDF = (clientImgObj, sbImgObj) => {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        // 1. Draw Client Logo (Top Left)
        if (clientImgObj && clientImgObj.base64) {
          const maxWidth = 55; // Increased width for professional look
          const maxHeight = 28; // Increased height
          let calcWidth = maxWidth;
          let calcHeight = (clientImgObj.height * maxWidth) / clientImgObj.width;
          
          if (calcHeight > maxHeight) {
            calcHeight = maxHeight;
            calcWidth = (clientImgObj.width * maxHeight) / clientImgObj.height;
          }
          
          // Center the logo vertically if it's smaller than maxHeight
          const yOffset = 8 + (maxHeight - calcHeight) / 2;
          
          doc.addImage(clientImgObj.base64, clientImgObj.ext, 14, yOffset, calcWidth, calcHeight);
        } else {
          // Placeholder Box if no logo
          doc.setDrawColor(37, 99, 235); // Blue border
          doc.rect(14, 10, 55, 28);
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(10);
          doc.text("Client Logo", 41.5, 24, { align: 'center' });
        }

        // 2. Draw SmartBuddy Logo (Top Right)
        if (sbImgObj && sbImgObj.base64) {
          const sbMaxWidth = 55;
          const sbMaxHeight = 25;
          let sbCalcWidth = sbMaxWidth;
          let sbCalcHeight = (sbImgObj.height * sbMaxWidth) / sbImgObj.width;
          
          if (sbCalcHeight > sbMaxHeight) {
            sbCalcHeight = sbMaxHeight;
            sbCalcWidth = (sbImgObj.width * sbMaxHeight) / sbImgObj.height;
          }
          
          const sbYOffset = 8 + (sbMaxHeight - sbCalcHeight) / 2;
          const sbXOffset = pageWidth - 14 - sbCalcWidth;

          doc.addImage(sbImgObj.base64, sbImgObj.ext, sbXOffset, sbYOffset, sbCalcWidth, sbCalcHeight);
        }
        
        // 3. Draw Center Info
        const centerX = pageWidth / 2;
        doc.setTextColor(16, 185, 129); // Hygienic Green
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(title.toUpperCase(), centerX, 15, { align: 'center' });
        
        doc.setTextColor(37, 99, 235); // Blue
        doc.setFontSize(11);
        doc.text(`Client Name: ${clientName || 'All Clients'}`, centerX, 22, { align: 'center' });
        
        doc.setTextColor(100, 100, 100); // Gray
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Toilet ID: ${toiletIdStr}`, centerX, 28, { align: 'center' });
        doc.text(`Location: ${toiletLocationStr}`, centerX, 34, { align: 'center' });

        // Separator Line
        doc.setDrawColor(37, 99, 235); // Blue line
        doc.setLineWidth(0.5);
        doc.line(14, 38, pageWidth - 14, 38);

        // 4. Draw Table
        doc.autoTable({
          head: [headers],
          body: rows,
          startY: 42,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 4, lineColor: [37, 99, 235], lineWidth: 0.1 },
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', halign: 'center' },
          bodyStyles: { halign: 'center' },
          alternateRowStyles: { fillColor: [240, 253, 244] }, // Very light green for alternate rows
          margin: { bottom: 35 }, // Leave space for the large footer
          didDrawPage: (data) => {
            // 5. Watermark (Center of page)
            try {
              if (sbImgObj && sbImgObj.base64) {
                doc.setGState(new doc.GState({opacity: 0.05}));
                
                // Keep the watermark aspect ratio perfectly untouched
                const wmMaxWidth = 110;
                let wmWidth = wmMaxWidth;
                let wmHeight = (sbImgObj.height * wmMaxWidth) / sbImgObj.width;
                
                // Center the watermark
                doc.addImage(sbImgObj.base64, sbImgObj.ext, (pageWidth/2) - (wmWidth/2), (pageHeight/2) - (wmHeight/2), wmWidth, wmHeight);
                doc.setGState(new doc.GState({opacity: 1}));
              }
            } catch (e) { /* Ignore if GState not supported */ }

            // 6. Footer Section
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.setDrawColor(150, 150, 150);
            doc.setLineWidth(0.2);

            // Signatures
            const sigY = pageHeight - 25;
            // System Admin (Left)
            doc.line(14, sigY, 64, sigY);
            doc.text('System Administrator', 39, sigY + 5, { align: 'center' });
            
            // Authorized Signatory (Right)
            doc.line(pageWidth - 64, sigY, pageWidth - 14, sigY);
            doc.text('Authorized Signatory', pageWidth - 39, sigY + 5, { align: 'center' });

            // Horizontal Separator above Company Info
            const sepY = pageHeight - 15;
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(14, sepY, pageWidth - 14, sepY);

            // Company Info & Pagination
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            
            // Left Side: Address
            doc.text('AARYA INNOVTECH PVT. LTD. CIN: U29305MH2019PTC327551 | +91 8806796868', 14, sepY + 5);
            doc.text('Nashik Office: Flat No.4A, Sayali Darshan A-Wing, Makhamalabad Road, Nashik-422003.', 14, sepY + 9);
            
            // Right Side: Pagination & Gen Info
            doc.text(`Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, pageWidth - 14, sepY + 5, { align: 'right' });
            doc.text('Generated by System', pageWidth - 14, sepY + 9, { align: 'right' });
          }
        });
        
        const reportId = `RPT-${Math.floor(Math.random() * 100000000)}`;
        doc.save(`${reportType}_report_${reportId}.pdf`);
        toast.success('HD PDF Report Downloaded');
      };
      
      // Helper function: Two-stage guaranteed image loader (HD Quality Preserved)
      const getBase64FromUrl = async (url) => {
        try {
          const res = await axios.get(url, { responseType: 'blob' });
          const blob = res.data;
          
          if (!blob.type.startsWith('image/')) {
            toast.error("Fetched file is not an image!");
            return null;
          }

          const rawDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              // If it's already a standard format, bypass canvas for 100% HD Original Quality
              if (blob.type === 'image/jpeg' || blob.type === 'image/png') {
                const ext = blob.type === 'image/jpeg' ? 'JPEG' : 'PNG';
                resolve({ base64: rawDataUrl, ext, width: img.width, height: img.height });
                return;
              }

              // Only use canvas fallback for WEBP, AVIF, BMP etc.
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const finalPngDataUrl = canvas.toDataURL('image/png', 1.0); // Highest quality
                resolve({ base64: finalPngDataUrl, ext: 'PNG', width: img.width, height: img.height });
              } catch (e) {
                resolve(null);
              }
            };
            img.onerror = () => resolve(null);
            img.src = rawDataUrl;
          });

        } catch (error) {
          toast.error("Network Error: Could not fetch logo from server");
          return null;
        }
      };

      const generateReportWithImages = async () => {
        let clientImgObj = null;
        
        if (clientLogoUrl) {
          toast.success("Trying to fetch logo: " + clientLogoUrl.split('?')[0]);
          clientImgObj = await getBase64FromUrl(clientLogoUrl);
          if (!clientImgObj) {
            toast.error("Base64 conversion returned null");
          }
        } else {
          if (clientName && clientName !== 'All Clients') {
            toast.error("Client has no logo saved in Database!");
          }
        }

        // Load SmartBuddy Logo using the robust HD fetcher
        const sbLogoUrl = `${import.meta.env.VITE_SERVER_URL}/uploads/logos/IMG-20260614-WA0003(1).jpg`;
        const sbImgObj = await getBase64FromUrl(sbLogoUrl);
        if (!sbImgObj) {
          toast.error("Failed to load HD SmartBuddy Logo");
        }

        // Pass the object directly since it already contains {base64, ext, width, height}
        drawPDF(clientImgObj, sbImgObj);
      };

      generateReportWithImages();
    }
  };

  // Pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = data.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="page-container">
      <div className="page-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--slate-800)', letterSpacing: '-0.025em' }}>Enterprise Reports</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.25rem' }}>Generate and export detailed analytics.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--slate-100)', color: 'var(--slate-700)', border: '1px solid var(--slate-300)' }}>
            <Printer size={18} /> Print
          </button>
          <button className="btn btn-primary" onClick={() => exportData('csv')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#10b981', borderColor: '#10b981' }}>
            <FileSpreadsheet size={18} /> Excel
          </button>
          <button className="btn btn-primary" onClick={() => exportData('pdf')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#ef4444', borderColor: '#ef4444' }}>
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--slate-200)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setReportType('revenue')}
          style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: '600', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: reportType === 'revenue' ? '3px solid var(--primary-color)' : '3px solid transparent', color: reportType === 'revenue' ? 'var(--primary-color)' : 'var(--slate-500)' }}
        >
          <IndianRupee size={18} /> Revenue Report
        </button>
        <button 
          onClick={() => setReportType('footfall')}
          style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: '600', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: reportType === 'footfall' ? '3px solid var(--primary-color)' : '3px solid transparent', color: reportType === 'footfall' ? 'var(--primary-color)' : 'var(--slate-500)' }}
        >
          <Activity size={18} /> Footfall (Usage) Report
        </button>
        <button 
          onClick={() => setReportType('maintenance')}
          style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: '600', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: reportType === 'maintenance' ? '3px solid var(--primary-color)' : '3px solid transparent', color: reportType === 'maintenance' ? 'var(--primary-color)' : 'var(--slate-500)' }}
        >
          <AlertTriangle size={18} /> Maintenance Status
        </button>
      </div>

      {/* Filters Design Matching User's Image */}
      <div className="no-print glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        
        <form onSubmit={handleFilterSubmit}>
          {/* Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {user?.role !== 'Client' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Project Name</label>
                <select 
                  className="form-input" 
                  style={{ width: '100%', height: '42px' }}
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)}
                >
                  <option value="">All Project</option>
                  {clientsOptions.map((c, i) => (
                    <option key={i} value={c.client_name}>{c.client_name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Project Name</label>
                <input type="text" className="form-input" value={user.name || 'Your Project'} disabled style={{ opacity: 0.7 }} />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Machine ID:</label>
              <select 
                className="form-input" 
                style={{ width: '100%', height: '42px' }}
                value={machineId} 
                onChange={(e) => setMachineId(e.target.value)}
              >
                <option value="">All Machine</option>
                {filteredMachines.map((m, i) => (
                  <option key={i} value={m.machine_id}>{m.machine_id} {m.client_name ? `(${m.client_name})` : ''}</option>
                ))}
              </select>
            </div>

            {reportType !== 'maintenance' && (
              <div>
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
            )}
          </div>

          {/* Row 2 */}
          {reportType !== 'maintenance' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'flex-end' }}>
              {filterType === 'fy' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Financial Year</label>
                  <select 
                    className="form-input" 
                    style={{ width: '100%', height: '42px' }}
                    value={fy} 
                    onChange={(e) => setFy(e.target.value)}
                  >
                    <option value="current">Current FY</option>
                    <option value="last">Last FY</option>
                    <option value="previous">Previous FY</option>
                  </select>
                </div>
              ) : (
                <div style={{ visibility: 'hidden' }}> {/* Placeholder for layout alignment */}
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>&nbsp;</label>
                  <div style={{ height: '42px' }}></div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>From Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="form-input" 
                  style={{ width: '100%', height: '42px', opacity: filterType === 'fy' ? 0.7 : 1 }}
                  readOnly={filterType === 'fy'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>To Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="form-input" 
                  style={{ width: '100%', height: '42px', opacity: filterType === 'fy' ? 0.7 : 1 }}
                  readOnly={filterType === 'fy'}
                />
              </div>

              <div>
                <button type="submit" className="btn btn-primary" style={{ height: '42px', width: '100%', backgroundColor: '#4f46e5', borderColor: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: '500' }}>
                  <Filter size={18} /> Apply Filter
                </button>
              </div>
            </div>
          )}

          {reportType === 'maintenance' && (
             <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" style={{ height: '42px', width: '25%', minWidth: '150px', backgroundColor: '#4f46e5', borderColor: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: '500' }}>
                  <Filter size={18} /> Apply Filter
                </button>
             </div>
          )}
        </form>
      </div>

      {/* Data Table */}
      {loading ? (
        <SkeletonTable columns={6} />
      ) : (
        <div className="table-container glass-panel">
          <PrintTemplate title={reportType === 'revenue' ? 'REVENUE REPORT' : reportType === 'footfall' ? 'FOOTFALL & USAGE REPORT' : 'MACHINE MAINTENANCE STATUS REPORT'} isTable={true}>
            <table className="premium-table">
              <thead>
                <tr>
                  {reportType === 'revenue' && (
                    <><th>Date</th><th>Machine ID</th><th>Total Transactions</th><th>Total Revenue (₹)</th></>
                  )}
                  {reportType === 'footfall' && (
                    <>
                      <th>Date</th><th>Machine ID</th>
                      {hasFree && <th>Free Uses</th>}
                      {hasCoin && <th>Coin Uses</th>}
                      {hasUpi && <th>UPI Uses</th>}
                      <th>Total Uses</th><th>Total Revenue (₹)</th>
                    </>
                  )}
                  {reportType === 'maintenance' && (
                    <><th>Machine ID</th><th>Client</th><th>Project</th><th>Status</th><th>Last Active</th><th>Address</th></>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-500)' }}>
                      No records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  currentData.map((row, i) => (
                    <tr key={i} className="premium-row">
                      {reportType === 'revenue' && (
                        <>
                          <td style={{ color: 'var(--slate-600)' }}>{formatDate(row.log_date)}</td>
                          <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{row.machine_id}</td>
                          <td style={{ fontWeight: '600' }}>{row.total_transactions}</td>
                          <td style={{ fontWeight: '700', color: '#10b981' }}>₹{parseFloat(row.total_revenue || 0).toFixed(2)}</td>
                        </>
                      )}
                      {reportType === 'footfall' && (
                        <>
                          <td style={{ color: 'var(--slate-600)' }}>{formatDate(row.log_date)}</td>
                          <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{row.machine_id}</td>
                          {hasFree && <td style={{ color: 'var(--slate-600)' }}>{row.free_uses}</td>}
                          {hasCoin && <td style={{ color: 'var(--slate-600)' }}>{row.coin_uses}</td>}
                          {hasUpi && <td style={{ color: 'var(--slate-600)' }}>{row.upi_uses}</td>}
                          <td style={{ fontWeight: '600' }}>{row.total_uses}</td>
                          <td style={{ fontWeight: '700', color: '#10b981' }}>₹{parseFloat(row.total_revenue || 0).toFixed(2)}</td>
                        </>
                      )}
                      {reportType === 'maintenance' && (
                        <>
                          <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{row.machine_id}</td>
                          <td style={{ fontWeight: '500' }}>{row.client_name}</td>
                          <td style={{ color: 'var(--slate-600)' }}>{row.project_name || '-'}</td>
                          <td>
                            <span className={`badge-glow ${row.status?.toLowerCase() === 'active' ? 'badge-success' : 'badge-warning'}`}>
                              {row.status || 'Unknown'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>
                            {formatDateTime(row.last_update)}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--slate-600)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.address}>
                            {row.address || '-'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              {data.length > 0 && reportType !== 'maintenance' && (
                <tfoot style={{ backgroundColor: 'var(--table-header-bg)', borderTop: '2px solid var(--border-color)' }}>
                  <tr>
                    {reportType === 'revenue' && (
                      <>
                        <td colSpan="2" style={{ textAlign: 'right', paddingRight: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.95rem' }}>OVERALL GRAND TOTAL:</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1rem' }}>{data.reduce((sum, row) => sum + parseInt(row.total_transactions || 0, 10), 0)}</td>
                        <td style={{ fontWeight: 'bold', color: '#10b981', fontSize: '1.1rem' }}>₹{data.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0).toFixed(2)}</td>
                      </>
                    )}
                    {reportType === 'footfall' && (
                      <>
                        <td colSpan="2" style={{ textAlign: 'right', paddingRight: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.95rem' }}>OVERALL GRAND TOTAL:</td>
                        {hasFree && <td style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1rem' }}>{data.reduce((sum, row) => sum + parseInt(row.free_uses || 0, 10), 0)}</td>}
                        {hasCoin && <td style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1rem' }}>{data.reduce((sum, row) => sum + parseInt(row.coin_uses || 0, 10), 0)}</td>}
                        {hasUpi && <td style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1rem' }}>{data.reduce((sum, row) => sum + parseInt(row.upi_uses || 0, 10), 0)}</td>}
                        <td style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1rem' }}>{data.reduce((sum, row) => sum + parseInt(row.total_uses || 0, 10), 0)}</td>
                        <td style={{ fontWeight: 'bold', color: '#10b981', fontSize: '1.1rem' }}>₹{data.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0).toFixed(2)}</td>
                      </>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </PrintTemplate>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination-container no-print" style={{ marginTop: '1.5rem' }}>
          <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>Prev</button>
          <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--slate-600)' }}>Page {currentPage} of {totalPages}</span>
          <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Next</button>
        </div>
      )}
    </div>
  );
};

export default Reports;
