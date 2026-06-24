import express from 'express';
import { getMachines, getMachineById, createMachine, updateMachine, deleteMachine, getUnassignedMachines } from '../controllers/machineController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Allow public access to GET by ID (needed for QR scanning without log in)
router.get('/unassigned/list', authenticateToken, requireRole(['Admin', 'Maintenance_Head']), getUnassignedMachines);
router.get('/:id', getMachineById);

router.use(authenticateToken);

router.get('/', getMachines); // All roles can list, filtered in controller
router.post('/', requireRole(['Admin', 'Maintenance_Head']), createMachine);
router.put('/:id', requireRole(['Admin', 'Maintenance_Head']), updateMachine);
router.delete('/:id', requireRole(['Admin']), deleteMachine);

export default router;
