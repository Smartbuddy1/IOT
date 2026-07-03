import express from 'express';
import { handleHardwarePost, getLiveStatus, resetWaterLevel } from '../controllers/iotController.js';

const router = express.Router();

// Public route for hardware to post data
router.post('/post', handleHardwarePost);

// Route for dashboard to fetch live status
router.get('/live-status', getLiveStatus);

// Route to reset water level alert after refilling
router.post('/reset-water/:machineId', resetWaterLevel);

export default router;
