import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'smartbuddy123',
  database: process.env.DB_NAME || 'smartbuddy_prod',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function testLogin(mobile, password) {
  try {
    console.log(`Testing login for: ${mobile}`);
    const [users] = await pool.query('SELECT id, mobile, role, password, status FROM tblusers WHERE mobile = ?', [mobile]);
    console.log('User Found:', users.length > 0 ? users[0] : 'None');
    
    if (users.length > 0) {
      const dbUser = users[0];
      if (dbUser.password && dbUser.password.startsWith('$2')) {
        const isMatch = await bcrypt.compare(password, dbUser.password);
        console.log(`Bcrypt compare match: ${isMatch}`);
      } else {
        const isMatch = (dbUser.password === password);
        console.log(`Plaintext match: ${isMatch}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

// Check args or use defaults
const args = process.argv.slice(2);
testLogin(args[0] || '8007629230', args[1] || '123456');
