import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Activity, Users, Monitor, IndianRupee, FolderPlus, Wrench, CheckCircle, XCircle, Tag, PlusCircle, UserPlus, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import InstallationsMap from '../components/InstallationsMap';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/dashboard/stats`);
        setStats(response.data.stats);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // Poll IoT Live Data every 3 seconds
  useEffect(() => {
    const fetchLiveStatus = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/iot/live-status`);
        if (response.data.success) {
          setLiveStatus(response.data.data);
        }
      } catch (error) {
        // Silently fail to avoid console spam
      }
    };
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="loading-screen">Loading beautiful dashboard...</div>;
  }

  const finalChartData = stats?.chartData || [];
  const finalMachineHealth = stats?.machineHealth || [];
  const finalTopProjects = stats?.topProjectsList || [];
  const finalRecentActivity = stats?.recentTransactions || [];

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
          <p style={{ color: 'var(--slate-500)', fontSize: '1.1rem' }}>Hello {user?.username}, here is your system overview.</p>
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
      {/* ANALYTICS ROW 1 */}
      <div className="charts-grid animate-entrance delay-300" style={{ marginTop: '2rem' }}>
        {/* 7-Day Revenue Trend (Area Chart) */}
        <div className="glass-panel chart-card hover-float">
          <h3 className="chart-title">7-Day Revenue Trend</h3>
          <div style={{ height: '300px', width: '100%' }}>
            {finalChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={finalChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.85}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#8b5cf6" floodOpacity="0.4"/>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '3 3' }}
                    contentStyle={{backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)', padding: '12px'}}
                  />
                  <Area type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorTrend)" style={{ filter: 'url(#glow)' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)' }}>
                No trend data available.
              </div>
            )}
          </div>
        </div>

        {/* Machine Health Distribution (Donut Chart) */}
        <div className="glass-panel chart-card hover-float">
          <h3 className="chart-title">Machine Health Distribution</h3>
          <div style={{ height: '300px', width: '100%' }}>
            {(() => {
              // Normalize data for UI consistency
              const healthData = [
                { name: 'Active', value: finalMachineHealth.find(s => s.name?.toLowerCase() === 'active' || s.name?.toLowerCase() === 'ready')?.value || 0, color: '#10b981' }, // Emerald Green
                { name: 'Failed', value: finalMachineHealth.find(s => s.name?.toLowerCase() === 'failed' || s.name?.toLowerCase() === 'busy')?.value || 0, color: '#ef4444' }, // Rose Red
                { name: 'Maintenance', value: finalMachineHealth.find(s => s.name?.toLowerCase() === 'maintenance')?.value || 0, color: '#f59e0b' } // Amber Orange
              ];

              return (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={healthData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      stroke="none"
                      label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : null}
                      labelLine={({ percent }) => percent > 0}
                    >
                      {healthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ANALYTICS ROW 2 */}
      <div className="charts-grid animate-entrance delay-400" style={{ marginTop: '1.5rem' }}>
        {/* Top Projects (Horizontal Bar Chart) */}
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

        {/* Recent Activity (Existing) */}
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
      </div>

      {/* NATIONWIDE INSTALLATIONS MAP */}
      <InstallationsMap />
    </div>
  );
};

export default Dashboard;
