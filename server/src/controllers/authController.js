import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const login = async (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return res.status(400).json({ success: false, message: 'Mobile number and password are required' });
  }

  try {
    // 1. Check in tblusers table
    const [users] = await pool.query(
      'SELECT id, mobile, role, password, assigned_state FROM tblusers WHERE mobile = ? AND status = 1 LIMIT 1',
      [mobile]
    );

    let authenticatedUser = null;
    if (users.length === 1) {
      const dbUser = users[0];
      let isMatch = false;
      if (dbUser.password && dbUser.password.startsWith('$2')) {
        try {
          const bcrypt = await import('bcryptjs');
          isMatch = await bcrypt.default.compare(password, dbUser.password);
        } catch (err) {
          console.error('Bcrypt compare error for user:', err);
        }
      } else {
        isMatch = (dbUser.password === password);
      }

      if (isMatch) {
        authenticatedUser = dbUser;
      }
    }

    if (authenticatedUser) {
      const user = authenticatedUser;

      // Update login status (try-catch in case column is missing)
      try {
        await pool.query('UPDATE tblusers SET is_logged_in = 1 WHERE mobile = ?', [mobile]);
      } catch (e) { console.log("is_logged_in update failed:", e.message); }

      // Insert userlog
      const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
      try {
        await pool.query(
          'INSERT INTO userlog (username, Role, userip, loginTime, status) VALUES (?, ?, ?, NOW(), 1)',
          [user.mobile, user.role, ip]
        );
      } catch (e) { console.log("userlog insert failed:", e.message); }

      // Generate JWT Token
      const token = jwt.sign(
        { id: user.id, mobile: user.mobile, role: user.role, assigned_state: user.assigned_state },
        process.env.JWT_SECRET || 'smartbuddy_super_secret_jwt_key_2026',
        { expiresIn: '12h' }
      );

      return res.json({
        success: true,
        message: 'Logged in successfully as staff',
        token,
        user: {
          id: user.id,
          name: user.mobile, // fallback
          mobile: user.mobile,
          role: user.role,
          assigned_state: user.assigned_state
        }
      });
    }

    // 2. Check in clients table
    const [clients] = await pool.query(
      'SELECT id, client_name, contact_mobile, password, client_logo FROM clients WHERE contact_mobile = ? LIMIT 1',
      [mobile]
    );

    let authenticatedClient = null;
    if (clients.length === 1) {
      const dbClient = clients[0];
      let isMatch = false;
      if (dbClient.password && dbClient.password.startsWith('$2')) {
        try {
          const bcrypt = await import('bcryptjs');
          isMatch = await bcrypt.default.compare(password, dbClient.password);
        } catch (err) {
          console.error('Bcrypt compare error for client:', err);
        }
      } else {
        isMatch = (dbClient.password === password);
      }

      if (isMatch) {
        authenticatedClient = dbClient;
      }
    }

    if (authenticatedClient) {
      const client = authenticatedClient;

      // Insert userlog
      const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
      try {
        await pool.query(
          'INSERT INTO userlog (username, Role, userip, loginTime, status) VALUES (?, ?, ?, NOW(), 1)',
          [client.contact_mobile, 'Client', ip]
        );
      } catch (e) { console.log("userlog insert failed:", e.message); }

      // Generate JWT Token
      const token = jwt.sign(
        { id: client.id, name: client.client_name, mobile: client.contact_mobile, role: 'Client', logo: client.client_logo },
        process.env.JWT_SECRET || 'smartbuddy_super_secret_jwt_key_2026',
        { expiresIn: '12h' }
      );

      return res.json({
        success: true,
        message: 'Logged in successfully as client',
        token,
        user: {
          id: client.id,
          name: client.client_name,
          mobile: client.contact_mobile,
          role: 'Client',
          logo: client.client_logo
        }
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const logout = async (req, res) => {
  const { mobile, role } = req.user;

  try {
    if (role !== 'Client') {
      await pool.query('UPDATE tblusers SET is_logged_in = 0 WHERE mobile = ?', [mobile]);
    }
    
    // Update userlog logout time
    await pool.query(
      'UPDATE userlog SET logout = NOW() WHERE username = ? ORDER BY id DESC LIMIT 1',
      [mobile]
    );

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};
