import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool from './src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function importExcel() {
  console.log('🚀 Starting Local Excel Data Import...');
  const excelPath = path.join(__dirname, '../E2T Sale 02AUG24 (1).xlsx');
  const wb = xlsx.readFile(excelPath);
  const ws = wb.Sheets['E2T'];
  const rawData = xlsx.utils.sheet_to_json(ws);

  let lastClient = 'E2T Municipal Client';
  let lastSor = 'SOR-GENERAL';
  let lastLoc = 'Maharashtra';
  let lastAddress = 'Municipal Office, India';
  let lastPhone = '9876543210';
  let lastEmail = 'client@smartbuddy.iot';

  const defaultPasswordHash = await bcrypt.hash('Ea2z@122#', 10);

  let clientsAdded = 0;
  let projectsAdded = 0;
  let machinesAdded = 0;

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];

    if (row['Client Name']) lastClient = row['Client Name'].toString().trim();
    else row['Client Name'] = lastClient;

    if (row['SOR No']) lastSor = row['SOR No'].toString().trim();
    else row['SOR No'] = lastSor;

    if (row['Installed Location ']) lastLoc = row['Installed Location '].toString().trim();
    else row['Installed Location '] = lastLoc;

    if (row['Client Address']) lastAddress = row['Client Address'].toString().trim();
    else row['Client Address'] = lastAddress;

    if (row['Mobile No'] || row['SMS Client No']) lastPhone = (row['Mobile No'] || row['SMS Client No']).toString().trim();
    if (row['Email ']) lastEmail = row['Email '].toString().trim();

    const clientName = row['Client Name'];
    const sorNo = row['SOR No'];
    const location = row['Installed Location '];
    const address = row['Client Address'];
    const phone = lastPhone.slice(0, 15);
    const email = lastEmail.slice(0, 50);
    const state = getStateFromLoc(location);
    const city = location.split(',')[0].trim().slice(0, 50) || 'City';

    try {
      const [clientRes] = await pool.query(
        `INSERT IGNORE INTO clients 
        (client_name, client_phone, client_address, client_website, client_state, clinet_district, client_city, client_type, contact_person, contact_mobile, password, contact_email, client_logo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clientName, phone, address, 'https://smartbuddy.iot', state, city, city,
          clientName.toLowerCase().includes('municipal') || clientName.toLowerCase().includes('department') ? 'Government' : 'Private',
          clientName, phone, defaultPasswordHash, email, '/uploads/logos/client_logo_1781426992530-110194436.jpg'
        ]
      );
      if (clientRes.affectedRows > 0) clientsAdded++;
    } catch (e) {}

    const projectName = `${clientName} - ${sorNo}`;
    try {
      const [projRes] = await pool.query(
        `INSERT IGNORE INTO projects 
        (project_name, client_name, project_starts, sale_ord_no, project_status, state, remark) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [projectName, clientName, '2024-01-01', sorNo, 'Ongoing', state, `Imported from E2T Excel sheet (${location})`]
      );
      if (projRes.affectedRows > 0) projectsAdded++;
    } catch (e) {}

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
          [
            machineId, clientName, state, city, city, address, location, projectName,
            'active', 'automatic', model, `${model} installed at ${location}`, coords.lat, coords.lng, 'E2T Eco-Toilet'
          ]
        );
        machinesAdded++;
      } else {
        await pool.query(
          `UPDATE machines SET client_name = ?, project_name = ?, inst_address = ?, gps_lat = ?, gps_lng = ?, toilet_type = ? WHERE machine_id = ?`,
          [clientName, projectName, location, coords.lat, coords.lng, 'E2T Eco-Toilet', machineId]
        );
      }
    } catch (e) {
      console.error(`Error inserting machine ${machineId}:`, e.message);
    }
  }

  const [allMachines] = await pool.query('SELECT machine_id FROM machines');
  for (const m of allMachines) {
    await pool.query(
      `INSERT IGNORE INTO device_live_status (machine_id, water_level, pir_sensor, door_lock, pb_flush, last_updated) 
       VALUES (?, 85, 'ACTIVE', 'UNLOCKED', 'OK', NOW())`,
      [m.machine_id]
    );
  }

  console.log(`✅ LOCAL IMPORT SUCCESSFUL!`);
  console.log(`🏛️ New Clients Added: ${clientsAdded}`);
  console.log(`📁 New Projects Added: ${projectsAdded}`);
  console.log(`🤖 Total Machines Processed: ${rawData.length} (New added: ${machinesAdded})`);
  process.exit(0);
}

importExcel().catch(err => {
  console.error('❌ Import Failed:', err);
  process.exit(1);
});
