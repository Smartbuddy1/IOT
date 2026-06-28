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

async function setupTicketsDB() {
  try {
    console.log("Setting up Jira-Style Tickets Database Tables...");

    // 1. Create maintenance_tickets table
    console.log("Creating maintenance_tickets table...");
    await pool.query(`
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

    // 2. Alter maintenance_logs to act as Worklogs linked to tickets
    console.log("Updating maintenance_logs to link with tickets...");
    await pool.query(`ALTER TABLE maintenance_logs ADD COLUMN ticket_id VARCHAR(50)`).catch(e => {
      console.log('Column ticket_id might exist:', e.message);
    });

    console.log("✅ Ticketing Database setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database Setup Error:", error.message);
    process.exit(1);
  }
}

setupTicketsDB();
