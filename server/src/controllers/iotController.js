import pool from '../config/db.js';

export const handleHardwarePost = async (req, res) => {
  try {
    const { machine_id, type } = req.body;

    if (!machine_id || !type) {
      return res.status(400).json({ status: "error", message: "Missing machine_id or type" });
    }

    // 1. Register the machine if it doesn't exist (Unassigned Machine Logic)
    await pool.query('INSERT IGNORE INTO machines (machine_id) VALUES (?)', [machine_id]);

    // Fetch the machine's current configuration from the database
    const [machines] = await pool.query('SELECT * FROM machines WHERE machine_id = ? LIMIT 1', [machine_id]);
    const machine = machines[0] || {};

    const configData = {
      status: machine.status || 'ready',
      uses_amt: machine.uses_amt || 5,
      wall_clean: machine.wall_clean || 'En',
      seats: machine.seats || 0,
      flush_time: machine.flush_time || 5,
      floor_time: machine.floor_time || 5,
      wall_time: machine.wall_time || 0,
      free: machine.free || 'No',
      coin: machine.coin || 'Yes',
      upi: machine.upi || 'Yes',
      smart_card: machine.smart_card || 'No',
      digital_token: machine.digital_token || 'No',
      gps_lat: machine.gps_lat || '',
      gps_lng: machine.gps_lng || ''
    };

    // 2. Process data based on type
    if (type === 'transaction') {
      const amount = req.body.amount ? parseFloat(req.body.amount) : 0.00;
      const payment_mode = req.body.payment_mode || 'coin';
      const status = req.body.status || 'success';

      await pool.query(
        `INSERT INTO trans (machin_id, trans_amt, trans_mode, status, date_time) 
         VALUES (?, ?, ?, ?, NOW())`,
        [machine_id, amount, payment_mode, status]
      );
      
      return res.json({ 
        status: "success", 
        message: "Transaction saved", 
        ...configData, 
        config: configData 
      });

    } else if (type === 'live_update') {
      const water_level = req.body.water_level ? parseInt(req.body.water_level) : 0;
      const topic_name = `Water Level: ${water_level}%`;

      await pool.query(
        `INSERT INTO datatest (machine_id, topic_name, received_time) 
         VALUES (?, ?, NOW())`,
        [machine_id, topic_name]
      );

      return res.json({ 
        status: "success", 
        message: "Live data updated", 
        ...configData, 
        config: configData 
      });

    } else {
      return res.status(400).json({ status: "error", message: "Unknown type" });
    }

  } catch (error) {
    console.error('IoT Post error:', error);
    res.status(500).json({ status: "error", message: "Database error", error: error.message });
  }
};

export const getLiveStatus = async (req, res) => {
  try {
    const { machineId } = req.query;
    let query = 'SELECT * FROM device_live_status';
    let params = [];

    if (machineId) {
      query += ' WHERE machine_id = ?';
      params.push(machineId);
    }

    const [rows] = await pool.query(query, params);
    
    // Convert to a format that's easy to consume on the frontend
    const statuses = {};
    rows.forEach(row => {
      statuses[row.machine_id] = {
        water_level: row.water_level,
        pir_sensor: row.pir_sensor,
        door_lock: row.door_lock,
        pb_coin: row.pb_coin,
        pb_flush: row.pb_flush,
        last_updated: row.last_updated
      };
    });

    res.json({ success: true, data: statuses });
  } catch (error) {
    console.error('Fetch live status error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
