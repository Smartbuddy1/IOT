import express from 'express';
import { handleHardwarePost, getLiveStatus, resetWaterLevel } from '../controllers/iotController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public route for hardware to post data
router.post('/post', handleHardwarePost);

// Route for dashboard to fetch live status (authenticated & filtered by client/role)
router.get('/live-status', authenticateToken, getLiveStatus);

// Route to reset water level alert after refilling (authenticated)
router.post('/reset-water/:machineId', authenticateToken, resetWaterLevel);

export default router;
