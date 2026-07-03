import pool from '../config/db.js';

export const startHeartbeatMonitor = () => {
  console.log('💓 Heartbeat Monitor started: Checking for inactive/offline machines every 3 seconds (instant detection).');
  
  // Run every 3 seconds for zero delay instant detection
  setInterval(async () => {
    try {
      // Find machines that are currently NOT 'inactive' and NOT 'offline'
      // But haven't sent a heartbeat in the last 90 seconds (1.5 mins).
      // This includes machines in ANY state (ready, busy, maintenance, water_low) whose SIM lost range!
      const [offlineMachines] = await pool.query(`
        SELECT m.machine_id 
        FROM machines m
        LEFT JOIN device_live_status d ON m.machine_id = d.machine_id
        WHERE m.status NOT IN ('inactive', 'offline')
        AND (
          d.last_updated IS NULL 
          OR d.last_updated < NOW() - INTERVAL 90 SECOND
        )
      `);

      if (offlineMachines.length > 0) {
        const offlineIds = offlineMachines.map(m => m.machine_id);
        
        // Update their status to 'inactive' immediately as requested
        await pool.query(
          `UPDATE machines SET status = 'inactive' WHERE machine_id IN (?)`,
          [offlineIds]
        );
      }
    } catch (error) {
      // Silently catch to avoid log spam on short intervals
    }
  }, 3000); // 3 seconds interval for zero delay
};
