import pool from '../config/db.js';
import { publishMessage, mqttEmitter } from '../services/mqttService.js';

export const getMachines = async (req, res) => {
  const { role, name } = req.user;

  try {
    let query = 'SELECT * FROM machines WHERE 1=1';
    let params = [];

    if (req.query?.include_unassigned !== 'true') {
      query += " AND client_name IS NOT NULL AND TRIM(client_name) != '' AND TRIM(client_name) != 'Unassigned'";
    }

    const userRole = (role || '').toString().trim().toLowerCase();

    let assignedProject = req.user.assigned_project;
    let assignedClient = req.user.assigned_client;
    
    if (userRole === 'field_tech' && (!assignedProject || !assignedClient)) {
      const [[tech]] = await pool.query('SELECT assigned_project, assigned_client FROM tblusers WHERE id = ?', [req.user.id]);
      if (tech) {
        assignedProject = tech.assigned_project || assignedProject;
        assignedClient = tech.assigned_client || assignedClient;
      }
    }

    if (userRole === 'client') {
      query += ' AND client_name = ?';
      params.push(name);
    } else if (userRole === 'field_tech') {
      if (assignedProject) {
        query += ' AND project_name = ?';
        params.push(assignedProject);
      } else if (assignedClient) {
        query += ' AND client_name = ?';
        params.push(assignedClient);
      } else {
        query += ' AND 1=0';
      }
    } else if (userRole === 'maintenance_head' && req.user.assigned_state) {
      query += ' AND state = ?';
      params.push(req.user.assigned_state);
    }

    query += ' ORDER BY id DESC';

    const [machines] = await pool.query(query, params);
    res.json({ success: true, machines });
  } catch (error) {
    console.error('Fetch machines error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getMachineById = async (req, res) => {
  const { id } = req.params;

  try {
    const [machines] = await pool.query('SELECT * FROM machines WHERE id = ? OR machine_id = ? LIMIT 1', [id, id]);
    if (machines.length === 0) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }
    res.json({ success: true, machine: machines[0] });
  } catch (error) {
    console.error('Fetch machine details error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createMachine = async (req, res) => {
  const { machine_id, client_name, state, district, city, address, inst_address, project_name, po_date, dispatch_date, installation_date, status, wall_clean, seats, flush_time, floor_time, wall_time, uses_amt, free, coin, upi, smart_card, digital_token, gps_lat, gps_lng, toilet_type } = req.body;

  if (!machine_id) {
    return res.status(400).json({ success: false, message: 'Machine ID is required' });
  }

  // Convert empty strings to NULL for dates
  const poDate = po_date ? po_date : null;
  const dispatchDate = dispatch_date ? dispatch_date : null;
  const installationDate = installation_date ? installation_date : null;
  
  // Convert ints
  const usesAmt = (free === 'Yes') ? 0 : ((uses_amt !== undefined && uses_amt !== null && uses_amt !== '') ? parseInt(uses_amt) : 5);
  const seatsNum = seats ? parseInt(seats) : null;
  const flushTime = flush_time ? parseInt(flush_time) : 5;
  const floorTime = floor_time ? parseInt(floor_time) : 5;
  const wallTime = wall_time ? parseInt(wall_time) : null;

  const valFree = (free === 'Yes') ? 'Yes' : 'No';
  const valCoin = (valFree === 'Yes') ? 'No' : ((coin === 'Yes') ? 'Yes' : 'No');
  const valUpi = (valFree === 'Yes') ? 'No' : ((upi === 'Yes') ? 'Yes' : 'No');
  let modeVal = 'Coin';
  if (valFree === 'Yes') modeVal = 'Free';
  else if (valCoin === 'Yes' && valUpi === 'Yes') modeVal = 'Coin+UPI';
  else if (valCoin === 'Yes' && valUpi === 'No') modeVal = 'Coin';
  else if (valCoin === 'No' && valUpi === 'Yes') modeVal = 'UPI';

  try {
    const [result] = await pool.query(
      `INSERT INTO machines (machine_id, client_name, state, district, city, address, inst_address, project_name, po_date, dispatch_date, installation_date, status, wall_clean, seats, flush_time, floor_time, wall_time, uses_amt, free, coin, upi, smart_card, digital_token, mode, gps_lat, gps_lng, toilet_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        machine_id, client_name || null, state || '', district || '', city || '', address || '', inst_address || null, project_name || null, 
        poDate, dispatchDate, installationDate, status || 'ready', wall_clean || 'En', seatsNum, 
        flushTime, floorTime, wallTime, usesAmt, valFree, valCoin, valUpi, smart_card || 'No', digital_token || 'No', modeVal,
        gps_lat || null, gps_lng || null, toilet_type || 'Unisex'
      ]
    );

    // Initial status log in machine_logs
    await pool.query(
      'INSERT INTO machine_logs (machine_id, status, start_time) VALUES (?, ?, NOW())',
      [machine_id, status || 'ready']
    );

    res.json({ success: true, message: 'Machine created successfully!', machineDbId: result.insertId });
  } catch (error) {
    console.error('Create machine error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

export const updateMachine = async (req, res) => {
  const { id } = req.params;
  const {
    machine_id, client_name, state, district, city, address, inst_address, project_name,
    po_date, dispatch_date, installation_date, status, wall_clean, seats, flush_time,
    floor_time, wall_time, uses_amt, free, coin, upi, smart_card, digital_token, gps_lat, gps_lng, toilet_type
  } = req.body;

  // Convert empty strings to NULL for dates
  const poDate = po_date || null;
  const dispatchDate = dispatch_date || null;
  const installationDate = installation_date || null;

  // Convert ints
  const usesAmt = (free === 'Yes') ? 0 : ((uses_amt !== undefined && uses_amt !== null && uses_amt !== '') ? parseInt(uses_amt) : 5);
  const seatsNum = seats ? parseInt(seats) : null;
  const flushTime = flush_time ? parseInt(flush_time) : 5;
  const floorTime = floor_time ? parseInt(floor_time) : 5;
  const wallTime = wall_time ? parseInt(wall_time) : null;

  const valFree = (free === 'Yes') ? 'Yes' : 'No';
  const valCoin = (valFree === 'Yes') ? 'No' : ((coin === 'Yes') ? 'Yes' : 'No');
  const valUpi = (valFree === 'Yes') ? 'No' : ((upi === 'Yes') ? 'Yes' : 'No');
  let modeVal = 'Coin';
  if (valFree === 'Yes') modeVal = 'Free';
  else if (valCoin === 'Yes' && valUpi === 'Yes') modeVal = 'Coin+UPI';
  else if (valCoin === 'Yes' && valUpi === 'No') modeVal = 'Coin';
  else if (valCoin === 'No' && valUpi === 'Yes') modeVal = 'UPI';

  try {
    // 1. Fetch current status & settings for logging and MQTT check
    const [oldRows] = await pool.query('SELECT * FROM machines WHERE id = ? LIMIT 1', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }
    const old = oldRows[0];

    // Ensure new machine_id is unique if it changed
    if (machine_id && machine_id !== old.machine_id) {
      const [existing] = await pool.query('SELECT id FROM machines WHERE machine_id = ? LIMIT 1', [machine_id]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'This Machine ID is already in use by another machine.' });
      }
    }

    // 2. Perform database update
    await pool.query(
      `UPDATE machines SET 
        machine_id = ?, client_name = ?, state = ?, district = ?, city = ?, address = ?, inst_address = ?, project_name = ?, 
        po_date = ?, dispatch_date = ?, installation_date = ?, status = ?, wall_clean = ?, seats = ?, flush_time = ?, 
        floor_time = ?, wall_time = ?, uses_amt = ?, free = ?, coin = ?, upi = ?, smart_card = ?, digital_token = ?, mode = ?,
        gps_lat = ?, gps_lng = ?, toilet_type = ? 
       WHERE id = ?`,
      [
        machine_id, client_name || null, state || '', district || '', city || '', address || '', inst_address || null, project_name || null,
        poDate, dispatchDate, installationDate, status || 'ready', wall_clean || 'En', seatsNum, flushTime,
        floorTime, wallTime, usesAmt, valFree, valCoin, valUpi, smart_card || 'No', digital_token || 'No', modeVal,
        gps_lat || null, gps_lng || null, toilet_type || 'Unisex', id
      ]
    );

    // Cascade update to other tables to maintain data integrity if machine_id was changed
    if (old.machine_id && old.machine_id !== machine_id) {
      await pool.query('UPDATE datatest SET machine_id = ? WHERE machine_id = ?', [machine_id, old.machine_id]);
      await pool.query('UPDATE device_live_status SET machine_id = ? WHERE machine_id = ?', [machine_id, old.machine_id]);
      await pool.query('UPDATE machine_logs SET machine_id = ? WHERE machine_id = ?', [machine_id, old.machine_id]);
      await pool.query('UPDATE maintenance_logs SET machine_id = ? WHERE machine_id = ?', [machine_id, old.machine_id]);
      await pool.query('UPDATE maintenance_tickets SET machine_id = ? WHERE machine_id = ?', [machine_id, old.machine_id]);
      await pool.query('UPDATE tech_allocations SET machine_id = ? WHERE machine_id = ?', [machine_id, old.machine_id]);
      await pool.query('UPDATE trans SET machin_id = ? WHERE machin_id = ?', [machine_id, old.machine_id]);
      
      // Also send the SET_MACHINE_ID command to the PCB so it knows its new identity
      publishMessage('smartbuddy', `${old.machine_id},SET_MACHINE_ID:${machine_id}`);
    }

    // 3. Status logging on change
    if (old.status !== status) {
      // Close active log
      await pool.query(
        'UPDATE machine_logs SET end_time = NOW() WHERE machine_id = ? AND end_time IS NULL',
        [old.machine_id]
      );
      // Open new log
      await pool.query(
        'INSERT INTO machine_logs (machine_id, status, start_time) VALUES (?, ?, NOW())',
        [machine_id, status]
      );
    }

    // 4. Mode determination logic
    const modes = [];
    if (coin === 'Yes') modes.push('Coin');
    if (upi === 'Yes') modes.push('UPI');
    if (free === 'Yes') modes.push('Button');
    if (smart_card === 'Yes') modes.push('SmartCard');
    if (digital_token === 'Yes') modes.push('DigitalToken');
    const modeStr = modes.length === 0 ? 'Button' : modes.slice(0, 3).join('_');

    // 5. Send MQTT config if anything changed
    const isChanged = (
      old.machine_id !== machine_id ||
      old.status !== status ||
      old.uses_amt !== usesAmt ||
      old.wall_clean !== wall_clean ||
      old.seats !== seatsNum ||
      old.flush_time !== flushTime ||
      old.floor_time !== floorTime ||
      old.wall_time !== wallTime ||
      old.free !== free ||
      old.coin !== coin ||
      old.upi !== upi ||
      old.smart_card !== smart_card ||
      old.digital_token !== digital_token
    );

    if (isChanged) {
      // Map status 'active' or 'online' to 'ready' which the hardware expects
      const hardwareStatus = (status === 'active' || status === 'online') ? 'ready' : (status || 'ready').toLowerCase();

      // Default any empty fields to 0 or 'En' to ensure numeric parsing succeeds on firmware
      const valSeats = seatsNum !== null ? seatsNum : 0;
      const valWallTime = wallTime !== null ? wallTime : 0;
      const valWallClean = wall_clean || 'En';

      // Format A: Legacy format (Exactly what worked in the morning)
      const payloadString = [
        machine_id,
        "SET_PARAMETERS",
        hardwareStatus,
        modeStr,
        usesAmt,
        valWallClean,
        valSeats,
        flushTime,
        floorTime,
        valWallTime
      ].join(',');

      console.log(`Publishing settings for machine ${machine_id}...`);

      // Publish directly to 'smartbuddy' (Single topic only to prevent SIM module hang)
      publishMessage('smartbuddy', payloadString);
    }

    res.json({ success: true, message: 'Machine updated successfully!' });
  } catch (error) {
    console.error('Update machine error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const deleteMachine = async (req, res) => {
  const { id } = req.params;

  try {
    const [machines] = await pool.query('SELECT machine_id FROM machines WHERE id = ? LIMIT 1', [id]);
    if (machines.length > 0) {
      const mId = machines[0].machine_id;
      // Delete logs
      await pool.query('DELETE FROM machine_logs WHERE machine_id = ?', [mId]);
    }
    await pool.query('DELETE FROM machines WHERE id = ?', [id]);
    res.json({ success: true, message: 'Machine deleted successfully!' });
  } catch (error) {
    console.error('Delete machine error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getUnassignedMachines = async (req, res) => {
  try {
    const role = req.user.role;
    let query = "SELECT * FROM machines WHERE client_name IS NULL OR client_name = ''";
    let params = [];

    if ((role === 'Maintenance_Head' || role === 'Field_Tech') && req.user.assigned_state) {
      query += ' AND state = ?';
      params.push(req.user.assigned_state);
    }
    
    query += ' ORDER BY id DESC';
    const [machines] = await pool.query(query, params);
    
    // Return both 'data' and 'machines' fields to satisfy different frontend page parsers
    res.json({ success: true, data: machines, machines: machines });
  } catch (error) {
    console.error('Fetch unassigned machines error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const requestMachineStatus = async (req, res) => {
  const { id } = req.params; // id is the machine_id (string)

  try {
    // Publish the status? command
    const published = publishMessage('smartbuddy', `${id},status?`);
    
    if (!published) {
      return res.status(503).json({ success: false, message: 'MQTT Broker not connected. Cannot send command to PCB.' });
    }

    // Publish GET_PARAMETERS slightly after to avoid serial buffer overflow on PCB
    setTimeout(() => {
      publishMessage('smartbuddy', `${id},GET_PARAMETERS`);
    }, 200);

    const messages = [];

    // Setup listener to wait for response
    const listener = (data) => {
      // Check if message is from this machine (it starts with machine ID)
      if (data.message.startsWith(`${id},`)) {
        messages.push(data.message);
        // If we received 2 messages (one for status?, one for GET_PARAMETERS), resolve early
        if (messages.length >= 2) {
          clearTimeout(timeoutId);
          mqttEmitter.off('message', listener);
          res.json({ success: true, message: messages.join('\n') });
        }
      }
    };

    mqttEmitter.on('message', listener);

    // Timeout after 4 seconds to collect responses
    const timeoutId = setTimeout(() => {
      mqttEmitter.off('message', listener);
      if (messages.length > 0) {
        res.json({ success: true, message: messages.join('\n') });
      } else {
        res.status(504).json({ success: false, message: 'Machine not responding' });
      }
    }, 4000);

  } catch (error) {
    console.error('Request status error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const changeHardwareId = async (req, res) => {
  const { id } = req.params; // this is the DB primary key id OR old machine_id? Wait, routes pass DB id or machine_id?
  // Let's use the DB ID to find it, then update.
  const { new_machine_id } = req.body;

  try {
    const [rows] = await pool.query('SELECT machine_id FROM machines WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Machine not found in DB.' });
    }
    
    const old_machine_id = rows[0].machine_id;

    // Ensure new machine_id is unique
    if (new_machine_id !== old_machine_id) {
      const [existing] = await pool.query('SELECT id FROM machines WHERE machine_id = ? LIMIT 1', [new_machine_id]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'This Machine ID is already in use by another machine.' });
      }
    }

    // Send MQTT command first
    const published = publishMessage('smartbuddy', `${old_machine_id},SET_MACHINE_ID:${new_machine_id}`);
    
    // Even if MQTT fails (offline), we might still want to update the DB if requested, but let's warn.
    // Actually, it's better to update the DB so they are in sync when it comes online? 
    // No, if MQTT is down, the PCB won't get the new ID!
    if (!published) {
      return res.status(503).json({ success: false, message: 'MQTT Broker not connected. Cannot change ID on PCB.' });
    }

    // Update DB
    await pool.query('UPDATE machines SET machine_id = ? WHERE id = ?', [new_machine_id, id]);

    // Cascade update to other tables to maintain data integrity
    if (old_machine_id && old_machine_id !== new_machine_id) {
      await pool.query('UPDATE datatest SET machine_id = ? WHERE machine_id = ?', [new_machine_id, old_machine_id]);
      await pool.query('UPDATE device_live_status SET machine_id = ? WHERE machine_id = ?', [new_machine_id, old_machine_id]);
      await pool.query('UPDATE machine_logs SET machine_id = ? WHERE machine_id = ?', [new_machine_id, old_machine_id]);
      await pool.query('UPDATE maintenance_logs SET machine_id = ? WHERE machine_id = ?', [new_machine_id, old_machine_id]);
      await pool.query('UPDATE maintenance_tickets SET machine_id = ? WHERE machine_id = ?', [new_machine_id, old_machine_id]);
      await pool.query('UPDATE tech_allocations SET machine_id = ? WHERE machine_id = ?', [new_machine_id, old_machine_id]);
      await pool.query('UPDATE trans SET machin_id = ? WHERE machin_id = ?', [new_machine_id, old_machine_id]);
    }

    res.json({ success: true, message: `Hardware ID updated to ${new_machine_id}` });
  } catch (error) {
    console.error('Change hardware ID error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
