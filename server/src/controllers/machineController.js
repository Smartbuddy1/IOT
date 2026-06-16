import pool from '../config/db.js';
import { publishMessage } from '../services/mqttService.js';

export const getMachines = async (req, res) => {
  const { role, name } = req.user;

  try {
    let query = 'SELECT * FROM machines';
    let params = [];

    if (role === 'Client') {
      query += ' WHERE client_name = ?';
      params.push(name);
    } else if (role === 'Operation' && req.user.assigned_state) {
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
  const { machine_id, client_name, state, district, city, address, inst_address, project_name, po_date, dispatch_date, installation_date, status, wall_clean, seats, flush_time, floor_time, wall_time, uses_amt, free, coin, upi, smart_card, digital_token } = req.body;

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
      `INSERT INTO machines (machine_id, client_name, state, district, city, address, inst_address, project_name, po_date, dispatch_date, installation_date, status, wall_clean, seats, flush_time, floor_time, wall_time, uses_amt, free, coin, upi, smart_card, digital_token) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        machine_id, client_name || null, state || '', district || '', city || '', address || '', inst_address || null, project_name || null, 
        poDate, dispatchDate, installationDate, status || 'ready', wall_clean || 'En', seatsNum, 
        flushTime, floorTime, wallTime, usesAmt, free || 'No', coin || 'Yes', upi || 'Yes', smart_card || 'No', digital_token || 'No'
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
    floor_time, wall_time, uses_amt, free, coin, upi, smart_card, digital_token
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
        floor_time = ?, wall_time = ?, uses_amt = ?, free = ?, coin = ?, upi = ?, smart_card = ?, digital_token = ? 
       WHERE id = ?`,
      [
        machine_id, client_name || null, state || '', district || '', city || '', address || '', inst_address || null, project_name || null,
        poDate, dispatchDate, installationDate, status || 'ready', wall_clean || 'En', seatsNum, flushTime,
        floorTime, wallTime, usesAmt, free || 'No', coin || 'Yes', upi || 'Yes', smart_card || 'No', digital_token || 'No', id
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
      old.uses_amt !== uses_amt ||
      old.wall_clean !== wall_clean ||
      old.seats !== seats ||
      old.flush_time !== flush_time ||
      old.floor_time !== floor_time ||
      old.wall_time !== wall_time ||
      old.free !== free ||
      old.coin !== coin ||
      old.upi !== upi ||
      old.smart_card !== smart_card ||
      old.digital_token !== digital_token
    );

    if (isChanged) {
      const payload = [
        machine_id,
        "SET_PARAMETERS",
        status,
        modeStr,
        uses_amt,
        wall_clean,
        seats || '',
        flush_time,
        floor_time,
        wall_time || ''
      ].join(',');

      publishMessage('aarya', payload);
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
    const [machines] = await pool.query(
      `SELECT * FROM machines WHERE client_name IS NULL OR client_name = '' ORDER BY id DESC`
    );
    res.json({ success: true, machines });
  } catch (error) {
    console.error('Fetch unassigned machines error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
