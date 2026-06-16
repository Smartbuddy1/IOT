import mysql from 'mysql2/promise';

async function run() {
  try {
    const pool = mysql.createPool({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'smart_iot'
    });
    
    await pool.query('ALTER TABLE tblusers ADD COLUMN assigned_state VARCHAR(50) DEFAULT NULL');
    console.log('Column assigned_state added successfully');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Column assigned_state already exists');
    } else {
      console.error('Error:', e.message);
    }
  }
  process.exit();
}

run();
