import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import Machines from './pages/Machines';
import QRPay from './pages/QRPay';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Staff from './pages/Staff';
import UnassignedMachines from './pages/UnassignedMachines';
import MaintenanceAllocation from './pages/MaintenanceAllocation';
import FieldTechView from './pages/FieldTechView';
import TestForm from './pages/TestForm';
import MaintenanceLogs from './pages/MaintenanceLogs';
import TermsConditions from './pages/TermsConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import RefundPolicy from './pages/RefundPolicy';
import ContactUs from './pages/ContactUs';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';

const RoleBasedRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'Field_Tech') return <Navigate to="/clients" replace />;
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster 
          position="top-right" 
          toastOptions={{ 
            duration: 4000, 
            style: { 
              background: 'rgba(30, 41, 59, 0.75)', 
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff', 
              padding: '16px', 
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }} 
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pay/:machineId" element={<QRPay />} />
          
          {/* Public Legal Pages for Razorpay */}
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/contact-us" element={<ContactUs />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={
              <ProtectedRoute>
                <RoleBasedRedirect />
              </ProtectedRoute>
            } />
            <Route path="dashboard" element={<ProtectedRoute allowedRoles={['Admin', 'Client', 'Maintenance_Head']}><Dashboard /></ProtectedRoute>} />
            <Route path="clients" element={<ProtectedRoute allowedRoles={['Admin', 'Field_Tech']}><Clients /></ProtectedRoute>} />
            <Route path="projects" element={<ProtectedRoute allowedRoles={['Admin', 'Client', 'Field_Tech']}><Projects /></ProtectedRoute>} />
            <Route path="machines" element={<ProtectedRoute allowedRoles={['Admin', 'Client', 'Field_Tech']}><Machines /></ProtectedRoute>} />
            <Route path="unassigned-machines" element={<ProtectedRoute allowedRoles={['Admin']}><UnassignedMachines /></ProtectedRoute>} />
            <Route path="transactions" element={<ProtectedRoute allowedRoles={['Admin', 'Client']}><Transactions /></ProtectedRoute>} />
            <Route path="reports" element={<ProtectedRoute allowedRoles={['Admin', 'Client']}><Reports /></ProtectedRoute>} />
            <Route path="analytics" element={<ProtectedRoute allowedRoles={['Admin', 'Client']}><Analytics /></ProtectedRoute>} />
            <Route path="staff" element={<ProtectedRoute allowedRoles={['Admin', 'Maintenance_Head']}><Staff /></ProtectedRoute>} />
            <Route path="allocations" element={<ProtectedRoute allowedRoles={['Maintenance_Head']}><MaintenanceAllocation /></ProtectedRoute>} />
            <Route path="maintenance-logs" element={<ProtectedRoute allowedRoles={['Admin', 'Maintenance_Head']}><MaintenanceLogs /></ProtectedRoute>} />
            <Route path="field-tech" element={<ProtectedRoute allowedRoles={['Field_Tech']}><FieldTechView /></ProtectedRoute>} />
            <Route path="test-form" element={<ProtectedRoute allowedRoles={['Field_Tech']}><TestForm /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
