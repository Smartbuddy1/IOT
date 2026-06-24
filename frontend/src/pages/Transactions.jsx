import React, { useState, useEffect } from 'react'; // TIMESTAMP: 1782110500
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { IndianRupee, CheckCircle, XCircle, Download, FileText, Printer, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToPDF, exportToExcel, handlePrint } from '../utils/exportUtils';
import jsPDF from "jspdf";
import "jspdf-autotable";

const logoImage = "/SB_Logo.jpg";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // FORCED UPDATE 2
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/transactions`, {
          params: { page, limit: 50, search: searchTerm }
        });
        setTransactions(response.data.transactions || []);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages);
          setTotalRecords(response.data.pagination.total);
        }
      } catch (error) {
        console.error("Failed to fetch transactions", error);
        toast.error("Failed to load transactions");
      } finally {
        setLoading(false);
      }
    };
    
    // Add a small delay for search debouncing
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 300);

    return () => clearTimeout(timer);
  }, [page, searchTerm]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const getTableData = () => {
    const columns = ["Trans ID", "Machine ID", "Project", "Amount", "Date & Time", "Status"];
    const rows = transactions.map(t => [
      t.trans_id ? t.trans_id.toString() : '-',
      t.machin_id ? t.machin_id.toString() : '-',
      t.project_name ? t.project_name.toString() : '-',
      t.trans_amt ? t.trans_amt.toString() : '-',
      t.date_time ? new Date(t.date_time).toLocaleString() : '-',
      t.status ? t.status.toString() : '-'
    ]);
    return { columns, rows };
  };

  const onExportPDF = async () => {
    const { columns, rows } = getTableData();
    if (rows.length === 0) {
      toast.error('No data to export');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Helper: fetch Base64
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

    const sbLogoUrl = window.location.origin + `/SB_Logo.jpg`;
    let sbImgObj = await getBase64FromUrl(sbLogoUrl);

    // Draw Top Header
    if (sbImgObj && sbImgObj.base64) {
      const sbMaxWidth = 35;
      const sbMaxHeight = 20;
      let sbCalcWidth = sbMaxWidth;
      let sbCalcHeight = (sbImgObj.height * sbMaxWidth) / sbImgObj.width;
      if (sbCalcHeight > sbMaxHeight) {
        sbCalcHeight = sbMaxHeight;
        sbCalcWidth = (sbImgObj.width * sbMaxHeight) / sbImgObj.height;
      }
      // Top Right SB Logo
      doc.addImage(sbImgObj.base64, sbImgObj.ext, pageWidth - 14 - sbCalcWidth, 8 + (sbMaxHeight - sbCalcHeight) / 2, sbCalcWidth, sbCalcHeight);
    }

    const centerX = pageWidth / 2;
    doc.setTextColor(16, 185, 129); 
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSACTION LOGS REPORT", centerX, 20, { align: 'center', maxWidth: 110 });
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleString()}`, centerX, 28, { align: 'center' });

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(14, 34, pageWidth - 14, 34);

    doc.autoTable({
      head: [columns],
      body: rows,
      startY: 38,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, lineColor: [37, 99, 235], lineWidth: 0.1 },
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
        } catch (e) {}

        // Signatures removed from here, moved to end of document
        const sepY = pageHeight - 15;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(14, sepY, pageWidth - 14, sepY);
        doc.setFontSize(8);
        doc.text('AARYA INNOVTECH PVT. LTD. CIN: U29305MH2019PTC327551 | +91 8806796868 | https://aaryainnovtech.com/', 14, sepY + 5);
        doc.text('Nashik Office: Flat No.4A, Sayali Darshan A-Wing, Makhamalabad Road, Nashik-422003.', 14, sepY + 9);
        doc.text(`Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, pageWidth - 14, sepY + 5, { align: 'right' });
        doc.text('Generated by System', pageWidth - 14, sepY + 9, { align: 'right' });
      }
    });

    // Draw Signatures ONLY on the last page
    const sigY = pageHeight - 25;
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.line(14, sigY, 64, sigY);
    doc.text('System Administrator', 39, sigY + 5, { align: 'center' });
    doc.line(pageWidth - 64, sigY, pageWidth - 14, sigY);
    doc.text('Authorized Signatory', pageWidth - 39, sigY + 5, { align: 'center' });

    doc.save(`Transactions_Report_${Date.now()}.pdf`);
    toast.success('HD PDF Downloaded successfully!');
  };

  const onExportExcel = () => {
    const { columns, rows } = getTableData();
    exportToExcel("Transaction Logs Report", columns, rows);
  };

  if (loading) {
    return <div className="loading-screen">Loading transactions...</div>;
  }

  return (
    <div>
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="dashboard-welcome">
          <h2>Transaction Logs</h2>
          <p style={{ color: 'var(--slate-500)' }}>View and monitor all machine payments.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg)', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '500' }}
          >
            <Printer size={16} /> Print
          </button>
          <button 
            onClick={onExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1rem', borderRadius: '0.5rem', border: '1px solid #16a34a', backgroundColor: 'transparent', color: '#16a34a', cursor: 'pointer', fontWeight: '500' }}
          >
            <FileText size={16} /> Excel
          </button>
          <button 
            onClick={onExportPDF}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1rem', borderRadius: '0.5rem', border: '1px solid #dc2626', backgroundColor: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: '500' }}
          >
            <Download size={16} /> PDF
          </button>
        </div>
      </div>
      <div className="search-container glass-panel">
        <Search size={18} color="var(--slate-400)" />
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search by Machine ID, Client, or Project..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-container glass-panel">
        <table className="premium-table print-table">
          <thead>
            <tr>
              <th>Trans ID</th>
              <th>Machine ID</th>
              <th>Project Name</th>
              <th>Amount</th>
              <th>Date & Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr className="premium-row">
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                  No transactions found.
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="premium-row">
                  <td style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>{t.trans_id || '-'}</td>
                  <td style={{ fontWeight: '700', color: 'var(--slate-800)' }}>{t.machin_id}</td>
                  <td style={{ color: 'var(--slate-600)' }}>{t.project_name || '-'}</td>
                  <td style={{ fontWeight: '700', color: 'var(--slate-800)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <IndianRupee size={14} /> {t.trans_amt}
                    </div>
                  </td>
                  <td style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>
                    {new Date(t.date_time).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge-glow ${t.status === 'success' ? 'success' : 'failed'}`}>
                      {t.status === 'success' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--surface-bg)', borderRadius: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>
            Showing <b>{transactions.length}</b> of <b>{totalRecords}</b> transactions
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: page === 1 ? 'var(--bg-color)' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', color: 'var(--slate-600)' }}
            >
              <ChevronLeft size={18} /> Prev
            </button>
            <span style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--slate-700)' }}>
              Page {page} of {totalPages}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: page === totalPages ? 'var(--bg-color)' : 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: 'var(--slate-600)' }}
            >
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
