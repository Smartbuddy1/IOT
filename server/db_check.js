import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart',
});

async function check() {
  try {
    const [machines] = await pool.query('DESCRIBE machines');
    console.log("MACHINES TABLE:");
    console.table(machines.map(f => ({ Field: f.Field, Type: f.Type })));

    const [clients] = await pool.query('DESCRIBE clients');
    console.log("\nCLIENTS TABLE:");
    console.table(clients.map(f => ({ Field: f.Field, Type: f.Type })));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
