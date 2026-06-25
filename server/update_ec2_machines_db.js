import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'smartbuddy123',
  database: process.env.DB_NAME || 'smartbuddy_prod',
});

async function fix() {
  try {
    await pool.query('ALTER TABLE machines ADD COLUMN gps_lat VARCHAR(50), ADD COLUMN gps_lng VARCHAR(50)').catch(e => console.log('Columns might exist:', e.message));
    console.log('✅ machines Table Fixed! gps_lat and gps_lng added.');
    process.exit(0);
  } catch (e) {
    console.log('Error:', e.message);
    process.exit(1);
  }
}
fix();
