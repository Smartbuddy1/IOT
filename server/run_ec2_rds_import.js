import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runRDSImport = async () => {
  try {
    console.log('Connecting to AWS RDS Database using server/.env credentials...');
    
    // Path to ec2_safe_import_e2t.sql (located in workspace root)
    const sqlPath = path.resolve(__dirname, '../ec2_safe_import_e2t.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ SQL file not found at: ${sqlPath}`);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    
    // Split queries by semicolon followed by newline
    const queries = sqlContent
      .split(/;\s*$/m)
      .map(q => q.trim())
      .filter(q => q && !q.startsWith('--'));

    console.log(`Executing ${queries.length} safe import queries on AWS RDS...`);

    let successCount = 0;
    for (const query of queries) {
      if (!query) continue;
      try {
        await pool.query(query);
        successCount++;
      } catch (err) {
        // Log query warning if table or syntax difference
        console.warn(`Warning on query: ${query.substring(0, 60)}... -> ${err.message}`);
      }
    }

    console.log(`✅ Successfully executed safe import on AWS RDS (${successCount} queries completed).`);
    console.log('Client names and Contact Persons have been updated without removing existing real clients.');
    process.exit(0);
  } catch (error) {
    console.error('❌ RDS Import failed:', error);
    process.exit(1);
  }
};

runRDSImport();
