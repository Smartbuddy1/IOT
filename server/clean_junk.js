import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'smartbuddy123',
  database: process.env.DB_NAME || 'smartbuddy_prod',
});

async function cleanJunk() {
  try {
    console.log("Cleaning junk hardware entries from DB...");
    
    // Delete any machine that contains a '+' or '=' sign
    const [result1] = await pool.query(`DELETE FROM machines WHERE machine_id LIKE '%+%' OR machine_id LIKE '%=%'`);
    const [result2] = await pool.query(`DELETE FROM device_live_status WHERE machine_id LIKE '%+%' OR machine_id LIKE '%=%'`);
    
    console.log(`✅ Deleted ${result1.affectedRows} junk machines and ${result2.affectedRows} live status entries.`);
    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

cleanJunk();
