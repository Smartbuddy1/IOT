import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

export const getClients = async (req, res) => {
  try {
    let query = 'SELECT * FROM clients';
    let params = [];
    let assignedClient = req.user.assigned_client;
    let assignedState = req.user.assigned_state;

    const userRole = (req.user.role || '').toString().trim().toLowerCase();

    if (userRole === 'field_tech' && !assignedClient) {
      const [[tech]] = await pool.query('SELECT assigned_client, assigned_state FROM tblusers WHERE id = ?', [req.user.id]);
      if (tech) {
        assignedClient = tech.assigned_client;
        assignedState = tech.assigned_state || assignedState;
      }
    }

    if (userRole === 'field_tech') {
      if (assignedClient) {
        query += ' WHERE client_name = ?';
        params.push(assignedClient);
      } else if (assignedState) {
        query += ' WHERE client_state = ?';
        params.push(assignedState);
      } else {
        query += ' WHERE 1=0'; // Show no clients if unassigned
      }
    } else if (userRole === 'maintenance_head' && req.user.assigned_state) {
      query += ' WHERE client_state = ?';
      params.push(req.user.assigned_state);
    } else if (userRole === 'client') {
      query += ' WHERE id = ? OR client_name = ?';
      params.push(req.user.id, req.user.name || '');
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
    client_logo = req.file.location || req.file.url || (req.file.key ? `https://${process.env.S3_BUCKET_NAME || 'smartbuddyiot'}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${req.file.key}` : `/uploads/logos/${req.file.filename}`);
  }

  if (!client_name || !client_phone || !password || !client_logo) {
    return res.status(400).json({ success: false, message: 'Client Name, Phone, Password, and Logo are compulsory' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Security Alert: Password must be at least 8 characters long for enterprise security!' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      `INSERT INTO clients 
      (client_name, client_phone, client_address, client_website, client_state, clinet_district, client_city, client_type, contact_person, contact_mobile, password, contact_email, client_logo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client_name, client_phone, client_address || '', client_website || '', 
        client_state || '', clinet_district || '', client_city || '', client_type || '', 
        contact_person || '', contact_mobile || '', hashedPassword, contact_email || '', client_logo
      ]
    );

    res.json({
      success: true,
      message: 'Client created successfully!',
      clientId: result.insertId
    });
  } catch (error) {
    console.error('Create client error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'A client with this phone number or email already exists!' });
    }
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

  try {
    // Determine final logo: use new upload if provided, else keep existing from DB
    let client_logo;
    if (req.file) {
      client_logo = req.file.location || req.file.url || (req.file.key ? `https://${process.env.S3_BUCKET_NAME || 'smartbuddyiot'}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${req.file.key}` : `/uploads/logos/${req.file.filename}`);
    } else {
      // Fetch existing logo URL from DB to avoid overwriting with empty string
      const [rows] = await pool.query('SELECT client_logo FROM clients WHERE id = ?', [id]);
      client_logo = (rows.length > 0 && rows[0].client_logo) ? rows[0].client_logo : '';
    }

    let finalPassword = password;
    // If password exists and is NOT already a bcrypt hash, hash it
    if (password && !password.startsWith('$2')) {
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Security Alert: Password must be at least 8 characters long for enterprise security!' });
      }
      const salt = await bcrypt.genSalt(10);
      finalPassword = await bcrypt.hash(password, salt);
    }
    // If no password provided during edit, keep the existing password
    if (!password) {
      const [rows] = await pool.query('SELECT password FROM clients WHERE id = ?', [id]);
      finalPassword = rows.length > 0 ? rows[0].password : '';
    }

    await pool.query(
      `UPDATE clients SET 
        client_name = ?, client_phone = ?, client_address = ?, client_website = ?, 
        client_state = ?, clinet_district = ?, client_city = ?, client_type = ?, 
        contact_person = ?, contact_mobile = ?, password = ?, contact_email = ?, client_logo = ? 
      WHERE id = ?`,
      [
        client_name, client_phone, client_address || '', client_website || '', 
        client_state || '', clinet_district || '', client_city || '', client_type || '', 
        contact_person || '', contact_mobile || '', finalPassword, contact_email || '', client_logo, 
        id
      ]
    );

    res.json({ success: true, message: 'Client updated successfully!' });
  } catch (error) {
    console.error('Update client error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'A client with this phone number or email already exists!' });
    }
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
