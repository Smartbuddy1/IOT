import mysql from 'mysql2/promise';

async function addIndexes() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'smart_iot'
  });

  try {
    await pool.query('ALTER TABLE trans ADD INDEX idx_machine_date (machin_id, date_time)');
    console.log('✅ Index 1 (idx_machine_date) added successfully!');
  } catch(e) {
    console.log('⚠️ Index 1 message:', e.message);
  }

  try {
    await pool.query('ALTER TABLE trans ADD INDEX idx_mode_status (trans_mode, status)');
    console.log('✅ Index 2 (idx_mode_status) added successfully!');
  } catch(e) {
    console.log('⚠️ Index 2 message:', e.message);
  }

  try {
    await pool.query('ALTER TABLE machines ADD INDEX idx_client (client_name)');
    console.log('✅ Index 3 (idx_client) added successfully!');
  } catch(e) {
    console.log('⚠️ Index 3 message:', e.message);
  }

  console.log('Database optimization complete.');
  process.exit();
}

addIndexes();
