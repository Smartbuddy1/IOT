import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import IOItem from './IOItem';
import { Activity, Cpu, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const IODashboard = ({ machineId, status, machineDetails }) => {
    const { user } = useAuth();
    const [ioList, setIoList] = useState([]);
    const [ioStates, setIoStates] = useState({});
    const [remarks, setRemarks] = useState({});
    const [testResults, setTestResults] = useState({});
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState({});
    const [coinsReceived, setCoinsReceived] = useState(0);

    useEffect(() => {
        const fetchIOList = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';
                const response = await axios.get(`${apiUrl}/diagnostics/io-list`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setIoList(response.data.data);
                
                const initialStates = {};
                response.data.data.forEach(item => {
                    initialStates[item.name] = false;
                });
                setIoStates(initialStates);
                setLoading(false);
            } catch (error) {
                toast.error('Failed to load I/O configuration.');
                setLoading(false);
            }
        };

        fetchIOList();
    }, [ioList.length]);

    useEffect(() => {
        let intervalId;
        const fetchLiveIO = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';
                const response = await axios.get(`${apiUrl}/diagnostics/machine/${machineId}/live-io`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                if (response.data.success && response.data.states) {
                    setIoStates(prev => {
                        const newStates = { ...prev };
                        let hasChanges = false;
                        let autoEvalUpdates = {};

                        for (const key in response.data.states) {
                            // Don't overwrite state if we are currently waiting for a manual toggle response
                            if (!toggling[key] && newStates[key] !== response.data.states[key]) {
                                newStates[key] = response.data.states[key];
                                hasChanges = true;
                                
                                // Auto-Evaluate is removed as requested by user.
                            }
                        }
                        return hasChanges ? newStates : prev;
                    });
                    
                    if (response.data.coinsReceived !== undefined) {
                        setCoinsReceived(response.data.coinsReceived);
                    }
                }
            } catch (error) {
                // Silently ignore polling errors
            }
        };

        if (machineId && !loading) {
            fetchLiveIO(); // Fetch immediately once
            intervalId = setInterval(fetchLiveIO, 2000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [machineId, loading, toggling]);

    const handleRemarkChange = (ioName, value) => {
        setRemarks(prev => ({ ...prev, [ioName]: value }));
    };

    const handleTestResultChange = (ioName, value) => {
        setTestResults(prev => ({ ...prev, [ioName]: value }));
    };

    const handleToggle = async (ioName, newState) => {
        const oldState = ioStates[ioName];
        const newIoStates = { ...ioStates, [ioName]: newState };
        setIoStates(newIoStates);
        setToggling(prev => ({ ...prev, [ioName]: true }));

        try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';
            await axios.post(`${apiUrl}/diagnostics/machine/${machineId}/command`, {
                states: newIoStates
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success(`${ioName} turned ${newState ? 'ON' : 'OFF'}`);
        } catch (error) {
            setIoStates(prev => ({ ...prev, [ioName]: oldState }));
            const errMsg = error.response?.data?.error || error.message;
            if (errMsg.includes('Hardware Fault')) {
                toast.error(errMsg, { duration: 5000, icon: '⚠️' });
            } else {
                toast.error(`Failed to send command to ${ioName}`);
            }
        } finally {
            setToggling(prev => ({ ...prev, [ioName]: false }));
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                Loading Dashboard...
            </div>
        );
    }

    const formatDateTime = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
    };

    const getBase64FromUrl = async (url, originalUrl) => {
        const urlsToTry = [];
        if (originalUrl && originalUrl.includes('amazonaws.com')) {
           const pathOnly = originalUrl.replace(/https?:\/\/[^\/]+\.amazonaws\.com/, '');
           urlsToTry.push(window.location.origin + '/s3-proxy' + pathOnly);
        }
        if (originalUrl) urlsToTry.push(originalUrl);
        else urlsToTry.push(url);
        
        if (originalUrl && originalUrl.startsWith('http')) {
           urlsToTry.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`);
           urlsToTry.push(`https://corsproxy.io/?${encodeURIComponent(originalUrl)}`);
        }

        for (const attemptUrl of urlsToTry) {
          try {
            const res = await fetch(attemptUrl, { method: 'GET', mode: 'cors' });
            if (!res.ok) continue;
            
            const blob = await res.blob();
            if (!blob.type.startsWith('image/')) continue; 

            const rawDataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            return await new Promise((resolve) => {
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
                } catch (e) {
                  resolve(null);
                }
              };
              img.onerror = () => resolve(null);
              img.src = rawDataUrl;
            });
          } catch (error) {
            console.warn(`Failed to fetch image from ${attemptUrl}`, error.message);
          }
        }
        return null;
    };

    const drawPDF = (clientImgObj, sbImgObj) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        // Client Logo
        if (clientImgObj && clientImgObj.base64) {
          const maxWidth = 35;
          const maxHeight = 20;
          let calcWidth = maxWidth;
          let calcHeight = (clientImgObj.height * maxWidth) / clientImgObj.width;
          if (calcHeight > maxHeight) {
            calcHeight = maxHeight;
            calcWidth = (clientImgObj.width * maxHeight) / clientImgObj.height;
          }
          const yOffset = 8 + (maxHeight - calcHeight) / 2;
          doc.addImage(clientImgObj.base64, clientImgObj.ext, 14, yOffset, calcWidth, calcHeight);
        } else {
          doc.setDrawColor(37, 99, 235);
          doc.rect(14, 10, 35, 20);
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(9);
          doc.text("Client Logo", 31.5, 21, { align: 'center' });
        }

        // SB Logo
        if (sbImgObj && sbImgObj.base64) {
          const sbMaxWidth = 35;
          const sbMaxHeight = 20;
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
        
        // Header Text
        const title = "DIAGNOSTICS & I/O TEST REPORT";
        const centerX = pageWidth / 2;
        doc.setTextColor(16, 185, 129); // Green
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(title, centerX, 15, { align: 'center', maxWidth: 110 });
        
        const finalClientName = machineDetails?.client_name || 'Mock Client';
        const toiletLocationStr = machineDetails?.city || 'Various Locations';

        doc.setTextColor(37, 99, 235); // Blue
        doc.setFontSize(10);
        doc.text(`Client Name: ${finalClientName}`, centerX, 22, { align: 'center', maxWidth: 110 });
        
        doc.setTextColor(100, 100, 100); // Gray
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Toilet ID: ${machineId}`, centerX, 28, { align: 'center', maxWidth: 110 });
        doc.text(`Location: ${toiletLocationStr}`, centerX, 33, { align: 'center', maxWidth: 110 });

        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.5);
        doc.line(14, 38, pageWidth - 14, 38);

        // Table
        const headers = [['Type', 'Component Name', 'Status', 'Remark']];
        const rows = ioList.map(item => [
            item.type,
            item.name,
            testResults[item.name] || 'Not Tested',
            remarks[item.name] || 'N/A'
        ]);

        autoTable(doc, {
          head: headers,
          body: rows,
          startY: 42,
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

            // Footer
            const sepY = pageHeight - 15;
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(14, sepY, pageWidth - 14, sepY);

            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('AARYA INNOVTECH PVT. LTD. CIN: U29305MH2019PTC327551 | +91 9359604384 | https://aaryainnovtech.com/', 14, sepY + 5);
            doc.text('Nashik Office: Flat No.4A, Sayali Darshan A-Wing, Makhamalabad Road, Nashik-422003.', 14, sepY + 9);
            
            const generateDate = formatDateTime(new Date());
            doc.text(`Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, pageWidth - 14, sepY + 5, { align: 'right' });
            doc.text(`Generated on: ${generateDate}`, pageWidth - 14, sepY + 9, { align: 'right' });
          }
        });
        
        // Signatures (Last Page)
        const sigY = pageHeight - 25;
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.2);
        
        doc.line(14, sigY, 64, sigY);
        doc.text('Technician / Engineer', 39, sigY + 5, { align: 'center' });
        doc.text(`(${user?.name || 'Unknown'})`, 39, sigY + 9, { align: 'center' });
        
        doc.line(pageWidth - 64, sigY, pageWidth - 14, sigY);
        doc.text('Authorized Signatory', pageWidth - 39, sigY + 5, { align: 'center' });
        
        const reportId = `DIAG-${machineId}-${Math.floor(Math.random() * 100000)}`;
        doc.save(`${reportId}.pdf`);
    };

    const generatePDFReport = async () => {
        toast.loading("Saving and Generating Report...", { id: 'pdfGen' });
        
        // 1. Save Report to Database
        try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';
            await axios.post(`${apiUrl}/diagnostics/machine/${machineId}/save-report`, {
                testResults,
                remarks,
                techId: user?.id || 1
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success("Report Saved to DB", { id: 'pdfGen' });
        } catch (error) {
            toast.error("Failed to save report to DB", { id: 'pdfGen' });
            return; // Stop if saving fails
        }

        // 2. Generate PDF
        toast.loading("Generating HD PDF...", { id: 'pdfGen' });
        let clientImgObj = null;
        
        let clientLogoUrl = machineDetails?.client_logo;
        if (clientLogoUrl && !clientLogoUrl.startsWith('http')) {
            clientLogoUrl = window.location.origin + (clientLogoUrl.startsWith('/') ? '' : '/') + clientLogoUrl;
        }

        if (clientLogoUrl) {
          clientImgObj = await getBase64FromUrl(clientLogoUrl, clientLogoUrl);
        } 
        
        if (!clientImgObj) {
          const defaultLeftUrl = window.location.origin + `/logo_left.jpeg`;
          clientImgObj = await getBase64FromUrl(defaultLeftUrl, defaultLeftUrl);
        }

        const sbLogoUrl = window.location.origin + `/logo_new.png`;
        const sbImgObj = await getBase64FromUrl(sbLogoUrl, sbLogoUrl);

        toast.dismiss('pdfGen');
        drawPDF(clientImgObj, sbImgObj);
    };

    const inputs = ioList.filter(i => i.type === 'Digital Input');
    const outputs = ioList.filter(i => i.type === 'Digital Output');

    return (
        <div className="diag-card">
            <div className="dash-header">
                <div className="dash-title-wrap">
                    <Activity color="var(--primary-color)" />
                    <h2 className="dash-title">I/O Test Dashboard</h2>
                </div>
                <div className="dash-badge">
                    <AlertTriangle size={16} />
                    <span>Maintenance Mode Active</span>
                </div>
            </div>
            
            <div className="dash-body">
                <div className="dash-info-box">
                    <div>
                        <p className="dash-info-label">Machine ID</p>
                        <p className="dash-info-val">{machineId}</p>
                    </div>
                    <Cpu color="var(--primary-color)" size={48} opacity={0.3} />
                </div>

                <div className="dash-grid">
                    <div>
                        <div className="dash-section-header">
                            <h3 className="dash-section-title">Inputs (Live)</h3>
                            <span className="dash-count-badge">{inputs.length} items</span>
                        </div>
                        <div>
                            {inputs.map(item => (
                                <IOItem 
                                    key={item.id} 
                                    item={item} 
                                    status={ioStates[item.name]} 
                                    remark={remarks[item.name]}
                                    onRemarkChange={handleRemarkChange}
                                    testResult={testResults[item.name]}
                                    onTestResultChange={handleTestResultChange}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="dash-section-header">
                            <h3 className="dash-section-title">Outputs (Control)</h3>
                            <span className="dash-count-badge">{outputs.length} items</span>
                        </div>
                        <div>
                            {outputs.map(item => (
                                <IOItem 
                                    key={item.id} 
                                    item={item} 
                                    status={ioStates[item.name]}
                                    remark={remarks[item.name]}
                                    onRemarkChange={handleRemarkChange}
                                    testResult={testResults[item.name]}
                                    onTestResultChange={handleTestResultChange}
                                    loading={toggling[item.name]}
                                    onToggle={handleToggle}
                                    coinsReceived={item.name === 'Coin Acceptor Control' ? coinsReceived : undefined}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="dash-actions">
                    <button onClick={generatePDFReport} className="btn-pdf-export">
                        <FileText size={18} /> Save & Download Report
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IODashboard;
