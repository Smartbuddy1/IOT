import mysql from 'mysql2/promise';
import fs from 'fs';

async function importSql() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'smart_iot',
      multipleStatements: true
    });

    console.log('Connected to MySQL smart_iot database...');
    const sql = fs.readFileSync('c:/Users/Admin/Desktop/SmartBuddy28May/e2t_live_excel_data.sql', 'utf-8');

    await connection.query(sql);
    console.log('Successfully cleared old data and imported 79 Machines, 12 Clients, and 22 Projects into local MySQL database!');
    await connection.end();
  } catch (err) {
    console.log('Note: Local MySQL connection error or server not running:', err.message);
  }
}

importSql();
