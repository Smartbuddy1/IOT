import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { IndianRupee, CheckCircle, XCircle, Download, FileText, Printer, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToPDF, exportToExcel, handlePrint } from '../utils/exportUtils';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/transactions`);
        setTransactions(response.data.transactions || []);
      } catch (error) {
        console.error("Failed to fetch transactions", error);
        toast.error("Failed to load transactions");
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

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

  const onExportPDF = () => {
    const { columns, rows } = getTableData();
    exportToPDF("Transaction Logs Report", columns, rows);
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
            {transactions
              .filter(t => 
                t.machin_id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                t.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                t.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .length === 0 ? (
              <tr className="premium-row">
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                  No transactions found.
                </td>
              </tr>
            ) : (
              transactions
                .filter(t => 
                  t.machin_id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  t.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  t.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((t) => (
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
    </div>
  );
};

export default Transactions;
