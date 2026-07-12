import pool from './src/config/db.js';

const contactPersonNames = [
  'Mr.Surykant Nayak',
  'Mr.Bhuavan Ahuja',
  'Mr .Guruprasad',
  'Mr.Rohit Shukla',
  'Mr.Vijay Patil',
  'Sameer Vaidya',
  'Mr.Sudarshan Dahatonde',
  'Mr.Krupal  Baria',
  'Mr.Mayur Patre',
  'Mr. Ezhilarasan Sir',
  'Pratap Bhosale',
  'Test Client',
  'Dummy'
];

const cleanupMistakenClients = async () => {
  try {
    console.log('Connecting to AWS RDS Database...');
    console.log('Cleaning up clients & machines where client_name was mistakenly created as a Contact Person name...');

    // 1. Delete orphan/mistaken machines under Contact Person names
    for (const name of contactPersonNames) {
      const [mRes] = await pool.query('DELETE FROM machines WHERE client_name = ? OR client_name LIKE ?', [name, 'Mr.%']);
      if (mRes.affectedRows > 0) {
        console.log(`🗑️ Removed ${mRes.affectedRows} mistaken machines under contact person: ${name}`);
      }
    }

    // 2. Delete orphan/mistaken projects under Contact Person names
    for (const name of contactPersonNames) {
      const [pRes] = await pool.query('DELETE FROM projects WHERE client_name = ? OR client_name LIKE ?', [name, 'Mr.%']);
      if (pRes.affectedRows > 0) {
        console.log(`🗑️ Removed ${pRes.affectedRows} mistaken projects under contact person: ${name}`);
      }
    }

    // 3. Delete mistaken clients created with Contact Person names
    for (const name of contactPersonNames) {
      const [cRes] = await pool.query('DELETE FROM clients WHERE client_name = ? OR client_name LIKE ?', [name, 'Mr.%']);
      if (cRes.affectedRows > 0) {
        console.log(`🗑️ Removed mistaken client: ${name} (${cRes.affectedRows} rows deleted)`);
      }
    }

    console.log('✅ Successfully deleted all mistaken Contact Person clients and their orphan records!');
    console.log('Only the genuine organization clients and your existing real clients remain.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
};

cleanupMistakenClients();
