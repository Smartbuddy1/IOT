import pool from '../config/db.js';
import { publishMessage } from '../services/mqttService.js';

export const allocateMachine = async (req, res) => {
  const { tech_id, machine_id } = req.body;
  const assigned_by = req.user.id;

  if (req.user.role !== 'Admin' && req.user.role !== 'Maintenance_Head') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  if (!tech_id || !machine_id) {
    return res.status(400).json({ success: false, message: 'Tech ID and Machine ID are required' });
  }

  try {
    await pool.query(
      'INSERT INTO tech_allocations (tech_id, machine_id, assigned_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE assigned_by = VALUES(assigned_by)',
      [tech_id, machine_id, assigned_by]
    );
    res.json({ success: true, message: 'Machine allocated to technician successfully' });
  } catch (error) {
    console.error('Allocate machine error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getAllocations = async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'Maintenance_Head') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  try {
    const [allocations] = await pool.query(`
      SELECT a.*, u.name as tech_name, m.project_name 
      FROM tech_allocations a
      JOIN tblusers u ON a.tech_id = u.id
      JOIN machines m ON a.machine_id = m.machine_id
      ORDER BY a.assigned_at DESC
    `);
    
    // Also fetch available techs to show in dropdown
    const [techs] = await pool.query(`SELECT id, name FROM tblusers WHERE role = 'Field_Tech' AND status = 1`);
    
    res.json({ success: true, allocations, techs });
  } catch (error) {
    console.error('Get allocations error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getMyMachines = async (req, res) => {
  const tech_id = req.user.id;

  if (req.user.role !== 'Field_Tech') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  try {
    // 1. Get the tech's assigned jurisdiction limits
    const [[techInfo]] = await pool.query(
      'SELECT assigned_state, assigned_client, assigned_project FROM tblusers WHERE id = ?', 
      [tech_id]
    );

    if (!techInfo) {
      return res.status(404).json({ success: false, message: 'Tech not found' });
    }

    let query = `
      SELECT m.machine_id, m.project_name, m.status as machine_status, m.client_name,
             dls.water_level, dls.pir_sensor, dls.door_lock, dls.pb_flush, dls.last_updated
      FROM machines m
      LEFT JOIN device_live_status dls ON m.machine_id = dls.machine_id
      WHERE 1=1
    `;
    let params = [];

    if (techInfo.assigned_state) {
      query += ' AND m.state = ?';
      params.push(techInfo.assigned_state);
    }
    
    if (techInfo.assigned_client) {
      query += ' AND m.client_name = ?';
      params.push(techInfo.assigned_client);
    }
    
    if (techInfo.assigned_project) {
      query += ' AND m.project_name = ?';
      params.push(techInfo.assigned_project);
    }

    const [machines] = await pool.query(query, params);
    res.json({ success: true, machines });
  } catch (error) {
    console.error('Get my machines error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Haversine formula to calculate distance in meters
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // in metres
};

export const submitLog = async (req, res) => {
  const { machine_id, reported_issue, root_cause, action_taken, before_photo, after_photo, gps_lat, gps_lng, pcb_condition, voltage_reading, relays_checked, sensors_checked } = req.body;
  const tech_id = req.user.id;

  try {
    // Basic verification - did they actually send coords?
    if (!gps_lat || !gps_lng) {
      return res.status(400).json({ success: false, message: 'Location data is missing. Geo-fencing failed.' });
    }

    // 1. Fetch machine location
    const [machines] = await pool.query('SELECT gps_lat, gps_lng FROM machines WHERE machine_id = ? LIMIT 1', [machine_id]);
    if (machines.length === 0) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    const machine = machines[0];
    if (!machine.gps_lat || !machine.gps_lng) {
      return res.status(400).json({ success: false, message: 'Machine location is not configured in the system. Admin must set the machine GPS coordinates first.' });
    }

    // 2. Calculate Distance
    const distance = getDistance(
      parseFloat(gps_lat), parseFloat(gps_lng), 
      parseFloat(machine.gps_lat), parseFloat(machine.gps_lng)
    );

    // 3. Reject if too far (e.g., > 100 meters)
    if (distance > 100) {
      return res.status(400).json({ 
        success: false, 
        message: `Location mismatch! You are ${Math.round(distance)} meters away from the machine. You must be within 100 meters to submit a log.` 
      });
    }

    await pool.query(`
      INSERT INTO maintenance_logs 
      (machine_id, tech_id, reported_issue, root_cause, action_taken, before_photo, after_photo, gps_lat, gps_lng, pcb_condition, voltage_reading, relays_checked, sensors_checked, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Fixed')
    `, [machine_id, tech_id, reported_issue, root_cause, action_taken, before_photo, after_photo, gps_lat, gps_lng, pcb_condition || null, voltage_reading || null, relays_checked ? 1 : 0, sensors_checked ? 1 : 0]);

    // Update machine status back to active
    await pool.query('UPDATE machines SET status = ? WHERE machine_id = ?', ['active', machine_id]);

    res.json({ success: true, message: 'Maintenance log submitted and verified successfully!' });
  } catch (error) {
    console.error('Submit log error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const testHardware = async (req, res) => {
  const { machine_id, action_type, gps_lat, gps_lng } = req.body;
  
  if (!machine_id || !action_type) {
    return res.status(400).json({ success: false, message: 'Machine ID and Action Type are required' });
  }

  if (!gps_lat || !gps_lng) {
    return res.status(400).json({ success: false, message: 'Location data is missing. You must be at the machine location to perform real-time tests.' });
  }

  try {
    const [machines] = await pool.query('SELECT gps_lat, gps_lng FROM machines WHERE machine_id = ? LIMIT 1', [machine_id]);
    if (machines.length === 0) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    const machine = machines[0];
    if (!machine.gps_lat || !machine.gps_lng) {
      return res.status(400).json({ success: false, message: 'Machine location is not configured. Admin must set the machine GPS coordinates first.' });
    }

    const distance = getDistance(
      parseFloat(gps_lat), parseFloat(gps_lng), 
      parseFloat(machine.gps_lat), parseFloat(machine.gps_lng)
    );

    if (distance > 100) {
      return res.status(403).json({ success: false, message: `Geo-fencing failed. You are ${Math.round(distance)} meters away. You must be within 100 meters of the machine to test.` });
    }
    // Topic: smartbuddy/SBE2T100/cmd
    const topic = `smartbuddy/${machine_id}/cmd`;
    const message = JSON.stringify({ command: action_type, timestamp: Date.now() });

    const published = publishMessage(topic, message);

    if (published) {
      res.json({ success: true, message: `Test command '${action_type}' sent to ${machine_id} successfully!` });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send command. MQTT broker might be offline.' });
    }
  } catch (error) {
    console.error('Test hardware error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getAllLogs = async (req, res) => {
  const { role, id, assigned_state, assigned_client, assigned_project } = req.user;

  try {
    let query = `
      SELECT 
        l.log_id, l.machine_id, l.tech_id, l.reported_issue, l.root_cause, l.action_taken, 
        l.gps_lat, l.gps_lng, l.pcb_condition, l.voltage_reading, l.relays_checked, 
        l.sensors_checked, l.status, l.created_at, l.updated_at,
        u.name as tech_name, m.client_name, m.project_name
      FROM maintenance_logs l
      JOIN tblusers u ON l.tech_id = u.id
      JOIN machines m ON l.machine_id = m.machine_id
      WHERE 1=1
    `;
    let params = [];

    // Filter by jurisdiction if Maintenance_Head
    if (role === 'Maintenance_Head') {
      if (assigned_state) {
        query += ' AND m.state = ?';
        params.push(assigned_state);
      }
      if (assigned_client) {
        query += ' AND m.client_name = ?';
        params.push(assigned_client);
      }
      if (assigned_project) {
        query += ' AND m.project_name = ?';
        params.push(assigned_project);
      }
    } else if (role === 'Field_Tech') {
      query += ' AND l.tech_id = ?';
      params.push(id);
    }

    query += ' ORDER BY l.created_at DESC';

    const [logs] = await pool.query(query, params);
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Fetch all logs error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getLogPhotos = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT before_photo, after_photo FROM maintenance_logs WHERE log_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }
    res.json({ success: true, before_photo: rows[0].before_photo, after_photo: rows[0].after_photo });
  } catch (error) {
    console.error('Fetch photos error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
