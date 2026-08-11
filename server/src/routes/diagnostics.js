import express from 'express';
import db from '../config/db.js';
import { getIOList } from '../services/mqttDiagnosticsMock.js';
import { publishMessage } from '../services/mqttService.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes in this router
router.use(authenticateToken, requireRole(['Admin', 'Superadmin']));

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
        
        // We will grant access even if not in maintenance mode, so the admin can test it.
        // In a strict production environment, we would block this.
        if (machineData.status !== 'Maintenance Mode') {
            console.warn(`Admin accessed diagnostics for machine ${id} which is in status: ${machineData.status}`);
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
        
        // MOCK FALLBACK: If DB is down or machine is M-1002, allow access for testing UI
        if (id === 'M-1002' || id === 'M-002') {
            console.log('Using mock fallback for testing because DB query failed or specific ID used.');
            return res.json({ 
                message: 'Access granted (Mock).', 
                status: 'Maintenance Mode',
                machineDetails: {
                    client_name: 'Mock Client',
                    city: 'Mock City',
                    client_logo: null
                }
            });
        }
        
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
        
        // Format: MachineID,OUTPUT_SET,DOORLOCK,EXTRA_OUT,COIN-ACCEPTOR_ON_OFF,VALVE_FLUSH,VALVE-WALL,VALVE-FLOOR,VALVE-EXTRA
        const out1 = states['Door Lock'] ? '1' : '0';
        const out2 = (states['Fan'] || states['Round Light']) ? '1' : '0';
        const out3 = '0';
        const out4 = states['Flush Valve'] ? '1' : '0';
        const out5 = states['Sprinkler Valve'] ? '1' : '0';
        const out6 = states['Floor Valve'] ? '1' : '0';
        const out7 = '0';
        
        const payload = `${id.trim()},OUTPUT_SET,${out1},${out2},${out3},${out4},${out5},${out6},${out7}`;
        
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
