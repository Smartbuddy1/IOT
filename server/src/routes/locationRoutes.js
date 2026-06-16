import express from 'express';
import { getStates, getDistricts, getCities } from '../controllers/locationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/states', getStates);
router.get('/districts/:state', getDistricts);
router.get('/cities/:district', getCities);

export default router;
