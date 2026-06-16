import db from './src/config/db.js';

const checkClients = async () => {
  try {
    const [clients] = await db.query('SELECT contact_mobile, password, client_name FROM clients LIMIT 5');
    console.log('--- EXISTING CLIENTS ---');
    console.log(clients);
    
    if (clients.length === 0) {
      console.log('No clients found! Creating default client...');
      await db.query('INSERT INTO clients (client_name, contact_mobile, password, status) VALUES (?, ?, ?, ?)', ['Test Client', 'client', 'client123', 1]);
      console.log('Client created: mobile="client", password="client123"');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
};

checkClients();
