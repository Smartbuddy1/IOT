import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import http from 'http';

const JWT_SECRET = 'smartbuddy_super_secret_jwt_key_2026';

async function makeRequest(path, token, expectedStatus) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5005,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const pass = res.statusCode === expectedStatus || (expectedStatus === 200 && res.statusCode === 201);
        resolve({ pass, status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      resolve({ pass: false, status: 0, data: e.message });
    });

    req.end();
  });
}

async function runTests() {
  console.log("Starting RBAC Tests...");
  
  try {
    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'smart_iot'
    });

    const [users] = await pool.query("SELECT id, name, role, assigned_client, assigned_project FROM tblusers");
    console.log(`Found ${users.length} staff in DB.`);

    const [clients] = await pool.query("SELECT id, client_name as name FROM clients");
    console.log(`Found ${clients.length} clients in DB.`);

    const roles = ['Admin', 'Maintenance_Head', 'Field_Tech', 'Client'];
    
    for (const role of roles) {
      let user = null;
      if (role === 'Client') {
         if (clients.length > 0) {
            user = { id: clients[0].id, role: 'Client', assigned_client: clients[0].name };
         }
      } else {
         user = users.find(u => u.role === role);
      }
      if (!user) {
        console.log(`[SKIP] No user found for role: ${role}`);
        continue;
      }

      // Generate token manually bypassing bcrypt for testing
      const token = jwt.sign(
        { id: user.id, role: user.role, assigned_client: user.assigned_client, assigned_project: user.assigned_project },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      console.log(`\n--- Testing Role: ${role} ---`);

      // Endpoint 1: Admin only (/api/users)
      const adminTest = await makeRequest('/api/users', token, role === 'Admin' ? 200 : 403);
      console.log(`[${adminTest.pass ? 'PASS' : 'FAIL'}] Access /api/users (Expected ${role === 'Admin' ? 200 : 403}, Got ${adminTest.status})`);

      // Endpoint 2: Maintenance Head & Admin (/api/maintenance/staff)
      const isMaintOrAdmin = ['Admin', 'Maintenance_Head'].includes(role);
      const maintTest = await makeRequest('/api/maintenance/staff', token, isMaintOrAdmin ? 200 : 403);
      console.log(`[${maintTest.pass ? 'PASS' : 'FAIL'}] Access /api/maintenance/staff (Expected ${isMaintOrAdmin ? 200 : 403}, Got ${maintTest.status})`);

      // Endpoint 3: Field Tech, Admin, Client (/api/machines)
      const isMachineAccess = ['Admin', 'Field_Tech', 'Client'].includes(role);
      const machineTest = await makeRequest('/api/machines', token, isMachineAccess ? 200 : 403);
      console.log(`[${machineTest.pass ? 'PASS' : 'FAIL'}] Access /api/machines (Expected ${isMachineAccess ? 200 : 403}, Got ${machineTest.status})`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Test execution failed:", error.message);
    process.exit(1);
  }
}

runTests();
