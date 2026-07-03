import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Activity, Users, Monitor, IndianRupee, FolderPlus, Wrench, CheckCircle, XCircle, Tag, PlusCircle, UserPlus, ArrowRight, TrendingUp, TrendingDown, Droplet, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { useNavigate } from 'react-router-dom';
import InstallationsMap from '../components/InstallationsMap';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState({});
  const [recentLogs, setRecentLogs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/dashboard/stats`);
        setStats(response.data.stats);

        if (user?.role === 'Admin' || user?.role === 'Maintenance_Head') {
          const logsResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/maintenance/logs`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (logsResponse.data.success) {
            setRecentLogs(logsResponse.data.logs.slice(0, 5));
          }
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // Poll IoT Live Data and Dashboard Stats every 3 seconds for instant real-time status updates
  useEffect(() => {
    const fetchLiveData = async () => {
      if (document.hidden) return; // Skip polling if tab is in background
      try {
        const [liveRes, statsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/iot/live-status`),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/dashboard/stats`)
        ]);
        if (liveRes.data.success) {
          setLiveStatus(liveRes.data.data);
        }
        if (statsRes.data.success && statsRes.data.stats) {
          setStats(statsRes.data.stats);
        }
      } catch (error) {
        // Silently fail to avoid console spam
      }
    };
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="loading-screen">Loading beautiful dashboard...</div>;
  }

  const finalChartData = stats?.chartData || [];
  const finalMachineHealth = stats?.machineHealth || [];
  const finalTopProjects = stats?.topProjectsList || [];
  const finalRecentActivity = stats?.recentTransactions || [];

  const lowWaterMachines = Object.entries(liveStatus || {})
    .filter(([id, data]) => String(data?.water_level).toUpperCase() === 'LOW' || String(data?.water_level) === '1' || String(data?.status || '').toLowerCase() === 'water_low' || String(data?.water_level).toLowerCase() === 'water_low')
    .map(([id, data]) => ({ id, ...data }));

  const StatCard = ({ title, value, icon: Icon, colorClass, trend, trendValue, onClick }) => (
    <div className={`glass-panel stat-card hover-float ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <Icon className="stat-bg-icon" />
      <div className="stat-info" style={{ position: 'relative', zIndex: 2 }}>
        <p>{title}</p>
        <h3 style={{ fontSize: '1.75rem', marginTop: '0.2rem' }}>{value}</h3>
        {trend === 'up' && (
          <span className="trend-tag trend-up"><TrendingUp size={14} /> {trendValue}</span>
        )}
        {trend === 'down' && (
          <span className="trend-tag trend-down"><TrendingDown size={14} /> {trendValue}</span>
        )}
      </div>
      <div className={`stat-icon ${colorClass}`} style={{ color: 'white', position: 'relative', zIndex: 2, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        <Icon size={24} />
      </div>
    </div>
  );

  return (
    <div className="page-container" style={{ paddingBottom: '2rem' }}>
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <h2>Welcome to <span style={{ color: 'var(--primary-color)' }}>Dashboard</span></h2>
          <p style={{ color: 'var(--slate-500)', fontSize: '1.1rem' }}>Hello {user?.username || user?.name || 'User'}, here is your system overview.</p>
        </div>
      </div>

      {/* IOT LIVE MONITOR ROW REMOVED AS REQUESTED */}
      {/* ROW 1: General Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {user?.role === 'Admin' && (
          <StatCard 
            title="Total Clients" 
            value={stats?.totalClients || '0'}
            icon={Users} 
            colorClass="bg-blue" 
            trend="up"
            trendValue="+12% new"
          />
        )}
        <StatCard 
          title="Total Projects" 
          value={stats?.totalProjects || '0'}
          icon={FolderPlus} 
          colorClass="bg-amber" 
          trend="up"
          trendValue="+5% active"
        />
        <StatCard 
          title="Total Machines" 
          value={stats?.totalMachines || '0'}
          icon={Monitor} 
          colorClass="bg-violet" 
          trend="up"
          trendValue="+2 added"
        />
        {user?.role === 'Admin' && (
          <StatCard 
            title="Unassigned Machines" 
            value={stats?.unassignedMachines || '0'}
            icon={Tag} 
            colorClass="bg-orange" 
            trend="down"
            trendValue="-3% unused"
            onClick={() => navigate('/unassigned-machines')}
          />
        )}
      </div>

      {/* ROW 2: Today's Metrics */}
      <div className="stats-grid">
        <StatCard 
          title="Machine Used (Today)" 
          value={stats?.todaysUse || '0'}
          icon={Activity} 
          colorClass="bg-cyan" 
          trend="up"
          trendValue="High Usage"
        />
        {user?.role !== 'Maintenance_Head' && (
          <>
            <StatCard 
              title="Success (Today)" 
              value={stats?.successCount || '0'}
              icon={CheckCircle} 
              colorClass="bg-emerald" 
              trend="up"
              trendValue="98% Success"
            />
            <StatCard 
              title="Failed (Today)" 
              value={stats?.failedCount || '0'}
              icon={XCircle} 
              colorClass="bg-rose" 
              trend="down"
              trendValue="Needs check"
            />
          </>
        )}
        <StatCard 
          title="Maintenance" 
          value={stats?.underMaintenance || '0'}
          icon={Wrench} 
          colorClass="bg-rose" 
          trend="down"
          trendValue="2 Critical"
        />
      </div>

      {/* QUICK ACTIONS */}
      {user?.role === 'Admin' && (
        <div style={{ marginTop: '2.5rem' }} className="animate-entrance delay-200">
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--slate-800)' }}>Quick Actions</h3>
          <div className="quick-actions-row">
            <div className="quick-action-card" onClick={() => navigate('/clients')}>
              <div className="quick-action-icon bg-emerald" style={{ color: 'white' }}>
                <UserPlus size={24} />
              </div>
              <div className="quick-action-text">
                <h4>Add Client</h4>
                <p>Register a new client profile</p>
              </div>
              <ArrowRight size={20} color="var(--slate-300)" style={{ marginLeft: 'auto' }} />
            </div>

            <div className="quick-action-card" onClick={() => navigate('/projects')}>
              <div className="quick-action-icon bg-blue" style={{ color: 'white' }}>
                <PlusCircle size={24} />
              </div>
              <div className="quick-action-text">
                <h4>New Project</h4>
                <p>Create a project and assign sites</p>
              </div>
              <ArrowRight size={20} color="var(--slate-300)" style={{ marginLeft: 'auto' }} />
            </div>

            <div className="quick-action-card" onClick={() => navigate('/machines')}>
              <div className="quick-action-icon bg-orange" style={{ color: 'white' }}>
                <Monitor size={24} />
              </div>
              <div className="quick-action-text">
                <h4>Assign Machine</h4>
                <p>Link machines to active clients</p>
              </div>
              <ArrowRight size={20} color="var(--slate-300)" style={{ marginLeft: 'auto' }} />
            </div>
          </div>
        </div>
      )}

      {/* CHARTS & ACTIVITY */}
      <div className="charts-grid animate-entrance delay-300" style={{ marginTop: '2rem' }}>
        {/* 7-Day Revenue Trend (Bar Chart with Clear Labels) */}
        {user?.role !== 'Maintenance_Head' && (
          <div className="glass-panel chart-card hover-float">
            <h3 className="chart-title">7-Day Daily Revenue (₹)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
              Daily collection trend over the last 7 days
            </p>
            <div style={{ height: '300px', width: '100%' }}>
              {finalChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={finalChartData} margin={{ top: 25, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorRevenueBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-primary)', fontSize: 13, fontWeight: 600}} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} tickFormatter={(value) => `₹${value}`} />
                    <Tooltip 
                      cursor={{fill: 'rgba(59, 130, 246, 0.08)'}}
                      contentStyle={{backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)', padding: '12px'}}
                      formatter={(value) => [`₹${value}`, 'Revenue']}
                    />
                    <Bar dataKey="total" fill="url(#colorRevenueBar)" radius={[8, 8, 0, 0]} maxBarSize={50}>
                      <LabelList dataKey="total" position="top" formatter={(val) => `₹${val}`} style={{ fill: 'var(--text-primary)', fontWeight: 'bold', fontSize: '13px' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)' }}>
                  No revenue data available.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Machine Health Distribution (Donut Chart + Clear Status Cards) */}
        <div className="glass-panel chart-card hover-float">
          <h3 className="chart-title">Machine Status Distribution</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', marginTop: '-0.5rem' }}>
            Live operational status of all registered machines
          </p>
          <div style={{ height: '310px', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {(() => {
              const activeCount = finalMachineHealth.find(s => s.name?.toLowerCase() === 'active' || s.name?.toLowerCase() === 'ready')?.value || 0;
              const inactiveCount = finalMachineHealth.find(s => s.name?.toLowerCase() === 'failed' || s.name?.toLowerCase() === 'inactive' || s.name?.toLowerCase() === 'offline' || s.name?.toLowerCase() === 'busy')?.value || 0;
              const maintCount = finalMachineHealth.find(s => s.name?.toLowerCase() === 'maintenance')?.value || 0;
              const totalCount = activeCount + inactiveCount + maintCount;

              const healthData = [
                { name: 'Active', value: activeCount, color: '#10b981' },
                { name: 'Inactive', value: inactiveCount, color: '#ef4444' },
                { name: 'Maintenance', value: maintCount, color: '#f59e0b' }
              ];

              return (
                <>
                  {/* Donut Chart Ring */}
                  <div style={{ height: '190px', width: '100%', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={healthData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          dataKey="value"
                          stroke="none"
                          paddingAngle={totalCount > 1 ? 4 : 0}
                        >
                          {healthData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                          formatter={(value, name) => [`${value} Machines`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text Showing Total Machines */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none'
                    }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1' }}>{totalCount}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>Total Machines</div>
                    </div>
                  </div>

                  {/* 3 Clear Stat Boxes below the Donut Ring */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginTop: '0.5rem' }}>
                    <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
                      <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                        Active
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{activeCount}</div>
                    </div>

                    <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center' }}>
                      <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                        Inactive
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{inactiveCount}</div>
                    </div>

                    <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', textAlign: 'center' }}>
                      <div style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                        Maintenance
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{maintCount}</div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Top Projects (Horizontal Bar Chart) */}
        {user?.role !== 'Maintenance_Head' && (
          <div className="glass-panel chart-card hover-float">
            <h3 className="chart-title">Top Revenue Projects</h3>
            <div style={{ height: '300px', width: '100%' }}>
              {finalTopProjects.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={finalTopProjects} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border-color)" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500}} width={100} />
                    <Tooltip 
                      cursor={{fill: 'var(--table-hover)'}}
                      contentStyle={{backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="total" fill="url(#colorBar)" radius={[0, 8, 8, 0]} barSize={20} />
                    <defs>
                      <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.85}/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)' }}>
                  No project revenue data.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity (Existing) */}
        {user?.role !== 'Maintenance_Head' && (
          <div className="glass-panel chart-card hover-float">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="chart-title" style={{ margin: 0 }}>Recent Activity</h3>
              <button onClick={() => navigate('/transactions')} className="btn btn-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.5rem' }}>View All</button>
            </div>
            <div className="activity-list" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {finalRecentActivity.length > 0 ? (
                finalRecentActivity.map((t) => (
                  <div key={t.id} className="activity-item" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className={`activity-icon ${t.status === 'success' ? 'bg-emerald' : 'bg-rose'}`} style={{ color: 'white', opacity: 0.9 }}>
                      <IndianRupee size={18} />
                    </div>
                    <div className="activity-details">
                      <p className="title">Machine {t.machin_id} ({t.status})</p>
                      <p className="desc">{t.project_name || 'No Project'} | {t.client_name || 'No Client'}</p>
                    </div>
                    <div className="activity-meta">
                      <p className="value" style={{ color: t.status === 'success' ? '#10b981' : '#ef4444' }}>
                        {t.status === 'success' ? '+' : ''}₹{t.trans_amt}
                      </p>
                      <p className="time">{new Date(t.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-400)' }}>
                  No recent activity.
                </div>
              )}
            </div>
          </div>
        )}
        {/* Recent Maintenance Logs (Admin/Maintenance_Head only) */}
        {(user?.role === 'Admin' || user?.role === 'Maintenance_Head') && (
          <div className="glass-panel chart-card hover-float">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="chart-title" style={{ margin: 0, display:'flex', alignItems:'center', gap:'0.5rem' }}><Wrench size={18}/> Recent Logs</h3>
              <button onClick={() => navigate('/maintenance-logs')} className="btn btn-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.5rem' }}>View All</button>
            </div>
            <div className="activity-list" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <div key={log.log_id} className="activity-item" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="activity-icon bg-blue" style={{ color: 'white', opacity: 0.9 }}>
                      <CheckCircle size={18} />
                    </div>
                    <div className="activity-details">
                      <p className="title">{log.machine_id} Fixed</p>
                      <p className="desc" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>By {log.tech_name} - PCB: {log.pcb_condition || 'N/A'}</p>
                    </div>
                    <div className="activity-meta">
                      <p className="value" style={{ color: '#10b981', fontSize: '0.85rem' }}>Fixed</p>
                      <p className="time" style={{ fontSize: '0.75rem' }}>{new Date(log.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-400)' }}>
                  No recent maintenance logs.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Water Level Low Alerts Card (Fills empty dashboard space as requested) */}
        <div className="glass-panel chart-card hover-float" style={{ border: lowWaterMachines.length > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="chart-title" style={{ margin: 0, display:'flex', alignItems:'center', gap:'0.5rem', color: lowWaterMachines.length > 0 ? '#ef4444' : 'var(--text-primary)' }}>
              <Droplet size={18} color={lowWaterMachines.length > 0 ? '#ef4444' : '#3b82f6'} /> Water Level Alerts
            </h3>
            <button onClick={() => navigate('/machines')} className="btn btn-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem', borderRadius: '0.5rem' }}>View Machines</button>
          </div>
          <div className="activity-list" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {lowWaterMachines.length > 0 ? (
              lowWaterMachines.map((m) => (
                <div key={m.id} className="activity-item" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="activity-icon bg-rose" style={{ color: 'white', opacity: 0.9 }}>
                      <AlertTriangle size={18} />
                    </div>
                    <div className="activity-details">
                      <p className="title" style={{ color: '#ef4444', fontWeight: '700', margin: 0 }}>Machine {m.id}</p>
                      <p className="desc" style={{ color: 'var(--slate-600)', margin: '2px 0 0 0', fontSize: '0.8rem' }}>Water Level Low - Refill Required Immediately</p>
                    </div>
                  </div>
                  <div className="activity-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                    <span style={{ padding: '0.2rem 0.6rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>LOW WATER</span>
                    <button 
                      onClick={async () => {
                        try {
                          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/iot/reset-water/${m.id}`);
                          setLiveStatus(prev => ({ ...prev, [m.id]: { ...prev[m.id], water_level: 'NORMAL' } }));
                        } catch(e) {}
                      }} 
                      className="btn btn-secondary" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderRadius: '0.3rem', backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer' }}
                      title="Click when water tank is refilled"
                    >
                      ✓ Mark Refilled
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--slate-400)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', marginBottom: '0.5rem' }}>
                  <Droplet size={24} />
                </div>
                <div style={{ fontWeight: '600', color: 'var(--slate-700)' }}>All Water Levels Normal</div>
                <div style={{ fontSize: '0.85rem' }}>No low water alerts detected across any active IoT machines.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NATIONWIDE INSTALLATIONS MAP */}
      <InstallationsMap />
    </div>
  );
};

export default Dashboard;
