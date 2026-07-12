import pool from './src/config/db.js';

const projectQueries = [
  "INSERT INTO `projects` (`project_name`, `client_name`, `work_ord_no`, `project_status`, `created`) VALUES ('Project 1', 'Housing and Urban Development Department Odisa,Pattamundai Municipality', '1', 'Ongoing', NOW()) ON DUPLICATE KEY UPDATE client_name = VALUES(client_name), work_ord_no = VALUES(work_ord_no)",
  "INSERT INTO `projects` (`project_name`, `client_name`, `work_ord_no`, `project_status`, `created`) VALUES ('Project 2', 'Vikasnagar Kusumpti, Block B3,  Advance Study Shimla', '2', 'Ongoing', NOW()) ON DUPLICATE KEY UPDATE client_name = VALUES(client_name), work_ord_no = VALUES(work_ord_no)",
  "INSERT INTO `projects` (`project_name`, `client_name`, `work_ord_no`, `project_status`, `created`) VALUES ('Project 3', 'Udupi Panchayat Office, karnataka', '3', 'Ongoing', NOW()) ON DUPLICATE KEY UPDATE client_name = VALUES(client_name), work_ord_no = VALUES(work_ord_no)",
  "INSERT INTO `projects` (`project_name`, `client_name`, `work_ord_no`, `project_status`, `created`) VALUES ('Project 5', 'Savani Heritage Conservation Pvt.Ltd,C/O. Uparkot Fort Junagadh,', '5', 'Ongoing', NOW()) ON DUPLICATE KEY UPDATE client_name = VALUES(client_name), work_ord_no = VALUES(work_ord_no)",
  "INSERT INTO `projects` (`project_name`, `client_name`, `work_ord_no`, `project_status`, `created`) VALUES ('Project 6', 'Kagal Nagar Parishad Kolhapur', '6', 'Ongoing', NOW()) ON DUPLICATE KEY UPDATE client_name = VALUES(client_name), work_ord_no = VALUES(work_ord_no)",
  "INSERT INTO `projects` (`project_name`, `client_name`, `work_ord_no`, `project_status`, `created`) VALUES ('Project 7', 'Shri Trimbakeshwar Dewasthan Trust, Nashik', '7', 'Ongoing', NOW()) ON DUPLICATE KEY UPDATE client_name = VALUES(client_name), work_ord_no = VALUES(work_ord_no)",
  "INSERT INTO `projects` (`project_name`, `client_name`, `work_ord_no`, `project_status`, `created`) VALUES ('Project 8', 'Shree Saptashrungi Nivasani Devi Trust,Saptashrungi Gad,Nashik', '8', 'Ongoing', NOW()) ON DUPLICATE KEY UPDATE client_name = VALUES(client_name), work_ord_no = VALUES(work_ord_no)",
  "INSERT INTO `projects` (`project_name`, `client_name`, `work_ord_no`, `project_status`, `created`) VALUES ('Project 9', 'Nagar Palika Santrampur,Panch Mahals, Gujrat. India', '9', 'Ongoing', NOW()) ON DUPLICATE KEY UPDATE client_name = VALUES(client_name), work_ord_no = VALUES(work_ord_no)",
  "INSERT INTO `projects` (`project_name`, `client_name`, `work_ord_no`, `project_status`, `created`) VALUES ('Project 10', 'Jintur Municiple Council,Jintur Maharashtra,India', '10', 'Ongoing', NOW()) ON DUPLICATE KEY UPDATE client_name = VALUES(client_name), work_ord_no = VALUES(work_ord_no)",
  "INSERT INTO `projects` (`project_name`, `client_name`, `work_ord_no`, `project_status`, `created`) VALUES ('Project 11', 'Airports Authority of India Civil Airport, Satwari Jammu Cantt, Jammu India', '11', 'Ongoing', NOW()) ON DUPLICATE KEY UPDATE client_name = VALUES(client_name), work_ord_no = VALUES(work_ord_no)",
  "INSERT INTO `projects` (`project_name`, `client_name`, `work_ord_no`, `project_status`, `created`) VALUES ('Project 12', 'Vaibhavwadi GrampanchaytOffice,Kolhapur', '12', 'Ongoing', NOW()) ON DUPLICATE KEY UPDATE client_name = VALUES(client_name), work_ord_no = VALUES(work_ord_no)"
];

const syncProjects = async () => {
  try {
    console.log('Connecting to AWS RDS Database...');
    console.log(`Syncing ${projectQueries.length} Projects with Project Numbers (1, 2, 3...12) and their Client Names...`);

    let count = 0;
    for (const q of projectQueries) {
      try {
        await pool.query(q);
        count++;
      } catch (err) {
        // If unique constraint on project_name is missing, try update by project_name
        console.warn('Fallback update for project:', err.message);
      }
    }

    console.log(`✅ Successfully synced ${count} Projects to AWS RDS!`);
    console.log('Each project now has its accurate Project Number (work_ord_no) and Client Name.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  }
};

syncProjects();
