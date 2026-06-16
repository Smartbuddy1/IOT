import express from 'express';
import { handleHardwarePost } from '../controllers/iotController.js';

const router = express.Router();

// Public route for hardware to post data
router.post('/post', handleHardwarePost);

export default router;
