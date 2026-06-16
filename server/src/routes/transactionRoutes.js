import express from 'express';
import { getTransactions, createRazorpayOrder, saveTransaction } from '../controllers/transactionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Publicly available routes for payment actions (QR scans, Razorpay handlers)
router.post('/pay', createRazorpayOrder);
router.post('/save', saveTransaction);

// Log query routes are protected
router.get('/', authenticateToken, getTransactions);

export default router;
