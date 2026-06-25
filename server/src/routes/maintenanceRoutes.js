import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as maintenanceController from '../controllers/maintenanceController.js';

const router = express.Router();

// Admin / Maintenance Head routes
router.post('/allocate', authenticateToken, maintenanceController.allocateMachine);
router.get('/allocations', authenticateToken, maintenanceController.getAllocations);

// Field Tech routes
router.get('/my-machines', authenticateToken, maintenanceController.getMyMachines);
router.post('/submit-log', authenticateToken, maintenanceController.submitLog);
router.post('/test-hardware', authenticateToken, maintenanceController.testHardware);

// Logs (Visible to Admin, Maintenance_Head, and Field_Tech themselves)
router.get('/logs', authenticateToken, maintenanceController.getAllLogs);
router.get('/logs/:id/photos', authenticateToken, maintenanceController.getLogPhotos);

export default router;
