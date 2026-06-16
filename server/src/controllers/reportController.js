import pool from '../config/db.js';

const getFinancialYearDates = (fy) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  let startYear = currentYear;
  
  if (currentMonth < 4) {
    startYear = currentYear - 1;
  }

  let fyStart, fyEnd;

  if (fy === 'current') {
    fyStart = `${startYear}-04-01`;
    fyEnd = `${startYear + 1}-03-31`;
  } else if (fy === 'last') {
    fyStart = `${startYear - 1}-04-01`;
    fyEnd = `${startYear}-03-31`;
  } else if (fy === 'previous') {
    fyStart = `${startYear - 2}-04-01`;
    fyEnd = `${startYear - 1}-03-31`;
  }

  return { fyStart, fyEnd };
};

export const getReportData = async (req, res) => {
  const { role, name } = req.user;
  const { type, client_name, machine_id, fy, start_date, end_date } = req.query;

  try {
    let query = '';
    let params = [];
    let filterCondition = ' WHERE 1=1';

    // Role Filtering
    if (role === 'Client') {
      filterCondition += ' AND m.client_name = ?';
      params.push(name);
    } else if (client_name) {
      filterCondition += ' AND m.client_name = ?';
      params.push(client_name);
    }

    if (machine_id) {
      filterCondition += ' AND m.machine_id = ?';
      params.push(machine_id);
    }

    // Date Filtering
    let dateField = type === 'maintenance' ? 'm.installation_date' : 't.date_time';
    
    if (fy && fy !== 'custom' && fy !== '') {
      const { fyStart, fyEnd } = getFinancialYearDates(fy);
      if (type !== 'maintenance') {
        filterCondition += ` AND DATE(${dateField}) >= ? AND DATE(${dateField}) <= ?`;
        params.push(fyStart, fyEnd);
      }
    } else {
      if (start_date && type !== 'maintenance') {
        filterCondition += ` AND DATE(${dateField}) >= ?`;
        params.push(start_date);
      }
      if (end_date && type !== 'maintenance') {
        filterCondition += ` AND DATE(${dateField}) <= ?`;
        params.push(end_date);
      }
    }

    if (type === 'revenue') {
      query = `
        SELECT DATE(t.date_time) as log_date, m.machine_id, m.client_name, m.project_name, SUM(t.trans_amt) as total_revenue, COUNT(t.id) as total_transactions
        FROM trans t
        LEFT JOIN machines m ON t.machin_id = m.machine_id
        ${filterCondition}
        GROUP BY DATE(t.date_time), m.machine_id, m.client_name, m.project_name
        ORDER BY DATE(t.date_time) DESC LIMIT 1000
      `;
    } else if (type === 'footfall') {
      query = `
        SELECT 
          m.machine_id, 
          m.client_name, 
          DATE(t.date_time) as log_date, 
          COUNT(t.id) as total_uses, 
          SUM(t.trans_amt) as total_revenue,
          SUM(CASE WHEN t.trans_amt = 0 THEN 1 ELSE 0 END) as free_uses,
          SUM(CASE WHEN t.trans_amt > 0 AND (t.pay_id IS NULL OR t.pay_id = '') THEN 1 ELSE 0 END) as coin_uses,
          SUM(CASE WHEN t.trans_amt > 0 AND t.pay_id IS NOT NULL AND t.pay_id != '' THEN 1 ELSE 0 END) as upi_uses
        FROM trans t
        LEFT JOIN machines m ON t.machin_id = m.machine_id
        ${filterCondition}
        GROUP BY m.machine_id, m.client_name, DATE(t.date_time)
        ORDER BY DATE(t.date_time) DESC LIMIT 1000
      `;
    } else if (type === 'maintenance') {
      query = `
        SELECT m.machine_id, m.client_name, m.project_name, m.status, m.address 
        FROM machines m
        ${filterCondition}
        ORDER BY m.machine_id ASC
      `;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    const [data] = await pool.query(query, params);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Fetch report data error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getReportFilters = async (req, res) => {
  const { role, name } = req.user;
  
  try {
    let clientQuery = 'SELECT id, client_name, client_logo FROM clients ORDER BY client_name ASC';
    let clientParams = [];
    
    if (role === 'Client') {
      clientQuery = 'SELECT id, client_name, client_logo FROM clients WHERE client_name = ? ORDER BY id DESC LIMIT 1';
      clientParams = [name];
    }
    
    const [clients] = await pool.query(clientQuery, clientParams);
    
    let machineQuery = 'SELECT machine_id, client_name, free, coin, upi, inst_address, address, city FROM machines ORDER BY machine_id ASC';
    const [machines] = await pool.query(machineQuery);
    
    res.json({ success: true, clients, machines });
  } catch (error) {
    console.error('Fetch report filters error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getAnalyticsData = async (req, res) => {
  const { role, name } = req.user;
  const { client_name, machine_id, fy } = req.query;

  try {
    let filterCondition = ' WHERE 1=1';
    let params = [];

    if (role === 'Client') {
      filterCondition += ' AND m.client_name = ?';
      params.push(name);
    } else if (client_name) {
      filterCondition += ' AND m.client_name = ?';
      params.push(client_name);
    }

    if (machine_id) {
      filterCondition += ' AND m.machine_id = ?';
      params.push(machine_id);
    }

    const { start_date, end_date } = req.query;
    
    if (start_date && end_date) {
      filterCondition += ` AND DATE(t.date_time) >= ? AND DATE(t.date_time) <= ?`;
      params.push(start_date, end_date);
    } else {
      let selectedFy = fy || 'current';
      if (selectedFy === 'custom') selectedFy = 'current';
      const { fyStart, fyEnd } = getFinancialYearDates(selectedFy);
      filterCondition += ` AND DATE(t.date_time) >= ? AND DATE(t.date_time) <= ?`;
      params.push(fyStart, fyEnd);
    }

    const query = `
      SELECT 
        MONTH(t.date_time) as month_num,
        SUM(CASE WHEN t.trans_amt > 0 AND (t.pay_id IS NULL OR t.pay_id = '' OR t.pay_id = 'coin') THEN t.trans_amt ELSE 0 END) as coin_amount,
        SUM(CASE WHEN t.trans_amt > 0 AND t.pay_id IS NOT NULL AND t.pay_id != '' AND t.pay_id != 'coin' THEN t.trans_amt ELSE 0 END) as upi_amount,
        SUM(CASE WHEN t.trans_amt > 0 AND (t.pay_id IS NULL OR t.pay_id = '' OR t.pay_id = 'coin') THEN 1 ELSE 0 END) as coin_count,
        SUM(CASE WHEN t.trans_amt > 0 AND t.pay_id IS NOT NULL AND t.pay_id != '' AND t.pay_id != 'coin' THEN 1 ELSE 0 END) as upi_count,
        SUM(CASE WHEN t.trans_amt = 0 THEN 1 ELSE 0 END) as free_count
      FROM trans t
      LEFT JOIN machines m ON t.machin_id = m.machine_id
      ${filterCondition}
      GROUP BY MONTH(t.date_time)
    `;

    const [results] = await pool.query(query, params);

    const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const monthMap = { 4:0, 5:1, 6:2, 7:3, 8:4, 9:5, 10:6, 11:7, 12:8, 1:9, 2:10, 3:11 };
    
    let analyticsData = monthNames.map(m => ({
      month: m,
      coinAmount: 0,
      upiAmount: 0,
      coinCount: 0,
      upiCount: 0,
      freeCount: 0
    }));

    results.forEach(row => {
      const idx = monthMap[row.month_num];
      if (idx !== undefined) {
        analyticsData[idx].coinAmount = parseFloat(row.coin_amount || 0);
        analyticsData[idx].upiAmount = parseFloat(row.upi_amount || 0);
        analyticsData[idx].coinCount = parseInt(row.coin_count || 0, 10);
        analyticsData[idx].upiCount = parseInt(row.upi_count || 0, 10);
        analyticsData[idx].freeCount = parseInt(row.free_count || 0, 10);
      }
    });

    res.json({ success: true, data: analyticsData });

  } catch (error) {
    console.error('Fetch analytics data error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
