import pool from '../config/db.js';

export const getProjects = async (req, res) => {
  const { role, name } = req.user;

  try {
    let query = 'SELECT * FROM projects';
    let params = [];

    if (role === 'Client') {
      // Find projects where client_name matches OR where the project is assigned to a machine owned by the client
      query += ' WHERE client_name = ? OR project_name IN (SELECT DISTINCT project_name FROM machines WHERE client_name = ? AND project_name IS NOT NULL)';
      params.push(name, name);
    } else if (role === 'Operation' && req.user.assigned_state) {
      query += ' WHERE state = ?';
      params.push(req.user.assigned_state);
    }

    query += ' ORDER BY id DESC';

    const [projects] = await pool.query(query, params);
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Fetch projects error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createProject = async (req, res) => {
  const { project_name, client_name, project_starts, project_end, work_ord_no, sale_ord_no, project_status, state, remark } = req.body;

  if (!project_name) {
    return res.status(400).json({ success: false, message: 'Project Name is required' });
  }

  const pStart = project_starts ? project_starts : null;
  const pEnd = project_end ? project_end : null;

  try {
    const [result] = await pool.query(
      'INSERT INTO projects (project_name, client_name, project_starts, project_end, work_ord_no, sale_ord_no, project_status, state, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [project_name, client_name || null, pStart, pEnd, work_ord_no || '', sale_ord_no || '', project_status || 'Ongoing', state || null, remark || '']
    );

    res.json({
      success: true,
      message: 'Project created successfully!',
      projectId: result.insertId
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateProject = async (req, res) => {
  const { id } = req.params;
  const { project_name, client_name, project_starts, project_end, work_ord_no, sale_ord_no, project_status, state, remark } = req.body;

  const pStart = project_starts ? project_starts : null;
  const pEnd = project_end ? project_end : null;

  try {
    await pool.query(
      'UPDATE projects SET project_name = ?, client_name = ?, project_starts = ?, project_end = ?, work_ord_no = ?, sale_ord_no = ?, project_status = ?, state = ?, remark = ? WHERE id = ?',
      [project_name, client_name || null, pStart, pEnd, work_ord_no || '', sale_ord_no || '', project_status || 'Ongoing', state || null, remark || '', id]
    );

    res.json({ success: true, message: 'Project updated successfully!' });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const deleteProject = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ success: true, message: 'Project deleted successfully!' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
