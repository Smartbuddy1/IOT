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

async function setupMaintenanceDB() {
  try {
    console.log("Setting up Maintenance Database Tables...");

    // 1. Alter tblusers role ENUM to include Maintenance roles
    console.log("Updating tblusers roles...");
    // First, let's just make it a VARCHAR to avoid ENUM strictness issues in the future
    await pool.query(`ALTER TABLE tblusers MODIFY COLUMN role VARCHAR(50) DEFAULT 'Client'`);
    
    // Convert old 'Operation' roles to 'Maintenance_Head'
    const [updateRes] = await pool.query(`UPDATE tblusers SET role = 'Maintenance_Head' WHERE role = 'Operation'`);
    console.log(`Updated ${updateRes.affectedRows} existing 'Operation' users to 'Maintenance_Head'`);

    // 2. Create tech_allocations table
    console.log("Creating tech_allocations table...");
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

    // 3. Create maintenance_logs table
    console.log("Creating maintenance_logs table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        machine_id VARCHAR(100) NOT NULL,
        tech_id INT NOT NULL,
        reported_issue TEXT,
        root_cause TEXT,
        action_taken TEXT,
        before_photo VARCHAR(255),
        after_photo VARCHAR(255),
        gps_lat VARCHAR(50),
        gps_lng VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Resolved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Maintenance Database setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database Setup Error:", error.message);
    process.exit(1);
  }
}

setupMaintenanceDB();
