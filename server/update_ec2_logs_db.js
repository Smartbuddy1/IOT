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
    await pool.query('ALTER TABLE maintenance_logs ADD COLUMN pcb_condition VARCHAR(100), ADD COLUMN voltage_reading VARCHAR(50), ADD COLUMN relays_checked TINYINT(1) DEFAULT 0, ADD COLUMN sensors_checked TINYINT(1) DEFAULT 0').catch(e => console.log('Columns might exist:', e.message));
    await pool.query('ALTER TABLE maintenance_logs MODIFY COLUMN before_photo LONGTEXT, MODIFY COLUMN after_photo LONGTEXT').catch(e => console.log('Failed to modify photo columns:', e.message));
    console.log('✅ maintenance_logs Table Fixed!');
    process.exit(0);
  } catch (e) {
    console.log('Error:', e.message);
    process.exit(1);
  }
}
fix();
