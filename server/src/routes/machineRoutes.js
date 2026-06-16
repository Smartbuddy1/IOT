import express from 'express';
import { getMachines, getMachineById, createMachine, updateMachine, deleteMachine, getUnassignedMachines } from '../controllers/machineController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Allow public access to GET by ID (needed for QR scanning without log in)
router.get('/unassigned/list', authenticateToken, requireRole(['Admin', 'Operation']), getUnassignedMachines);
router.get('/:id', getMachineById);

router.use(authenticateToken);

router.get('/', getMachines); // All roles can list, filtered in controller
router.post('/', requireRole(['Admin', 'Operation']), createMachine);
router.put('/:id', requireRole(['Admin', 'Operation']), updateMachine);
router.delete('/:id', requireRole(['Admin']), deleteMachine);

export default router;
