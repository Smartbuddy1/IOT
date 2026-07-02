import pool from '../config/db.js';
import Razorpay from 'razorpay';
import { publishMessage, notifyMachineBusy } from '../services/mqttService.js';
import dotenv from 'dotenv';


dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_RB30ml3UlLynEq',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '9jgUTLJZqWiz2E1AiXQVw1K9'
});

export const getTransactions = async (req, res) => {
  const { role, name } = req.user;
  const { machine_id, client_name, start_date, end_date, page = 1, limit = 50, search = '' } = req.query;

  try {
    let baseQuery = `
      FROM trans t
      LEFT JOIN machines m ON t.machin_id = m.machine_id
      WHERE 1=1
    `;
    let params = [];

    // Role-based visibility
    if (role === 'Client') {
      baseQuery += ' AND m.client_name = ?';
      params.push(name);
    } else if (client_name) {
      baseQuery += ' AND m.client_name = ?';
      params.push(client_name);
    }

    if (machine_id) {
      // Frontend might send 'SBE2T101 (Client Name)', so we extract just the ID part
      const cleanMachineId = machine_id.split(' ')[0].trim();
      baseQuery += ' AND t.machin_id = ?';
      params.push(cleanMachineId);
    }

    if (start_date) {
      baseQuery += ' AND DATE(t.date_time) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      baseQuery += ' AND DATE(t.date_time) <= ?';
      params.push(end_date);
    }

    if (search) {
      baseQuery += ' AND (t.machin_id LIKE ? OR m.client_name LIKE ? OR m.project_name LIKE ? OR t.trans_id LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    // Get total count concurrently for performance
    const countPromise = pool.query(`SELECT COUNT(*) AS total ${baseQuery}`, params);

    // Apply pagination
    const offset = (page - 1) * limit;
    const queryParams = [...params, Number(limit), Number(offset)];

    const query = `
      SELECT t.*, m.client_name, m.project_name 
      ${baseQuery}
      ORDER BY t.id DESC 
      LIMIT ? OFFSET ?
    `;
    
    const dataPromise = pool.query(query, queryParams);

    const [[[{ total }]], [transactions]] = await Promise.all([countPromise, dataPromise]);

    res.json({ 
      success: true, 
      transactions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Fetch transactions error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createRazorpayOrder = async (req, res) => {
  const { machine_id, amount } = req.body;

  if (!machine_id || !amount) {
    return res.status(400).json({ success: false, message: 'Machine ID and Amount are required' });
  }

  try {
    // 1. Check machine status
    const [machines] = await pool.query('SELECT status FROM machines WHERE machine_id = ? LIMIT 1', [machine_id]);
    if (machines.length === 0) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    const status = machines[0].status?.toLowerCase()?.trim();
    // Block payment if machine is not in a ready/active/idle state (Whitelist approach)
    if (status === 'ready' || status === 'active' || status === 'idle' || status === 'online') {
      // Machine is safe, allow order creation
    } else if (status === 'busy') {
      return res.status(400).json({ success: false, message: '❌ Machine is busy, try after some time.' });
    } else if (status === 'maintenance' || status === 'in maintenance' || status === 'under maintenance') {
      return res.status(400).json({ success: false, message: '⚠️ Machine is in maintenance. Payment cannot be processed.' });
    } else {
      return res.status(400).json({ success: false, message: '⚠️ Machine is offline or unavailable. Payment disabled.' });
    }

    // 2. Create Razorpay order
    const paisaAmount = Math.round(parseFloat(amount) * 100);
    const options = {
      amount: paisaAmount,
      currency: 'INR',
      receipt: `receipt_${machine_id}_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_RB30ml3UlLynEq',
      amount: paisaAmount,
      order_id: order.id,
      machine_id
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
};

import crypto from 'crypto';

export const saveTransaction = async (req, res) => {
  const { machine_id, amount, pay_id, order_id, razorpay_signature, mobile, status } = req.body;

  if (!machine_id || !amount || !status) {
    return res.status(400).json({ success: false, message: 'Missing transaction details' });
  }

  // Security: Verify Razorpay signature if it's a success transaction
  if (status === 'success') {
    if (!order_id || !pay_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification details missing' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || '9jgUTLJZqWiz2E1AiXQVw1K9';
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(order_id + '|' + pay_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(403).json({ success: false, message: 'Invalid payment signature. Transaction rejected.' });
    }
  }

  try {
    // 1. STRICT CHECK: Verify machine status before saving transaction or triggering door
    const [machines] = await pool.query('SELECT status FROM machines WHERE machine_id = ? LIMIT 1', [machine_id]);
    if (machines.length === 0) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }

    const currentStatus = machines[0].status?.toLowerCase()?.trim();
    if (currentStatus === 'busy') {
      return res.status(400).json({ success: false, message: '❌ Machine is currently busy. Cannot trigger door.' });
    } else if (currentStatus === 'maintenance' || currentStatus === 'in maintenance' || currentStatus === 'under maintenance') {
      return res.status(400).json({ success: false, message: '⚠️ Machine is in maintenance. Cannot trigger door.' });
    } else if (currentStatus !== 'ready' && currentStatus !== 'active' && currentStatus !== 'idle' && currentStatus !== 'online') {
      return res.status(400).json({ success: false, message: '⚠️ Machine is offline or unavailable. Cannot trigger door.' });
    }

    // 2. Insert into database
    await pool.query(
      `INSERT INTO trans (machin_id, trans_amt, pay_id, trans_id, mobile, status, date_time) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [machine_id, amount, pay_id || '', order_id || '', mobile || '9999999999', status]
    );

    // 3. If status is success, trigger MQTT activation signal and set machine status to busy
    if (status === 'success') {
      // Set machine status to 'busy' in DB immediately so new payment attempts are blocked
      await pool.query('UPDATE machines SET status = ? WHERE machine_id = ?', ['busy', machine_id]);
      notifyMachineBusy(machine_id);

      console.log(`Triggering machine activation for ${machine_id} on topic [smartbuddy]...`);
      // Publish to 'smartbuddy' topic ONLY (For NEW PCB as requested; old PCB used 'aarya')
      publishMessage('smartbuddy', machine_id);
    }

    res.json({ success: true, message: 'Transaction saved and machine triggered successfully!' });
  } catch (error) {
    console.error('Save transaction error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

