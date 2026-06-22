import pool from '../config/db.js';

export const startHeartbeatMonitor = () => {
  console.log('💓 Heartbeat Monitor started: Checking for offline machines every 3 minutes.');
  
  // Run every 3 minutes
  setInterval(async () => {
    try {
      // Find machines that are currently NOT 'offline' and NOT 'maintenance'
      // But haven't sent a heartbeat in the last 5 minutes.
      // This includes machines with NO entry in device_live_status (last_updated IS NULL).
      const [offlineMachines] = await pool.query(`
        SELECT m.machine_id 
        FROM machines m
        LEFT JOIN device_live_status d ON m.machine_id = d.machine_id
        WHERE m.status NOT IN ('offline', 'maintenance')
        AND (
          d.last_updated IS NULL 
          OR d.last_updated < NOW() - INTERVAL 5 MINUTE
        )
      `);

      if (offlineMachines.length > 0) {
        const offlineIds = offlineMachines.map(m => m.machine_id);
        console.log(`⚠️ Heartbeat Monitor: Found ${offlineIds.length} offline machines. Updating status...`);
        
        // Update their status to 'offline'
        await pool.query(
          `UPDATE machines SET status = 'offline' WHERE machine_id IN (?)`,
          [offlineIds]
        );
        console.log(`✅ Heartbeat Monitor: Successfully marked machines as offline:`, offlineIds);
      }
    } catch (error) {
      console.error('❌ Heartbeat Monitor Error:', error.message);
    }
  }, 3 * 60 * 1000); // 3 minutes interval
};
