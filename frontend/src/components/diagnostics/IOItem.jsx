import React from 'react';
import { Power, Circle, Settings2, MessageSquare } from 'lucide-react';

const IOItem = ({ item, status, onToggle, loading, remark, onRemarkChange, testResult, onTestResultChange, coinsReceived }) => {
    const isInput = item.type === 'Digital Input';
    const isOn = status === true;

    // Helper for dropdown styling
    const getDropdownClass = () => {
        let cls = "premium-select ";
        if (testResult === 'Working OK') cls += "ok";
        else if (testResult === 'Faulty') cls += "faulty";
        return cls;
    };

    return (
        <div className="io-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div className="io-info-wrap">
                    <div className={`io-icon ${isOn ? 'on' : 'off'}`}>
                        {isInput ? <Settings2 size={24} /> : <Power size={24} />}
                    </div>
                    <div>
                        <h3 className="io-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {item.name}
                            {coinsReceived !== undefined && coinsReceived > 0 && (
                                <span style={{ backgroundColor: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    ₹{coinsReceived} Received
                                </span>
                            )}
                        </h3>
                        <p className="io-desc">{item.description}</p>
                    </div>
                </div>
                
                <div className="io-controls">
                    <span className="io-voltage">
                        {item.voltage}
                    </span>
                    
                    {isInput ? (
                        <div className={`io-status-indicator ${isOn ? 'on' : 'off'}`}>
                            <Circle size={16} fill="currentColor" />
                            <span>{isOn ? 'ON' : 'OFF'}</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => onToggle(item.name, true)}
                                disabled={loading || isOn}
                                className={`io-btn-on ${isOn ? 'active' : ''}`}
                            >
                                ON
                            </button>
                            <button
                                onClick={() => onToggle(item.name, false)}
                                disabled={loading || !isOn}
                                className={`io-btn-off ${!isOn ? 'active' : ''}`}
                            >
                                OFF
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="io-remark-area">
                <select 
                    value={testResult || 'Not Tested'} 
                    onChange={(e) => onTestResultChange && onTestResultChange(item.name, e.target.value)}
                    className={getDropdownClass()}
                >
                    <option value="Not Tested">Not Tested</option>
                    <option value="Working OK">✅ Working OK</option>
                    <option value="Faulty">❌ Faulty</option>
                </select>

                <MessageSquare size={16} color="var(--slate-400)" style={{ marginLeft: '0.5rem' }} />
                <input 
                    type="text" 
                    placeholder="Add remark..." 
                    value={remark || ''}
                    onChange={(e) => onRemarkChange && onRemarkChange(item.name, e.target.value)}
                    className="remark-input"
                />
            </div>
        </div>
    );
};

export default IOItem;
