import pool from '../config/db.js';

export const handleHardwarePost = async (req, res) => {
  try {
    const { machine_id, type } = req.body;

    if (!machine_id || !type) {
      return res.status(400).json({ status: "error", message: "Missing machine_id or type" });
    }

    // 1. Register the machine if it doesn't exist (Unassigned Machine Logic)
    await pool.query('INSERT IGNORE INTO machines (machine_id) VALUES (?)', [machine_id]);

    // 2. Process data based on type
    if (type === 'transaction') {
      const amount = req.body.amount ? parseFloat(req.body.amount) : 0.00;
      const payment_mode = req.body.payment_mode || 'coin';
      const status = req.body.status || 'success';

      await pool.query(
        `INSERT INTO trans (machin_id, amount, payment_mode, status, date_time) 
         VALUES (?, ?, ?, ?, NOW())`,
        [machine_id, amount, payment_mode, status]
      );
      
      return res.json({ status: "success", message: "Transaction saved" });

    } else if (type === 'live_update') {
      const water_level = req.body.water_level ? parseInt(req.body.water_level) : 0;
      const topic_name = `Water Level: ${water_level}%`;

      await pool.query(
        `INSERT INTO datatest (machine_id, topic_name, received_time) 
         VALUES (?, ?, NOW())`,
        [machine_id, topic_name]
      );

      return res.json({ status: "success", message: "Live data updated" });

    } else {
      return res.status(400).json({ status: "error", message: "Unknown type" });
    }

  } catch (error) {
    console.error('IoT Post error:', error);
    res.status(500).json({ status: "error", message: "Database error", error: error.message });
  }
};
