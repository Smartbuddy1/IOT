import pool from '../config/db.js';

export const getUsers = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, email, mobile, role, status, created, assigned_state FROM tblusers ORDER BY id DESC');
    res.json({ success: true, users });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createUser = async (req, res) => {
  const { name, email, mobile, password, role, assigned_state } = req.body;

  if (!name || !mobile || !password || !role) {
    return res.status(400).json({ success: false, message: 'Name, Mobile, Password, and Role are required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO tblusers (name, email, mobile, password, role, status, is_logged_in, assigned_state) VALUES (?, ?, ?, ?, ?, 1, 0, ?)',
      [name, email || '', mobile, password, role, assigned_state || null]
    );

    res.json({
      success: true,
      message: 'Staff user created successfully!',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, password, role, status, assigned_state } = req.body;

  try {
    let query = 'UPDATE tblusers SET name = ?, email = ?, mobile = ?, role = ?, status = ?, assigned_state = ?';
    let params = [name, email, mobile, role, status, assigned_state || null];

    if (password) {
      query += ', password = ?';
      params.push(password);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);
    res.json({ success: true, message: 'Staff user updated successfully!' });
  } catch (error) {
    console.error('Update user error:', error);
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
