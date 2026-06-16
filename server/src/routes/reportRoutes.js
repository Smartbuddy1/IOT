import express from 'express';
import { getReportData, getReportFilters, getAnalyticsData } from '../controllers/reportController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/filters', requireRole(['Admin', 'Operation', 'Client']), getReportFilters);
router.get('/generate', requireRole(['Admin', 'Operation', 'Client']), getReportData);
router.get('/analytics', requireRole(['Admin', 'Operation', 'Client']), getAnalyticsData);

export default router;
