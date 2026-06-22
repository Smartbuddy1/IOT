import express from 'express';
import { handleHardwarePost, getLiveStatus } from '../controllers/iotController.js';

const router = express.Router();

// Public route for hardware to post data
router.post('/post', handleHardwarePost);

// Route for dashboard to fetch live status
router.get('/live-status', getLiveStatus);

export default router;
