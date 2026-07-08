import express from 'express';
import { getClients, createClient, updateClient, deleteClient } from '../controllers/clientController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { uploadLogo } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getClients);
router.post('/', requireRole(['Admin']), uploadLogo.single('client_logo_file'), createClient);
router.put('/:id', requireRole(['Admin']), uploadLogo.single('client_logo_file'), updateClient);
router.delete('/:id', requireRole(['Admin']), deleteClient);

export default router;
