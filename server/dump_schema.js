import mysql from 'mysql2/promise';
import fs from 'fs';

async function dump() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'smart_iot'
    });

    const tables = ['machines', 'clients', 'projects', 'trans', 'tblusers'];
    const schema = {};

    for (const table of tables) {
      const [rows] = await connection.query(`DESCRIBE ${table}`);
      schema[table] = rows.map(r => r.Field);
    }
    
    fs.writeFileSync('schema_output.json', JSON.stringify(schema, null, 2));
    console.log('Schema written to schema_output.json');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    fs.writeFileSync('schema_error.txt', error.toString());
    process.exit(1);
  }
}

dump();
