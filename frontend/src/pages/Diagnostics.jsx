import React, { useState } from 'react';
import axios from 'axios';
import { Settings, Search, AlertCircle } from 'lucide-react';
import IODashboard from '../components/diagnostics/IODashboard';
import '../diagnostics.css'; // Import the new vanilla CSS

const Diagnostics = () => {
    const [machineId, setMachineId] = useState('');
    const [status, setStatus] = useState(null);
    const [machineDetails, setMachineDetails] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifiedId, setVerifiedId] = useState(null);

    const handleVerify = async (e) => {
        e.preventDefault();
        const cleanId = machineId.trim();
        if (!cleanId) return;

        setLoading(true);
        setError('');
        setStatus(null);
        setVerifiedId(null);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
            const response = await axios.get(`${apiUrl}/diagnostics/machine/${cleanId}/status`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setStatus(response.data.status);
            setMachineDetails(response.data.machineDetails);
            setVerifiedId(cleanId);
        } catch (err) {
            if (err.response?.status === 403) {
                setError(err.response.data.error || 'Access Denied.');
                setStatus(err.response.data.currentStatus);
            } else if (err.response?.status === 404) {
                setError('Machine not found.');
            } else {
                setError('Failed to verify machine status. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="diag-container">
            <div className="diag-header">
                <div className="diag-header-icon">
                    <Settings size={32} />
                </div>
                <h1 className="diag-title">Machine Diagnostic & I/O Test</h1>
                <p className="diag-subtitle">Hardware verification and testing interface for maintenance staff.</p>
            </div>

            {!verifiedId && (
                <div className="diag-card diag-card-narrow">
                    <form className="diag-form-group" onSubmit={handleVerify}>
                        <div className="diag-form-group">
                            <label htmlFor="machineId" className="diag-label">
                                Machine ID
                            </label>
                            <div className="diag-input-wrapper">
                                <Search className="diag-input-icon" size={20} />
                                <input
                                    type="text"
                                    name="machineId"
                                    id="machineId"
                                    className="diag-input"
                                    placeholder="e.g. M-1002"
                                    value={machineId}
                                    onChange={(e) => setMachineId(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="diag-alert">
                                <AlertCircle className="diag-alert-icon" size={24} />
                                <div>
                                    <h4 className="diag-alert-title">{error}</h4>
                                    {status && (
                                        <p className="diag-alert-text">Current Status: {status}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !machineId.trim()}
                            className="diag-btn"
                        >
                            {loading ? 'Verifying...' : 'Verify & Access Testing'}
                        </button>
                    </form>
                </div>
            )}

            {verifiedId && (
                <IODashboard machineId={verifiedId} status={status} machineDetails={machineDetails} />
            )}
        </div>
    );
};

export default Diagnostics;
