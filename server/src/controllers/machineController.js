import pool from '../config/db.js';
import { publishMessage } from '../services/mqttService.js';

export const getMachines = async (req, res) => {
  const { role, name } = req.user;

  try {
    let query = 'SELECT * FROM machines';
    let params = [];

    let assignedProject = req.user.assigned_project;
    let assignedClient = req.user.assigned_client;
    
    if (role === 'Field_Tech' && (!assignedProject || !assignedClient)) {
      const [[tech]] = await pool.query('SELECT assigned_project, assigned_client FROM tblusers WHERE id = ?', [req.user.id]);
      if (tech) {
        assignedProject = tech.assigned_project || assignedProject;
        assignedClient = tech.assigned_client || assignedClient;
      }
    }

    if (role === 'Client') {
      query += ' WHERE client_name = ?';
      params.push(name);
    } else if (role === 'Field_Tech') {
      if (assignedProject) {
        query += ' WHERE project_name = ?';
        params.push(assignedProject);
      } else if (assignedClient) {
        query += ' WHERE client_name = ?';
        params.push(assignedClient);
      } else {
        query += ' WHERE 1=0';
      }
    } else if (role === 'Maintenance_Head' && req.user.assigned_state) {
      query += ' WHERE state = ?';
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
  const { machine_id, client_name, state, district, city, address, inst_address, project_name, po_date, dispatch_date, installation_date, status, wall_clean, seats, flush_time, floor_time, wall_time, uses_amt, free, coin, upi, smart_card, digital_token, gps_lat, gps_lng } = req.body;

  if (!machine_id) {
    return res.status(400).json({ success: false, message: 'Machine ID is required' });
  }

  // Convert empty strings to NULL for dates
  const poDate = po_date ? po_date : null;
  const dispatchDate = dispatch_date ? dispatch_date : null;
  const installationDate = installation_date ? installation_date : null;
  
  // Convert ints
  const usesAmt = uses_amt ? parseInt(uses_amt) : 5;
  const seatsNum = seats ? parseInt(seats) : null;
  const flushTime = flush_time ? parseInt(flush_time) : 5;
  const floorTime = floor_time ? parseInt(floor_time) : 5;
  const wallTime = wall_time ? parseInt(wall_time) : null;

  try {
    const [result] = await pool.query(
      `INSERT INTO machines (machine_id, client_name, state, district, city, address, inst_address, project_name, po_date, dispatch_date, installation_date, status, wall_clean, seats, flush_time, floor_time, wall_time, uses_amt, free, coin, upi, smart_card, digital_token, gps_lat, gps_lng) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        machine_id, client_name || null, state || '', district || '', city || '', address || '', inst_address || null, project_name || null, 
        poDate, dispatchDate, installationDate, status || 'ready', wall_clean || 'En', seatsNum, 
        flushTime, floorTime, wallTime, usesAmt, free || 'No', coin || 'Yes', upi || 'Yes', smart_card || 'No', digital_token || 'No',
        gps_lat || null, gps_lng || null
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
    floor_time, wall_time, uses_amt, free, coin, upi, smart_card, digital_token, gps_lat, gps_lng
  } = req.body;

  // Convert empty strings to NULL for dates
  const poDate = po_date ? po_date : null;
  const dispatchDate = dispatch_date ? dispatch_date : null;
  const installationDate = installation_date ? installation_date : null;

  // Convert ints
  const usesAmt = uses_amt ? parseInt(uses_amt) : 5;
  const seatsNum = seats ? parseInt(seats) : null;
  const flushTime = flush_time ? parseInt(flush_time) : 5;
  const floorTime = floor_time ? parseInt(floor_time) : 5;
  const wallTime = wall_time ? parseInt(wall_time) : null;

  try {
    // 1. Fetch current status & settings for logging and MQTT check
    const [oldRows] = await pool.query('SELECT * FROM machines WHERE id = ? LIMIT 1', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }
    const old = oldRows[0];

    // 2. Perform database update
    await pool.query(
      `UPDATE machines SET 
        machine_id = ?, client_name = ?, state = ?, district = ?, city = ?, address = ?, inst_address = ?, project_name = ?, 
        po_date = ?, dispatch_date = ?, installation_date = ?, status = ?, wall_clean = ?, seats = ?, flush_time = ?, 
        floor_time = ?, wall_time = ?, uses_amt = ?, free = ?, coin = ?, upi = ?, smart_card = ?, digital_token = ?,
        gps_lat = ?, gps_lng = ? 
       WHERE id = ?`,
      [
        machine_id, client_name || null, state || '', district || '', city || '', address || '', inst_address || null, project_name || null,
        poDate, dispatchDate, installationDate, status || 'ready', wall_clean || 'En', seatsNum, flushTime,
        floorTime, wallTime, usesAmt, free || 'No', coin || 'Yes', upi || 'Yes', smart_card || 'No', digital_token || 'No', 
        gps_lat || null, gps_lng || null, id
      ]
    );

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
      const hardwareStatus = (status === 'active' || status === 'online') ? 'ready' : (status || 'ready');

      // Default any empty fields to '0' or 'En' to prevent consecutive commas (like ,,) which break strtok in firmware
      const valSeats = seatsNum !== null ? seatsNum : 0;
      const valWallTime = wallTime !== null ? wallTime : 0;
      const valWallClean = wall_clean || 'En';

      // Format A: Legacy format with SET_PARAMETERS
      const payloadWithSet = [
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

      // Format B: Direct configuration payload (matching status format)
      const payloadDirect = [
        machine_id,
        hardwareStatus,
        modeStr,
        usesAmt,
        valWallClean,
        valSeats,
        flushTime,
        floorTime,
        valWallTime
      ].join(',');

      // Format C: JSON payload
      const payloadJson = JSON.stringify({
        command: "SET_PARAMETERS",
        machine_id,
        status: hardwareStatus,
        mode: modeStr,
        uses_amt: usesAmt,
        wall_clean: valWallClean,
        seats: valSeats,
        flush_time: flushTime,
        floor_time: floorTime,
        wall_time: valWallTime
      });

      console.log(`Publishing settings for machine ${machine_id}...`);
      
      // 1. Publish to legacy 'aarya' topic
      publishMessage('aarya', payloadWithSet);
      publishMessage('aarya', payloadDirect);

      // 2. Publish to 'machine/{machine_id}/command' (as per IoT Guide)
      publishMessage(`machine/${machine_id}/command`, payloadWithSet);
      publishMessage(`machine/${machine_id}/command`, payloadDirect);
      publishMessage(`machine/${machine_id}/command`, payloadJson);

      // 3. Publish to 'machines/{machine_id}/command' (with plural s)
      publishMessage(`machines/${machine_id}/command`, payloadWithSet);
      publishMessage(`machines/${machine_id}/command`, payloadDirect);
      publishMessage(`machines/${machine_id}/command`, payloadJson);

      // 4. Publish to 'smartbuddy/{machine_id}/cmd' (as per maintenance controller)
      publishMessage(`smartbuddy/${machine_id}/cmd`, payloadWithSet);
      publishMessage(`smartbuddy/${machine_id}/cmd`, payloadDirect);
      publishMessage(`smartbuddy/${machine_id}/cmd`, payloadJson);

      // 5. Publish to 'smartbuddy/devices/{machine_id}' (as per mqttService.js startsWith)
      publishMessage(`smartbuddy/devices/${machine_id}`, payloadWithSet);
      publishMessage(`smartbuddy/devices/${machine_id}`, payloadDirect);
      publishMessage(`smartbuddy/devices/${machine_id}`, payloadJson);
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
    let query = 'SELECT m.machine_id, m.status, m.state, m.city FROM machines m LEFT JOIN tech_allocations a ON m.machine_id = a.machine_id WHERE a.machine_id IS NULL';
    let params = [];

    if ((role === 'Maintenance_Head' || role === 'Field_Tech') && req.user.assigned_state) {
      query += ' AND m.state = ?';
      params.push(req.user.assigned_state);
    }
    
    query += ' ORDER BY m.machine_id DESC';
    const [machines] = await pool.query(query, params);
    res.json({ success: true, data: machines }); // Frontend expects res.data.data
  } catch (error) {
    console.error('Fetch unassigned machines error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
