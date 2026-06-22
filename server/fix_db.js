import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'smartbuddy123',
  database: process.env.DB_NAME || 'smartbuddy_prod',
});

async function fixDB() {
  try {
    console.log("Fixing Database...");
    
    // 1. Increase column size
    await pool.query('ALTER TABLE tblusers MODIFY password VARCHAR(255)');
    await pool.query('ALTER TABLE clients MODIFY password VARCHAR(255)');
    console.log("✅ Password columns increased to 255 chars.");

    // 2. Reset corrupted passwords
    await pool.query("UPDATE tblusers SET password = 'password' WHERE password LIKE '$2%'");
    await pool.query("UPDATE clients SET password = 'password' WHERE password LIKE '$2%'");
    console.log("✅ Reset all locked passwords back to 'password'.");

    console.log("Done! You can now log in with the password 'password'.");
    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

fixDB();
