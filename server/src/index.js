import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import machineRoutes from './routes/machineRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import iotRoutes from './routes/iotRoutes.js';
import { initializeMqtt } from './services/mqttService.js';
import { startHeartbeatMonitor } from './services/heartbeatService.js';
import { sanitizePayload } from './middlewares/sanitize.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS (more restrictive origin can be set in production via env)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic HTTP Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Global Rate Limiting for APIs
app.set('trust proxy', 1); // Trust first proxy for correct IP parsing in production
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // limit each IP to 3000 requests per windowMs (Increased for office IPs in production)
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', apiLimiter);



// Body parser
app.use(express.json({ limit: '10mb' })); // Limit payload size to prevent DOS
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global XSS Sanitization Middleware
app.use(sanitizePayload);

// Force CORS specifically for static files (needed for jsPDF canvas)
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Serve static assets if uploads are needed
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

app.get('/test-image', (req, res) => {
  const filePath = path.join(uploadsPath, 'logos/client_logo_1781426992530-110194436.jpg');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found exactly at: ' + filePath);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy!', uploadsPath, exists: fs.existsSync(uploadsPath) });
});

app.get('/api/seed', async (req, res) => {
  try {
    const { default: pool } = await import('./config/db.js');
    await pool.query(`INSERT IGNORE INTO clients (client_name, client_phone, client_state, clinet_district, client_city, client_type) VALUES 
      ('TechCorp', '9876543210', 'Maharashtra', 'Pune', 'Pune', 'Private'),
      ('GovInfra', '8765432109', 'Maharashtra', 'Mumbai', 'Mumbai', 'Government'),
      ('EduTrust', '7654321098', 'Karnataka', 'Bangalore', 'Bangalore', 'NGO')`);

    await pool.query(`INSERT IGNORE INTO projects (project_name, client_name, project_status, project_starts, sale_ord_no) VALUES 
      ('Pune Metro Phase 1', 'TechCorp', 'Ongoing', '2024-01-01', 'SO-101'),
      ('Mumbai Smart City', 'GovInfra', 'Completed', '2023-05-10', 'SO-102'),
      ('Digital Schools', 'EduTrust', 'Ongoing', '2024-03-15', 'SO-103')`);

    await pool.query(`INSERT IGNORE INTO machines (machine_id, status, client_name, project_name) VALUES 
      ('M-1001', 'active', 'TechCorp', 'Pune Metro Phase 1'),
      ('M-1002', 'maintenance', 'TechCorp', 'Pune Metro Phase 1'),
      ('M-1003', 'active', 'GovInfra', 'Mumbai Smart City'),
      ('M-1004', 'active', 'EduTrust', 'Digital Schools'),
      ('M-1005', 'failed', 'EduTrust', 'Digital Schools')`);

    const machines = ['M-1001', 'M-1002', 'M-1003', 'M-1004', 'M-1005'];
    for(let i=0; i<60; i++) {
      const mId = machines[Math.floor(Math.random() * machines.length)];
      const amt = Math.floor(Math.random() * 50) + 10;
      const status = Math.random() > 0.15 ? 'success' : 'failed';
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 7));
      const fd = date.toISOString().slice(0, 19).replace('T', ' ');
      await pool.query(`INSERT INTO trans (machin_id, trans_amt, status, date_time) VALUES (?, ?, ?, ?)`,
        [mId, amt, status, fd]);
    }
    res.json({success:true, message:'Seeded successfully!'});
  } catch(e) {
    res.status(500).json({error:e.message});
  }
});

// API Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/iot', iotRoutes);

// Initialize background MQTT service
try {
  initializeMqtt();
} catch (mqttError) {
  console.error('⚠️ Could not initialize MQTT broker background service:', mqttError.message);
}

// Initialize Heartbeat Monitor to auto-offline disconnected machines
startHeartbeatMonitor();

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('🔥 Global Error Handler Caught:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
