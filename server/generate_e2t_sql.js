import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

const excelPath = 'c:/Users/Admin/Desktop/SmartBuddy28May/E2T Sale 02AUG24 (1).xlsx';
const workbook = xlsx.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log(`Processing ${rows.length - 1} rows from Excel with full Carry-Forward...`);

const clientsMap = new Map();
const projectsMap = new Map();
const machinesList = [];

let currentClientName = '';
let currentContactPerson = '';
let currentContactMobile = '';
let currentAddress = '';
let currentProjectNo = '';
let machineIndex = 1;

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length === 0) continue;

  if (row[8] && row[8].toString().trim()) {
    currentClientName = row[8].toString().trim();
  }
  if (row[3] && row[3].toString().trim()) {
    currentContactPerson = row[3].toString().trim();
  }
  if (row[5] && row[5].toString().trim()) {
    currentContactMobile = row[5].toString().trim();
  }
  if (row[4] && row[4].toString().trim()) {
    currentAddress = row[4].toString().trim();
  }
  if (row[0] && row[0].toString().trim()) {
    currentProjectNo = row[0].toString().trim();
  }

  const modelRaw = (row[9] || '').toString().trim();
  const machineCodeRaw = (row[6] || '').toString().trim();
  const installedLocation = (row[7] || '').toString().trim() || currentAddress;

  // Only include rows that represent a machine (have either a machine code or model)
  if (!machineCodeRaw && !modelRaw) continue;

  const clientName = currentClientName.substring(0, 100) || 'E2T Enterprise Client';
  const contactPerson = currentContactPerson || 'Authorized Officer';
  const contactNo = currentContactMobile || '9999999999';
  const clientAddress = currentAddress || installedLocation;

  // Add client if not exists
  if (!clientsMap.has(clientName)) {
    clientsMap.set(clientName, {
      client_name: clientName,
      contact_person: contactPerson,
      contact_mobile: contactNo.substring(0, 10),
      client_phone: contactNo.substring(0, 15),
      client_address: clientAddress,
      client_state: 'India',
      client_city: installedLocation.split(',')[0] || 'City'
    });
  }

  // Add project if exists
  const projectNo = currentProjectNo || `PROJ-${machineIndex}`;
  const projectName = projectNo ? `Project ${projectNo}` : `${clientName.substring(0, 30)} Project`;
  if (!projectsMap.has(projectName)) {
    projectsMap.set(projectName, {
      project_name: projectName.substring(0, 50),
      client_name: clientName,
      work_ord_no: projectNo.substring(0, 50),
      project_status: 'Ongoing'
    });
  }

  // Parse Model for price & mode
  let mode = 'Coin';
  let free = 'no';
  let coin = 'no';
  let upi = 'no';
  let digital_token = 'no';
  let uses_amt = 5; // default

  const mUpper = modelRaw.toUpperCase();
  if (mUpper.includes('FREE')) {
    mode = 'Free';
    free = 'yes';
    uses_amt = 0;
  } else if (mUpper.includes('COIN1RS')) {
    mode = 'Coin';
    coin = 'yes';
    uses_amt = 1;
  } else if (mUpper.includes('COIN2RS')) {
    mode = 'Coin';
    coin = 'yes';
    uses_amt = 2;
  } else if (mUpper.includes('COIN5RS')) {
    mode = 'Coin';
    coin = 'yes';
    uses_amt = 5;
  } else if (mUpper.includes('COIN')) {
    mode = 'Coin';
    coin = 'yes';
    uses_amt = 5;
  } else if (mUpper.includes('TOKAN') || mUpper.includes('TOKEN')) {
    mode = 'Token';
    digital_token = 'yes';
    uses_amt = 0;
  } else if (mUpper.includes('UPI')) {
    mode = 'UPI';
    upi = 'yes';
    uses_amt = 5;
  }

  const machineCode = machineCodeRaw || `E2T-MC-${machineIndex}`;

  machinesList.push({
    id: machineIndex,
    machine_id: `MCH-${1000 + machineIndex}`,
    machine_code: machineCode.substring(0, 25),
    client_name: clientName,
    project_name: projectName.substring(0, 30),
    inst_address: installedLocation || clientAddress,
    address: clientAddress || installedLocation,
    mode: mode,
    free: free,
    coin: coin,
    upi: upi,
    digital_token: digital_token,
    uses_amt: uses_amt,
    model: modelRaw,
    status: 'active'
  });

  machineIndex++;
}

console.log(`Extracted: ${clientsMap.size} Clients, ${projectsMap.size} Projects, ${machinesList.length} Machines`);

// Build SQL
let sql = `-- E2T Live Data generated from Excel: E2T Sale 02AUG24 (1).xlsx with accurate Carry-Forward\n`;
sql += `-- Clearing old dummy data\n`;
sql += `SET FOREIGN_KEY_CHECKS = 0;\n`;
sql += `TRUNCATE TABLE \`machines\`;\n`;
sql += `TRUNCATE TABLE \`projects\`;\n`;
sql += `TRUNCATE TABLE \`clients\`;\n`;
sql += `SET FOREIGN_KEY_CHECKS = 1;\n\n`;

// Insert Clients
sql += `-- Inserting Clients\n`;
let clientId = 1;
for (const [cName, cData] of clientsMap.entries()) {
  const escapedName = cData.client_name.replace(/'/g, "''");
  const escapedPerson = cData.contact_person.replace(/'/g, "''");
  const escapedAddr = cData.client_address.replace(/'/g, "''");
  sql += `INSERT INTO \`clients\` (\`id\`, \`client_name\`, \`contact_person\`, \`contact_mobile\`, \`client_phone\`, \`client_address\`, \`client_state\`, \`client_city\`, \`client_type\`, \`password\`) VALUES (${clientId}, '${escapedName}', '${escapedPerson}', '${cData.contact_mobile}', '${cData.client_phone}', '${escapedAddr}', '${cData.client_state}', '${cData.client_city.replace(/'/g, "''")}', 'Govt', '123456');\n`;
  clientId++;
}

sql += `\n-- Inserting Projects\n`;
let projId = 1;
for (const [pName, pData] of projectsMap.entries()) {
  const escapedProj = pData.project_name.replace(/'/g, "''");
  const escapedClient = pData.client_name.replace(/'/g, "''");
  const escapedWorkOrd = (pData.work_ord_no || '').replace(/'/g, "''");
  sql += `INSERT INTO \`projects\` (\`id\`, \`project_name\`, \`client_name\`, \`work_ord_no\`, \`project_status\`, \`created\`) VALUES (${projId}, '${escapedProj}', '${escapedClient}', '${escapedWorkOrd}', 'Ongoing', NOW());\n`;
  projId++;
}

sql += `\n-- Inserting Machines\n`;
for (const m of machinesList) {
  const escapedCode = m.machine_code.replace(/'/g, "''");
  const escapedClient = m.client_name.replace(/'/g, "''");
  const escapedProj = m.project_name.replace(/'/g, "''");
  const escapedInstAddr = m.inst_address.replace(/'/g, "''");
  const escapedAddr = m.address.replace(/'/g, "''");
  sql += `INSERT INTO \`machines\` (\`id\`, \`machine_id\`, \`machine_code\`, \`client_name\`, \`project_name\`, \`inst_address\`, \`address\`, \`mode\`, \`free\`, \`coin\`, \`upi\`, \`digital_token\`, \`uses_amt\`, \`status\`) VALUES (${m.id}, '${m.machine_id}', '${escapedCode}', '${escapedClient}', '${escapedProj}', '${escapedInstAddr}', '${escapedAddr}', '${m.mode}', '${m.free}', '${m.coin}', '${m.upi}', '${m.digital_token}', ${m.uses_amt}, 'active');\n`;
}

const outputPath = 'c:/Users/Admin/Desktop/SmartBuddy28May/e2t_live_excel_data.sql';
fs.writeFileSync(outputPath, sql, 'utf-8');
console.log(`Successfully generated SQL file at: ${outputPath}`);
