import pool from '../config/db.js';
import Razorpay from 'razorpay';
import { publishMessage } from '../services/mqttService.js';
import dotenv from 'dotenv';

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_RB30ml3UlLynEq',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '9jgUTLJZqWiz2E1AiXQVw1K9'
});

export const getTransactions = async (req, res) => {
  const { role, name } = req.user;
  const { machine_id, client_name, start_date, end_date } = req.query;

  try {
    let query = `
      SELECT t.*, m.client_name, m.project_name 
      FROM trans t
      LEFT JOIN machines m ON t.machin_id = m.machine_id
      WHERE 1=1
    `;
    let params = [];

    // Role-based visibility
    if (role === 'Client') {
      query += ' AND m.client_name = ?';
      params.push(name);
    } else if (client_name) {
      query += ' AND m.client_name = ?';
      params.push(client_name);
    }

    if (machine_id) {
      query += ' AND t.machin_id = ?';
      params.push(machine_id);
    }

    if (start_date) {
      query += ' AND DATE(t.date_time) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(t.date_time) <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY t.id DESC';

    const [transactions] = await pool.query(query, params);
    res.json({ success: true, transactions });
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
    if (status === 'ready' || status === 'active' || status === 'idle') {
      // Machine is safe, allow order creation
    } else if (status === 'busy') {
      return res.status(400).json({ success: false, message: '❌ Machine is busy, please wait for some time.' });
    } else {
      // Blocks 'failed', 'maintenance', 'offline', and ANY unknown status!
      return res.status(400).json({ success: false, message: '⚠️ Machine is under maintenance or offline. Payment disabled.' });
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
    // 1. Insert into database
    await pool.query(
      `INSERT INTO trans (machin_id, trans_amt, pay_id, trans_id, mobile, status, date_time) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [machine_id, amount, pay_id || '', order_id || '', mobile || '9999999999', status]
    );

    // 2. If status is success, trigger MQTT activation signal
    if (status === 'success') {
      // Publish to broker: "start" trigger to activate machine relay
      // Note: legacy published the raw machine_id string to the "aarya" topic.
      publishMessage('aarya', machine_id);
    }

    res.json({ success: true, message: 'Transaction saved and machine triggered successfully!' });
  } catch (error) {
    console.error('Save transaction error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
