import express from 'express';
import db from '../config/db.js';
import { getIOList } from '../services/mqttDiagnosticsMock.js';
import { publishMessage, getLiveIOState } from '../services/mqttService.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authenticateToken, requireRole(['Admin', 'Superadmin']));

// Get live IO status
router.get('/machine/:id/live-io', (req, res) => {
    const { id } = req.params;
    const cacheData = getLiveIOState(id.trim());
    if (cacheData && cacheData.states) {
        res.json({ success: true, states: cacheData.states, coinsReceived: cacheData.coinsReceived || 0 });
    } else {
        res.json({ success: false, message: 'No live status available' });
    }
});

// Save Maintenance Report
router.post('/machine/:id/save-report', async (req, res) => {
    const { id } = req.params;
    const { testResults, remarks, techId } = req.body;
    
    try {
        // Evaluate PCB condition based on test results
        const hasFaulty = Object.values(testResults || {}).includes('Faulty');
        const pcbCondition = hasFaulty ? 'Faulty' : 'Good';
        
        const reportedIssue = "Routine I/O Diagnostic Test";
        const actionTaken = "Automated System Check via Diagnostics Dashboard";
        
        await db.query(
            `INSERT INTO maintenance_logs 
            (machine_id, tech_id, reported_issue, action_taken, pcb_condition, status, created_at) 
            VALUES (?, ?, ?, ?, ?, 'Fixed', NOW())`,
            [id, techId || 1, reportedIssue, actionTaken, pcbCondition]
        );
        
        res.json({ success: true, message: 'Report saved to Maintenance Logs successfully' });
    } catch (error) {
        console.error('Error saving report:', error.message);
        res.status(500).json({ success: false, error: 'Failed to save maintenance report' });
    }
});

// Get machine status and details
router.get('/machine/:id/status', async (req, res) => {
    const { id } = req.params;
    
    // We removed the early mock fallback to ensure real DB data is fetched.

    try {
        const query = `
            SELECT m.status, m.client_name, m.city, c.client_logo 
            FROM machines m 
            LEFT JOIN clients c ON m.client_name = c.client_name 
            WHERE TRIM(m.machine_id) = TRIM(?)
        `;
        const [rows] = await db.query(query, [id.trim()]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found.' });
        }
        
        const machineData = rows[0];
        
        if (!machineData.status || machineData.status.toLowerCase() !== 'maintenance') {
            return res.status(403).json({ error: 'This machine is not in Maintenance Mode. Please switch it to Maintenance Mode from Settings to access Diagnostics.' });
        }
        
        res.json({ 
            message: 'Access granted.', 
            status: machineData.status,
            machineDetails: {
                client_name: machineData.client_name,
                city: machineData.city,
                client_logo: machineData.client_logo
            }
        });
    } catch (error) {
        console.error('Error fetching machine status:', error);
        
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Get I/O list for dashboard
router.get('/io-list', (req, res) => {
    res.json({ data: getIOList() });
});

// Send real MQTT command
router.post('/machine/:id/command', async (req, res) => {
    const { id } = req.params;
    const { states = {} } = req.body;
    
    try {
        const topic = 'smartbuddy';
        
        // Format: MachineID,OUTPUT_SET,DOORLOCK,EXTRA_OUT,COIN-ACCEPTOR_ON_OFF,VALVE_FLUSH,VALVE-WALL,VALVE-FLOOR,VALVE-EXTRA,LAMP-BUSY,LAMP-VACANT,FAN,LAMP-SQUARE
        const out1 = states['Door Lock'] ? '1' : '0'; // DOORLOCK
        const out2 = states['Buzzer'] ? '1' : '0'; // EXTRA_OUT (Assuming buzzer might be extra out, or we keep it as it was)
        const out3 = states['Coin Acceptor Control'] ? '1' : '0'; // COIN-ACCEPTOR_ON_OFF
        const out4 = states['Flush Valve'] ? '1' : '0'; // VALVE_FLUSH
        const out5 = states['Sprinkler Valve'] ? '1' : '0'; // VALVE-WALL
        const out6 = states['Floor Valve'] ? '1' : '0'; // VALVE-FLOOR
        const out7 = states['Motor (0.5 HP)'] ? '1' : '0'; // VALVE-EXTRA
        const out8 = states['Red Indicator'] ? '1' : '0'; // LAMP-BUSY
        const out9 = states['Green Indicator'] ? '1' : '0'; // LAMP-VACANT
        const out10 = states['Fan'] ? '1' : '0'; // FAN
        const out11 = states['Round Light'] ? '1' : '0'; // LAMP-SQUARE
        
        const payload = `${id.trim()},OUTPUT_SET,${out1},${out2},${out3},${out4},${out5},${out6},${out7},${out8},${out9},${out10},${out11}`;
        
        const success = publishMessage(topic, payload);
        
        if (success) {
            res.json({ success: true, message: 'Command sent to MQTT Broker.' });
        } else {
            res.status(500).json({ error: 'MQTT Broker not connected. Cannot send command.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
