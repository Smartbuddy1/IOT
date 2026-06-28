import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_iot',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection and apply migrations
try {
  const connection = await pool.getConnection();
  console.log('✅ MySQL Database Connected Successfully!');

  // Automatically ensure machines table has gps_lat and gps_lng columns
  try {
    const [columns] = await connection.query('SHOW COLUMNS FROM machines');
    const columnNames = columns.map(c => c.Field);
    
    if (!columnNames.includes('gps_lat')) {
      console.log('Adding gps_lat column to machines table...');
      await connection.query('ALTER TABLE machines ADD COLUMN gps_lat VARCHAR(50)');
      console.log('✅ Added gps_lat column to machines table.');
    }
    
    if (!columnNames.includes('gps_lng')) {
      console.log('Adding gps_lng column to machines table...');
      await connection.query('ALTER TABLE machines ADD COLUMN gps_lng VARCHAR(50)');
      console.log('✅ Added gps_lng column to machines table.');
    }
  } catch (migError) {
    console.error('⚠️ Migration helper for machines table failed:', migError.message);
  }

  connection.release();
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}

export default pool;
