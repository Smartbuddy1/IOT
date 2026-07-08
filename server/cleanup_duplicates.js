import pool from './src/config/db.js';

async function cleanupDuplicates() {
  try {
    console.log("🧹 Starting cleanup of duplicate clients, projects, and machines in database...");
    
    // 1. Delete duplicate client rows
    const [clientRes] = await pool.query(`
      DELETE c1 FROM clients c1
      INNER JOIN clients c2 
      WHERE c1.id > c2.id AND c1.client_name = c2.client_name AND c1.client_name IS NOT NULL;
    `);
    console.log(`✅ Successfully deleted ${clientRes.affectedRows} duplicate client rows!`);

    // 2. Delete duplicate project rows by exact project_name
    const [projectRes] = await pool.query(`
      DELETE p1 FROM projects p1
      INNER JOIN projects p2 
      WHERE p1.id > p2.id AND p1.project_name = p2.project_name AND p1.project_name IS NOT NULL;
    `);
    console.log(`✅ Successfully deleted ${projectRes.affectedRows} duplicate project rows by exact name!`);

    // 2B. Merge & delete duplicate projects sharing same client_name + sale_ord_no (from truncated import runs)
    const [dups] = await pool.query(`
      SELECT p1.id as id1, p1.project_name as name1, p2.id as id2, p2.project_name as name2
      FROM projects p1
      JOIN projects p2 ON p1.client_name = p2.client_name AND p1.sale_ord_no = p2.sale_ord_no AND p1.id > p2.id
      WHERE p1.client_name IS NOT NULL AND p1.sale_ord_no IS NOT NULL
    `);
    for (const d of dups) {
      await pool.query('UPDATE machines SET project_name = ? WHERE project_name = ?', [d.name2, d.name1]);
      await pool.query('DELETE FROM projects WHERE id = ?', [d.id1]);
    }
    console.log(`✅ Successfully merged and deleted ${dups.length} duplicate project rows by client+order number!`);

    // 3. Delete duplicate machine rows, keeping only the row with the lowest ID for each machine_id
    const [result] = await pool.query(`
      DELETE m1 FROM machines m1
      INNER JOIN machines m2 
      WHERE m1.id > m2.id AND m1.machine_id = m2.machine_id AND m1.machine_id IS NOT NULL;
    `);
    
    console.log(`✅ Successfully deleted ${result.affectedRows} duplicate machine rows!`);

    // 4. Try to add UNIQUE indexes
    try {
      await pool.query(`ALTER TABLE machines ADD UNIQUE INDEX idx_unique_machine_id (machine_id)`);
      console.log("✅ Added UNIQUE index on machine_id column!");
    } catch (indexErr) {}

    const [c] = await pool.query('SELECT COUNT(*) as cnt FROM clients');
    const [p] = await pool.query('SELECT COUNT(*) as cnt FROM projects');
    const [m] = await pool.query('SELECT COUNT(*) as cnt FROM machines');
    console.log(`🎯 CLEAN DATABASE COUNTS -> Clients: ${c[0].cnt} | Projects: ${p[0].cnt} | Machines: ${m[0].cnt}`);

    console.log("🚀 Database cleanup completed cleanly!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error cleaning up duplicates:", error);
    process.exit(1);
  }
}

cleanupDuplicates();
