import db from './src/config/db.js';

const checkUsers = async () => {
  try {
    const [users] = await db.query('SELECT mobile, password, role FROM tblusers LIMIT 5');
    console.log('--- EXISTING USERS ---');
    console.log(users);
    
    if (users.length === 0) {
      console.log('No users found! Creating default admin...');
      await db.query('INSERT INTO tblusers (name, email, mobile, password, role, status) VALUES (?, ?, ?, ?, ?, ?)', ['Admin', 'admin@smartbuddy.com', 'admin', 'admin123', 'Admin', 1]);
      console.log('Admin created: mobile="admin", password="admin123"');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
};

checkUsers();
