import mysql from 'mysql2/promise';

const seed = async () => {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'smart_iot',
  });

  try {
    console.log("Seeding Database...");
    
    // 1. Insert Dummy Clients
    await pool.query(`INSERT IGNORE INTO clients (client_name, client_phone, client_state, clinet_district, client_city, client_type) VALUES 
      ('TechCorp', '9876543210', 'Maharashtra', 'Pune', 'Pune', 'Private'),
      ('GovInfra', '8765432109', 'Maharashtra', 'Mumbai', 'Mumbai', 'Government'),
      ('EduTrust', '7654321098', 'Karnataka', 'Bangalore', 'Bangalore', 'NGO')
    `);

    // 2. Insert Dummy Projects
    await pool.query(`INSERT IGNORE INTO projects (project_name, client_name, project_status, project_starts, sale_ord_no) VALUES 
      ('Pune Metro Phase 1', 'TechCorp', 'Ongoing', '2024-01-01', 'SO-101'),
      ('Mumbai Smart City', 'GovInfra', 'Completed', '2023-05-10', 'SO-102'),
      ('Digital Schools', 'EduTrust', 'Ongoing', '2024-03-15', 'SO-103')
    `);

    // 3. Insert Dummy Machines
    await pool.query(`INSERT IGNORE INTO machines (machine_id, status, total_amt, client_name, project_name) VALUES 
      ('M-1001', 'active', 5000, 'TechCorp', 'Pune Metro Phase 1'),
      ('M-1002', 'maintenance', 1200, 'TechCorp', 'Pune Metro Phase 1'),
      ('M-1003', 'active', 8500, 'GovInfra', 'Mumbai Smart City'),
      ('M-1004', 'active', 4300, 'EduTrust', 'Digital Schools'),
      ('M-1005', 'failed', 0, 'EduTrust', 'Digital Schools')
    `);

    // 4. Insert Dummy Transactions for the last 7 days
    const machines = ['M-1001', 'M-1002', 'M-1003', 'M-1004', 'M-1005'];
    
    // Generate ~50 random transactions
    for(let i=0; i<50; i++) {
      const mId = machines[Math.floor(Math.random() * machines.length)];
      const amt = Math.floor(Math.random() * 50) + 10; // random amount 10-60
      const status = Math.random() > 0.15 ? 'success' : 'failed'; // 85% success rate
      
      // Random date within the last 7 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 7));
      const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');

      await pool.query(
        `INSERT INTO trans (trans_id, machin_id, trans_amt, status, date_time) VALUES (?, ?, ?, ?, ?)`,
        [`TXN-${Math.floor(Math.random()*100000)}`, mId, amt, status, formattedDate]
      );
    }
    
    console.log("Seeding Complete!");
  } catch(e) {
    console.error("Error seeding:", e);
  } finally {
    await pool.end();
  }
};

seed();
