import pool from '../config/db.js';

export const getProjects = async (req, res) => {
  const { role, name } = req.user;

  try {
    let query = `
      SELECT p.id, p.project_name, p.project_starts, p.project_end, p.work_ord_no, p.sale_ord_no, p.project_status, p.state, p.remark,
             COALESCE(
               p.client_name, 
               (SELECT client_name FROM machines m WHERE m.project_name = p.project_name AND m.client_name IS NOT NULL AND m.client_name != '' LIMIT 1)
             ) AS client_name
      FROM projects p
    `;
    let params = [];

    const userRole = (role || '').toString().trim().toLowerCase();

    let assignedProject = req.user.assigned_project;
    if (userRole === 'field_tech' && !assignedProject) {
      const [[tech]] = await pool.query('SELECT assigned_project FROM tblusers WHERE id = ?', [req.user.id]);
      if (tech) {
        assignedProject = tech.assigned_project;
      }
    }

    if (userRole === 'client') {
      // Find projects where client_name matches OR where the project is assigned to a machine owned by the client
      query += ' WHERE p.client_name = ? OR p.project_name IN (SELECT DISTINCT project_name FROM machines WHERE client_name = ? AND project_name IS NOT NULL)';
      params.push(name, name);
    } else if (userRole === 'field_tech') {
      if (assignedProject) {
        query += ' WHERE p.project_name = ?';
        params.push(assignedProject);
      } else {
        query += ' WHERE 1=0';
      }
    } else if (userRole === 'maintenance_head' && req.user.assigned_state) {
      query += ' WHERE p.state = ?';
      params.push(req.user.assigned_state);
    }

    query += ' ORDER BY p.id DESC';

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
