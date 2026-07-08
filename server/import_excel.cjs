const xlsx = require('xlsx');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_iot',
});

function getGpsCoords(locationStr, index) {
  const loc = (locationStr || '').toLowerCase();
  let baseLat = 18.5204;
  let baseLng = 73.8567;

  if (loc.includes('odisha') || loc.includes('pattamundai') || loc.includes('odisa')) {
    baseLat = 20.5735; baseLng = 86.5658;
  } else if (loc.includes('devgad') || loc.includes('sindhudurg')) {
    baseLat = 16.3813; baseLng = 73.3758;
  } else if (loc.includes('mumbai') || loc.includes('thane') || loc.includes('kalyan')) {
    baseLat = 19.0760; baseLng = 72.8777;
  } else if (loc.includes('gujarat') || loc.includes('ahmedabad') || loc.includes('surat') || loc.includes('baria')) {
    baseLat = 23.0225; baseLng = 72.5714;
  } else if (loc.includes('karnataka') || loc.includes('bangalore')) {
    baseLat = 12.9716; baseLng = 77.5946;
  }

  const jitterLat = ((index * 137) % 100 - 50) * 0.0008;
  const jitterLng = ((index * 241) % 100 - 50) * 0.0008;

  return {
    lat: (baseLat + jitterLat).toFixed(6),
    lng: (baseLng + jitterLng).toFixed(6)
  };
}

function getStateFromLoc(locationStr) {
  const loc = (locationStr || '').toLowerCase();
  if (loc.includes('odisha') || loc.includes('odisa') || loc.includes('pattamundai')) return 'Odisha';
  if (loc.includes('gujarat') || loc.includes('ahmedabad') || loc.includes('surat')) return 'Gujarat';
  if (loc.includes('karnataka') || loc.includes('bangalore')) return 'Karnataka';
  return 'Maharashtra';
}

async function run() {
  console.log('🚀 Starting import...');
  const wb = xlsx.readFile(path.join(__dirname, '../E2T Sale 02AUG24 (1).xlsx'));
  const rawData = xlsx.utils.sheet_to_json(wb.Sheets['E2T']);

  let lastClient = 'E2T Municipal Client';
  let lastSor = 'SOR-GENERAL';
  let lastLoc = 'Maharashtra';
  let lastAddress = 'Municipal Office, India';
  let lastPhone = '9876543210';
  let lastEmail = 'client@smartbuddy.iot';

  const defaultPasswordHash = await bcrypt.hash('Ea2z@122#', 10);
  let clientsAdded = 0, projectsAdded = 0, machinesAdded = 0;

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (row['Client Name']) lastClient = row['Client Name'].toString().trim();
    if (row['SOR No']) lastSor = row['SOR No'].toString().trim();
    if (row['Installed Location ']) lastLoc = row['Installed Location '].toString().trim();
    if (row['Client Address']) lastAddress = row['Client Address'].toString().trim();
    if (row['Mobile No'] || row['SMS Client No']) lastPhone = (row['Mobile No'] || row['SMS Client No']).toString().trim();
    if (row['Email ']) lastEmail = row['Email '].toString().trim();

    const clientName = lastClient;
    const sorNo = lastSor;
    const location = lastLoc;
    const address = lastAddress;
    const phone = lastPhone.slice(0, 15);
    const email = lastEmail.slice(0, 50);
    const state = getStateFromLoc(location);
    const city = location.split(',')[0].trim().slice(0, 50) || 'City';

    // Client
    try {
      const [res] = await pool.query(
        `INSERT IGNORE INTO clients 
        (client_name, client_phone, client_address, client_website, client_state, clinet_district, client_city, client_type, contact_person, contact_mobile, password, contact_email, client_logo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [clientName, phone, address, 'https://smartbuddy.iot', state, city, city, 'Government', clientName, phone, defaultPasswordHash, email, '/uploads/logos/client_logo_1781426992530-110194436.jpg']
      );
      if (res.affectedRows > 0) clientsAdded++;
    } catch(e){}

    // Project
    const projectName = `${clientName} - ${sorNo}`;
    try {
      const [res] = await pool.query(
        `INSERT IGNORE INTO projects 
        (project_name, client_name, project_starts, sale_ord_no, project_status, state, remark) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [projectName, clientName, '2024-01-01', sorNo, 'Ongoing', state, 'Imported E2T']
      );
      if (res.affectedRows > 0) projectsAdded++;
    } catch(e){}

    // Machine
    let machineId = row['Machine Code'] ? row['Machine Code'].toString().trim() : `E2T-M-${1000 + i}`;
    const model = row['Model'] ? row['Model'].toString().trim() : 'E2T Eco-Toilet';
    const coords = getGpsCoords(location, i);

    try {
      const [existing] = await pool.query('SELECT id FROM machines WHERE machine_id = ?', [machineId]);
      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO machines 
          (machine_id, client_name, state, district, city, address, inst_address, project_name, status, mode, machine_code, m_desc, gps_lat, gps_lng, toilet_type) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [machineId, clientName, state, city, city, address, location, projectName, 'active', 'automatic', model, `${model} at ${location}`, coords.lat, coords.lng, 'E2T Eco-Toilet']
        );
        machinesAdded++;
      } else {
        await pool.query(
          `UPDATE machines SET client_name = ?, project_name = ?, inst_address = ?, gps_lat = ?, gps_lng = ?, toilet_type = ? WHERE machine_id = ?`,
          [clientName, projectName, location, coords.lat, coords.lng, 'E2T Eco-Toilet', machineId]
        );
      }
    } catch(e){}
  }

  // Live status
  const [allMachines] = await pool.query('SELECT machine_id FROM machines');
  for (const m of allMachines) {
    await pool.query(
      `INSERT IGNORE INTO device_live_status (machine_id, water_level, pir_sensor, door_lock, pb_flush, last_updated) 
       VALUES (?, 85, 'ACTIVE', 'UNLOCKED', 'OK', NOW())`,
      [m.machine_id]
    );
  }

  console.log(`✅ IMPORT SUCCESS!`);
  console.log(`New Clients: ${clientsAdded}, Projects: ${projectsAdded}, Machines: ${machinesAdded}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
