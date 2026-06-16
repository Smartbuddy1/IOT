import express from 'express';
import { getProjects, createProject, updateProject, deleteProject } from '../controllers/projectController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getProjects); // All roles can list, filtered in controller
router.post('/', requireRole(['Admin']), createProject);
router.put('/:id', requireRole(['Admin']), updateProject);
router.delete('/:id', requireRole(['Admin']), deleteProject);

export default router;
