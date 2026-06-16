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


  connection.release();
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}

export default pool;
