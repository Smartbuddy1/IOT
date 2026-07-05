import pool from '../config/db.js';

export const getStats = async (req, res) => {
  const { role, name } = req.user;

  try {
    let clientFilter = '';
    let clientFilterParams = [];

    if (role === 'Client') {
      clientFilter = ' AND client_name = ?';
      clientFilterParams.push(name);
    }

    // Prepare totalProjects Query
    let totalProjectsQuery = 'SELECT COUNT(*) AS total FROM projects';
    let totalProjectsParams = [];
    if (role === 'Client') {
      totalProjectsQuery += ' WHERE client_name = ? OR project_name IN (SELECT DISTINCT project_name FROM machines WHERE client_name = ? AND project_name IS NOT NULL)';
      totalProjectsParams.push(name, name);
    }

    // Execute all queries concurrently for massive performance gain
    const [
      [[{ total: totalMachines }]],
      [[{ total: todaysUse }]],
      [[{ total: successCount }]],
      [[{ total: failedCount }]],
      [[{ total: totalProjects }]],
      [[{ total: totalClients }]],
      [[{ total: unassignedMachines }]],
      [[{ total: underMaintenance }]],
      [recentTransactions],
      [sevenDayTrend],
      [machineHealth],
      [topProjects]
    ] = await Promise.all([
      // 1. Total Machines
      pool.query(`SELECT COUNT(*) AS total FROM machines WHERE 1=1 ${clientFilter}`, clientFilterParams),
      
      // 2. Today's Use
      pool.query(`SELECT COUNT(*) AS total FROM trans t LEFT JOIN machines m ON t.machin_id = m.machine_id WHERE DATE(t.date_time) = CURDATE() ${clientFilter ? 'AND m.client_name = ?' : ''}`, clientFilterParams),
      
      // 3. Success (Today)
      pool.query(`SELECT COUNT(*) AS total FROM trans t LEFT JOIN machines m ON t.machin_id = m.machine_id WHERE t.status = 'success' AND DATE(t.date_time) = CURDATE() ${clientFilter ? 'AND m.client_name = ?' : ''}`, clientFilterParams),
      
      // 4. Failed (Today)
      pool.query(`SELECT COUNT(*) AS total FROM trans t LEFT JOIN machines m ON t.machin_id = m.machine_id WHERE t.status = 'failed' AND DATE(t.date_time) = CURDATE() ${clientFilter ? 'AND m.client_name = ?' : ''}`, clientFilterParams),
      
      // 5. Total Projects
      pool.query(totalProjectsQuery, totalProjectsParams),
      
      // 6. Total Clients
      role === 'Client' ? pool.query('SELECT 1 AS total') : pool.query('SELECT COUNT(*) AS total FROM clients'),
      
      // 7. Unassigned Machines
      pool.query("SELECT COUNT(*) AS total FROM machines WHERE client_name = '' OR client_name IS NULL"),
      
      // 8. Under Maintenance
      pool.query(`SELECT COUNT(*) AS total FROM machines WHERE status = 'maintenance' ${clientFilter}`, clientFilterParams),
      
      // 9. Recent Transactions
      pool.query(`SELECT t.*, m.client_name, m.project_name FROM trans t LEFT JOIN machines m ON t.machin_id = m.machine_id WHERE 1=1 ${clientFilter ? 'AND m.client_name = ?' : ''} ORDER BY t.id DESC LIMIT 10`, clientFilterParams),
      
      // 10. 7-Day Trend Chart Data
      pool.query(`SELECT DATE_FORMAT(t.date_time, '%Y-%m-%d') as dateStr, DATE_FORMAT(t.date_time, '%b %d') as name, SUM(t.trans_amt) as total FROM trans t LEFT JOIN machines m ON t.machin_id = m.machine_id WHERE t.status = 'success' AND t.date_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) ${clientFilter ? 'AND m.client_name = ?' : ''} GROUP BY DATE(t.date_time) ORDER BY DATE(t.date_time)`, clientFilterParams),
      
      // 11. Machine Health Distribution
      pool.query(`SELECT status as name, COUNT(*) as value FROM machines WHERE 1=1 ${clientFilter} GROUP BY status`, clientFilterParams),
      
      // 12. Top Projects by Revenue
      pool.query(`SELECT COALESCE(m.project_name, 'Unassigned') as name, SUM(t.trans_amt) as total FROM trans t LEFT JOIN machines m ON t.machin_id = m.machine_id WHERE t.status = 'success' ${clientFilter ? 'AND m.client_name = ?' : ''} GROUP BY m.project_name ORDER BY total DESC LIMIT 5`, clientFilterParams)
    ]);

    // Ensure 7-day chart always contains exactly the last 7 consecutive days in sequence (even days with 0 revenue)
    // And convert SQL DECIMAL/string total to strict Number to prevent chart clipping/glitching
    const formattedSevenDayTrend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const shortName = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      
      const found = sevenDayTrend.find(row => row.dateStr === dateStr || row.name === shortName || (row.name && row.name.replace(/^0/, '') === shortName.replace(/^0/, '')));
      return {
        name: shortName,
        total: found ? Number(found.total || 0) : 0
      };
    });

    res.json({
      success: true,
      stats: {
        totalMachines,
        todaysUse,
        successCount,
        failedCount,
        totalProjects,
        totalClients: role === 'Client' ? 1 : totalClients,
        unassignedMachines: role === 'Client' ? 0 : unassignedMachines,
        underMaintenance,
        recentTransactions,
        chartData: formattedSevenDayTrend,
        machineHealth,
        topProjectsList: topProjects
      }
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};
