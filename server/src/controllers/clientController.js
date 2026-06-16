import pool from '../config/db.js';

export const getClients = async (req, res) => {
  try {
    let query = 'SELECT * FROM clients';
    let params = [];

    if (req.user.role === 'Operation' && req.user.assigned_state) {
      query += ' WHERE client_state = ?';
      params.push(req.user.assigned_state);
    }
    
    query += ' ORDER BY id DESC';

    const [clients] = await pool.query(query, params);
    res.json({ success: true, clients });
  } catch (error) {
    console.error('Fetch clients error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createClient = async (req, res) => {
  const { 
    client_name, client_phone, client_address, client_website, 
    client_state, clinet_district, client_city, client_type, 
    contact_person, contact_mobile, password, contact_email 
  } = req.body;

  let client_logo = req.body.client_logo || '';
  if (req.file) {
    client_logo = '/uploads/logos/' + req.file.filename;
  }

  if (!client_name || !client_phone || !password) {
    return res.status(400).json({ success: false, message: 'Client Name, Phone, and Password are required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO clients 
      (client_name, client_phone, client_address, client_website, client_state, clinet_district, client_city, client_type, contact_person, contact_mobile, password, contact_email, client_logo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client_name, client_phone, client_address || '', client_website || '', 
        client_state || '', clinet_district || '', client_city || '', client_type || '', 
        contact_person || '', contact_mobile || '', password, contact_email || '', client_logo
      ]
    );

    res.json({
      success: true,
      message: 'Client created successfully!',
      clientId: result.insertId
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateClient = async (req, res) => {
  const { id } = req.params;
  const { 
    client_name, client_phone, client_address, client_website, 
    client_state, clinet_district, client_city, client_type, 
    contact_person, contact_mobile, password, contact_email 
  } = req.body;

  let client_logo = req.body.client_logo || '';
  if (req.file) {
    client_logo = '/uploads/logos/' + req.file.filename;
  }

  try {
    await pool.query(
      `UPDATE clients SET 
        client_name = ?, client_phone = ?, client_address = ?, client_website = ?, 
        client_state = ?, clinet_district = ?, client_city = ?, client_type = ?, 
        contact_person = ?, contact_mobile = ?, password = ?, contact_email = ?, client_logo = ? 
      WHERE id = ?`,
      [
        client_name, client_phone, client_address, client_website, 
        client_state, clinet_district, client_city, client_type, 
        contact_person, contact_mobile, password, contact_email, client_logo, 
        id
      ]
    );

    res.json({ success: true, message: 'Client updated successfully!' });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const deleteClient = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM clients WHERE id = ?', [id]);
    res.json({ success: true, message: 'Client deleted successfully!' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
