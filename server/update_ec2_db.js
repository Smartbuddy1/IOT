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

async function fixDatabase() {
  try {
    console.log("Fixing tblusers schema for EC2...");
    
    // Add missing columns to tblusers
    const columnsToAdd = [
      "ADD COLUMN assigned_state VARCHAR(255)",
      "ADD COLUMN assigned_client VARCHAR(255)",
      "ADD COLUMN assigned_project VARCHAR(255)",
      "ADD COLUMN is_logged_in TINYINT DEFAULT 0"
    ];

    for (const col of columnsToAdd) {
      try {
        await pool.query(`ALTER TABLE tblusers ${col}`);
        console.log(`Successfully executed: ALTER TABLE tblusers ${col}`);
      } catch (e) {
        // Ignore duplicate column errors
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column already exists, skipping: ${col}`);
        } else {
          console.error(`Error adding column: ${col}`, e.message);
        }
      }
    }

    // Also run the maintenance DB setup to be safe
    console.log("Creating maintenance_logs table if it doesn't exist...");
    await pool.query(`
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
        relays_checked VARCHAR(100),
        sensors_checked VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Resolved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Creating tech_allocations table if it doesn't exist...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tech_allocations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tech_id INT NOT NULL,
        machine_id VARCHAR(100) NOT NULL,
        assigned_by INT,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_allocation (tech_id, machine_id)
      )
    `);

    console.log("✅ Database update complete! EC2 Server is now perfectly synced with Local.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database Setup Error:", error.message);
    process.exit(1);
  }
}

fixDatabase();
