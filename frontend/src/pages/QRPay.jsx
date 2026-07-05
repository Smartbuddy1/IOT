import React, { useState, useEffect } from 'react'; // Forced Update for Vercel
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Loader2, Sun, Moon, AlertCircle } from 'lucide-react';

const QRPay = () => {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  // Local theme state synchronized with document and localStorage
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Razorpay requires loading a script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    // Fetch machine details to show rate and check health
    const fetchMachineDetails = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/machines/${machineId}`);
        const fetchedMachine = response.data.machine;
        
        if (fetchedMachine) {
          const status = fetchedMachine.status?.toLowerCase()?.trim();
          
          if (status === 'ready' || status === 'active' || status === 'idle' || status === 'online') {
            // Machine is safe to use
            setMachine(fetchedMachine);
          } else if (status === 'busy') {
            setError('❌ Machine is busy, try after some time.');
            axios.post(`${import.meta.env.VITE_API_BASE_URL}/transactions/save`, {
              machine_id: machineId, amount: fetchedMachine.uses_amt || 5, pay_id: 'scan_busy', order_id: `scan_${Date.now()}`, status: 'failed'
            }).catch(() => {});
          } else if (status === 'maintenance' || status === 'in maintenance' || status === 'under maintenance') {
            setError('⚠️ Machine is in maintenance. Payment cannot be processed.');
            axios.post(`${import.meta.env.VITE_API_BASE_URL}/transactions/save`, {
              machine_id: machineId, amount: fetchedMachine.uses_amt || 5, pay_id: 'scan_maintenance', order_id: `scan_${Date.now()}`, status: 'failed'
            }).catch(() => {});
          } else {
            // Blocks 'failed', 'offline', and ANY unknown status!
            setError('⚠️ Machine is offline or unavailable. Payment disabled.');
            axios.post(`${import.meta.env.VITE_API_BASE_URL}/transactions/save`, {
              machine_id: machineId, amount: fetchedMachine.uses_amt || 5, pay_id: 'scan_offline', order_id: `scan_${Date.now()}`, status: 'failed'
            }).catch(() => {});
          }
        } else {
          setError('Machine not found in our records.');
        }
      } catch (err) {
        console.error(err);
        setError("Failed to connect to the machine server.");
      } finally {
        setLoading(false);
      }
    };
    
    if (machineId) {
      fetchMachineDetails();
    } else {
      setError("Invalid machine QR code.");
      setLoading(false);
    }
  }, [machineId]);

  const handlePayment = async () => {
    setProcessing(true);
    setError('');
    
    try {
      // 1. Create order on our server
      const orderRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/transactions/pay`, {
        machine_id: machineId,
        amount: machine.uses_amt // Typically from user selection, but using fixed rate for demo
      });
      
      const { order_id, amount, currency, key } = orderRes.data;
      
      // 2. Open Razorpay Checkout
      const options = {
        key: key, // Dynamically use the Razorpay Key ID from the backend
        amount: amount, // amount in the smallest currency unit
        currency: currency || 'INR',
        name: "SmartBuddy",
        description: `Machine activation for ${machineId}`,
        order_id: order_id,
        handler: async function (response) {
          try {
            // 3. Verify and save transaction
            const verifyRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/transactions/save`, {
              order_id: response.razorpay_order_id,
              pay_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              machine_id: machineId,
              amount: machine.uses_amt,
              status: 'success'
            });
            
            if (verifyRes.data.success) {
              alert("Payment successful! Machine is activating...");
              // Optional: Redirect to a success page
            } else {
              setError("Payment verification failed on server.");
              axios.post(`${import.meta.env.VITE_API_BASE_URL}/transactions/save`, {
                machine_id: machineId, amount: machine.uses_amt, pay_id: response.razorpay_payment_id || 'verify_failed', order_id: order_id, status: 'failed'
              }).catch(() => {});
            }
          } catch (err) {
            console.error("Verification error", err);
            setError("Failed to verify payment with server.");
            axios.post(`${import.meta.env.VITE_API_BASE_URL}/transactions/save`, {
              machine_id: machineId, amount: machine.uses_amt, pay_id: 'verify_error', order_id: order_id, status: 'failed'
            }).catch(() => {});
          }
        },
        modal: {
          ondismiss: function () {
            axios.post(`${import.meta.env.VITE_API_BASE_URL}/transactions/save`, {
              machine_id: machineId, amount: machine.uses_amt, pay_id: 'payment_cancelled', order_id: order_id, status: 'failed'
            }).catch(() => {});
          }
        },
        prefill: {
          name: "Guest User",
          email: "guest@example.com",
          contact: "9999999999"
        },
        theme: {
          color: "#3b82f6"
        }
      };
      
      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response){
        setError("Payment was failed or cancelled. Please try again.");
        axios.post(`${import.meta.env.VITE_API_BASE_URL}/transactions/save`, {
          machine_id: machineId,
          amount: machine.uses_amt || 5,
          pay_id: response.error?.metadata?.payment_id || 'payment_failed',
          order_id: response.error?.metadata?.order_id || order_id,
          status: 'failed'
        }).catch(() => {});
      });
      rzp1.open();
      
    } catch (err) {
      console.error('Payment initialization error:', err);
      // Extract the actual error message sent by the backend if it exists
      const errorMessage = err.response?.data?.message || err.message || "Failed to initiate payment. Please check your connection.";
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="loading-screen">Loading machine details...</div>;
  }

  if (error && !machine) {
    return (
      <div className="auth-container">
        <div className="auth-bg-shape-1"></div>
        <div className="auth-bg-shape-2"></div>
        <button 
          type="button"
          className="auth-theme-toggle"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <div className="glass-panel auth-card animate-entrance" style={{ textAlign: 'center' }}>
          <div style={{ color: '#ef4444', marginBottom: '1.5rem' }}>
            <AlertCircle size={48} style={{ margin: '0 auto' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Error</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* Decorative Animated Mesh Blobs */}
      <div className="auth-bg-shape-1"></div>
      <div className="auth-bg-shape-2"></div>
      
      {/* Glassmorphic Theme Switcher */}
      <button 
        type="button"
        className="auth-theme-toggle"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      {/* Main Payment Card */}
      <div className="glass-panel auth-card animate-entrance">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            height: '64px', width: '64px', 
            backgroundColor: 'var(--primary-light)', 
            color: 'var(--primary-color)', 
            borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            boxShadow: '0 8px 16px -4px var(--primary-light)'
          }}>
            <ShieldCheck size={32} />
          </div>
          <h1 className="auth-title" style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>Pay to Activate</h1>
          <p className="auth-subtitle">Machine ID: <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{machineId}</span></p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ 
          backgroundColor: 'var(--surface-bg)', 
          padding: '1.5rem', 
          borderRadius: '1rem', 
          marginBottom: '2rem',
          border: '1px solid var(--border-color)',
          textAlign: 'center',
          boxShadow: '0 8px 20px -8px var(--shadow-color)'
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Amount to Pay</p>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            ₹{machine?.uses_amt || '0.00'}
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>for {machine?.flush_time || '1'} minutes</p>
        </div>

        <button 
          onClick={handlePayment}
          disabled={processing}
          className="btn btn-primary btn-block"
          style={{ padding: '1rem', fontSize: '1.125rem', display: 'flex', gap: '8px', height: '3.5rem' }}
        >
          {processing ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Processing...
            </>
          ) : 'Pay Now'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1.5rem' }}>
          Secured by Razorpay
        </p>
      </div>
    </div>
  );
};

export default QRPay;
