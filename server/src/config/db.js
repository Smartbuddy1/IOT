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

  // 1. Automatically ensure machines table has gps_lat and gps_lng columns
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

    if (!columnNames.includes('toilet_type')) {
      console.log('Adding toilet_type column to machines table...');
      await connection.query("ALTER TABLE machines ADD COLUMN toilet_type VARCHAR(20) DEFAULT 'Unisex'");
      console.log('✅ Added toilet_type column to machines table.');
    }
  } catch (migError) {
    console.error('⚠️ Migration helper for machines table failed:', migError.message);
  }

  // 2. Automatically ensure maintenance-related tables exist
  try {
    // Create tech_allocations table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tech_allocations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tech_id INT NOT NULL,
        machine_id VARCHAR(100) NOT NULL,
        assigned_by INT,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_allocation (tech_id, machine_id)
      )
    `);

    // Create maintenance_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS maintenance_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        machine_id VARCHAR(100) NOT NULL,
        tech_id INT NOT NULL,
        reported_issue TEXT,
        root_cause TEXT,
        action_taken TEXT,
        before_photo LONGTEXT,
        after_photo LONGTEXT,
        gps_lat VARCHAR(50),
        gps_lng VARCHAR(50),
        pcb_condition VARCHAR(100),
        voltage_reading VARCHAR(100),
        relays_checked TINYINT(1) DEFAULT 0,
        sensors_checked TINYINT(1) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Resolved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create maintenance_tickets table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS maintenance_tickets (
        ticket_id VARCHAR(50) PRIMARY KEY,
        machine_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'Medium',
        status VARCHAR(50) DEFAULT 'Open',
        assigned_tech_id INT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL
      )
    `);

    // Alter maintenance_logs to add ticket_id column if not exists
    const [logColumns] = await connection.query('SHOW COLUMNS FROM maintenance_logs');
    const logColumnNames = logColumns.map(c => c.Field);
    if (!logColumnNames.includes('ticket_id')) {
      console.log('Adding ticket_id column to maintenance_logs table...');
      await connection.query('ALTER TABLE maintenance_logs ADD COLUMN ticket_id VARCHAR(50)');
      console.log('✅ Added ticket_id column to maintenance_logs table.');
    }
  } catch (ticketError) {
    console.error('⚠️ Maintenance/Ticketing table migrations failed:', ticketError.message);
  }

  connection.release();
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}

export default pool;
