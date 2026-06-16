import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

  const handlePrint = () => window.print();

  return (
    <div className="reports-container" style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }} className="no-print">
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Graphical Analytics</h1>
        <div>
          <button onClick={handlePrint} className="btn btn-primary" style={{ marginRight: '1rem', padding: '0.5rem 1.5rem', borderRadius: '8px' }}>
            🖨️ Print / PDF
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
        <PrintTemplate title="GRAPHICAL ANALYTICS" isTable={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            
            {/* Revenue Chart */}
            <div className="glass-panel" style={{ borderRadius: '12px', padding: '2rem', pageBreakInside: 'avoid' }}>
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
            <div className="glass-panel" style={{ borderRadius: '12px', padding: '2rem', pageBreakInside: 'avoid' }}>
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
