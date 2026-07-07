import pool from '../config/db.js';
import bcrypt from 'bcrypt';

export const getUsers = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, mobile, role, status, created, assigned_state, assigned_client, assigned_project FROM tblusers ORDER BY id DESC');
    res.json({ success: true, users });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createUser = async (req, res) => {
  const { name, email, mobile, password, role, assigned_state, assigned_client, assigned_project } = req.body;

  if (!name || !mobile || !password || !role) {
    return res.status(400).json({ success: false, message: 'Name, Mobile, Password, and Role are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Security Alert: Password must be at least 8 characters long for enterprise security!' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO tblusers (name, email, mobile, password, role, status, is_logged_in, assigned_state, assigned_client, assigned_project) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?)',
      [name, email || '', mobile, hashedPassword, role, assigned_state || null, assigned_client || null, assigned_project || null]
    );

    res.json({
      success: true,
      message: 'Staff user created successfully!',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'A user with this mobile number or email already exists!' });
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, password, role, status, assigned_state, assigned_client, assigned_project } = req.body;

  try {
    let query = 'UPDATE tblusers SET name = ?, email = ?, mobile = ?, role = ?, status = ?, assigned_state = ?, assigned_client = ?, assigned_project = ?';
    let params = [name, email, mobile, role, status, assigned_state || null, assigned_client || null, assigned_project || null];

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Security Alert: Password must be at least 8 characters long for enterprise security!' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);
    res.json({ success: true, message: 'Staff user updated successfully!' });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'A user with this mobile number or email already exists!' });
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM tblusers WHERE id = ?', [id]);
    res.json({ success: true, message: 'Staff user deleted successfully!' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
