import pool from './src/config/db.js';

async function cleanupDuplicates() {
  try {
    console.log("🧹 Starting cleanup of duplicate machines in database...");
    
    // 1. Delete duplicate machine rows, keeping only the row with the lowest ID for each machine_id
    const [result] = await pool.query(`
      DELETE m1 FROM machines m1
      INNER JOIN machines m2 
      WHERE m1.id > m2.id AND m1.machine_id = m2.machine_id AND m1.machine_id IS NOT NULL;
    `);
    
    console.log(`✅ Successfully deleted ${result.affectedRows} duplicate machine rows!`);

    // 2. Try to add a UNIQUE index on machine_id so duplicates can never be created again
    try {
      await pool.query(`ALTER TABLE machines ADD UNIQUE INDEX idx_unique_machine_id (machine_id)`);
      console.log("✅ Added UNIQUE index on machine_id column!");
    } catch (indexErr) {
      if (indexErr.code === 'ER_DUP_KEYNAME') {
        console.log("ℹ️ UNIQUE index on machine_id already exists.");
      } else {
        console.log("⚠️ Could not add UNIQUE index (might already exist or differ):", indexErr.message);
      }
    }

    console.log("🚀 Database cleanup completed cleanly!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error cleaning up duplicates:", error);
    process.exit(1);
  }
}

cleanupDuplicates();
