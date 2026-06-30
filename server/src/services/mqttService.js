import mqtt from 'mqtt';
import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

let client = null;

// In-memory cache to prevent spamming the database with UPDATE machines SET status='active'
// Every time a machine sends a message, we only update the DB once per minute.
const activeMachineCache = {};

export const initializeMqtt = () => {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883';
  const options = {
    username: process.env.MQTT_USERNAME || 'Trifrnd',
    password: process.env.MQTT_PASSWORD || 'Smart_Trifrnd',
    connectTimeout: 4000,
    reconnectPeriod: 5000,
  };

  console.log(`Connecting to MQTT Broker at ${brokerUrl}...`);
  client = mqtt.connect(brokerUrl, options);

  client.on('connect', () => {
    console.log('✅ Connected to MQTT Broker successfully!');
    // Subscribe to machine topics
    client.subscribe('machines/#', (err) => {
      if (!err) {
        console.log('📡 Subscribed to machines/#');
      } else {
        console.error('❌ Failed to subscribe to machines/#:', err.message);
      }
    });

    // Also subscribe to aarya topic
    client.subscribe('aarya', (err) => {
      if (!err) {
        console.log('📡 Subscribed to aarya');
      }
    });

    // Subscribe to smartbuddy topic (used by hardware)
    client.subscribe('smartbuddy', (err) => {
      if (!err) {
        console.log('📡 Subscribed to smartbuddy'); // Forced update for git
      }
    });
  });

  client.on('message', async (topic, message) => {
    const msgStr = message.toString();
    console.log(`📩 MQTT Message: [${topic}] -> ${msgStr}`);

    try {
      // 1. Save all logs to mqtt_messages table (Fire and forget, don't await to avoid blocking)
      pool.query(
        'INSERT INTO mqtt_messages (topic, message) VALUES (?, ?)',
        [topic, msgStr]
      ).catch(e => console.error('Failed to log MQTT message:', e.message));

      // 2. Extract machine ID and payload
      let machineId = null;
      let payload = {};

      if (topic.startsWith('machines/') || topic.startsWith('smartbuddy/devices/')) {
        machineId = topic.split('/').pop(); // Extract from topic
      }
      
      // Try parsing JSON payload or comma-separated string
      try {
        if (msgStr.includes('{')) {
          payload = JSON.parse(msgStr);
          if (payload.machine_id) machineId = payload.machine_id;
          if (payload.device_id) machineId = payload.device_id;
        } else if (msgStr.includes(',')) {
          // Hardware sends comma separated string like: SBE2T100,ready,Coin_UPI,5,En,5,5,11,11
          // Or transactions like: SBE2T101,busy,Coin,5
          const parts = msgStr.split(',');
          if (parts.length > 0) {
            machineId = parts[0].trim(); // First part is usually the Machine ID
            
            // Handle Transactions: e.g. SBE2T101,busy,Coin,5
            if (parts.length >= 4 && parts[1].trim().toLowerCase() === 'busy') {
              const paymentMode = parts[2].trim();
              const amount = parseFloat(parts[3].trim());
              
              if (!isNaN(amount) && amount > 0) {
                pool.query(
                  'INSERT INTO trans (machin_id, trans_amt, trans_mode, status, date_time) VALUES (?, ?, ?, ?, NOW())',
                  [machineId, amount, paymentMode.toLowerCase(), 'busy']
                ).then(() => {
                  console.log(`✅ Transaction saved for ${machineId}: ${amount} via ${paymentMode}`);
                }).catch(e => { 
                  console.error('❌ Failed to insert trans:', e.message); 
                });
              }
            }
          }
        } else if (msgStr.length > 0 && msgStr.length < 20) {
          machineId = msgStr.trim();
        }
      } catch(e) {
        console.log("Error parsing payload:", e.message);
      }

      // 3. Update the live machine status in the 'machines' table
      if (machineId) {
        // Validation: Machine ID must only contain letters, numbers, hyphens, or underscores
        const isValidId = /^[a-zA-Z0-9_-]+$/.test(machineId);
        if (!isValidId) {
          console.log(`⚠️ Ignored invalid machine ID (likely an AT command): ${machineId}`);
          return; // Stop processing this message
        }

        // OPTIMIZATION: Only update machines table if we haven't updated it in the last 60 seconds
        const now = Date.now();
        if (!activeMachineCache[machineId] || (now - activeMachineCache[machineId]) > 60000) {
          activeMachineCache[machineId] = now;
          pool.query(
            'UPDATE machines SET status = ? WHERE machine_id = ? AND status != ?',
            ['active', machineId, 'active']
          ).catch(e => { console.error('DB Error:', e.message); });
        }

        // 4. Update device_live_status (Sensors and Heartbeat)
        if (Object.keys(payload).length > 0) {
          // Insert or Update the live status with sensors
          const water_level = payload.water_level || payload.waterLevel || '0';
          const pir_sensor = payload.pir || payload.pir_sensor || '0';
          const door_lock = payload.door || payload.door_lock || '0';
          const pb_coin = payload.pb_coin || payload.coin || '0';
          const pb_flush = payload.pb_flush || payload.flush || '0';

          pool.query(
            `INSERT INTO device_live_status 
            (machine_id, water_level, pir_sensor, door_lock, pb_coin, pb_flush, last_updated) 
            VALUES (?, ?, ?, ?, ?, ?, NOW()) 
            ON DUPLICATE KEY UPDATE 
            water_level = VALUES(water_level), 
            pir_sensor = VALUES(pir_sensor), 
            door_lock = VALUES(door_lock), 
            pb_coin = VALUES(pb_coin), 
            pb_flush = VALUES(pb_flush), 
            last_updated = NOW()`,
            [machineId, water_level, pir_sensor, door_lock, pb_coin, pb_flush]
          ).catch(e => { console.error('DB Error:', e.message); });
        } else {
          // Just update Heartbeat
          pool.query(
            `INSERT INTO device_live_status (machine_id, last_updated) 
             VALUES (?, NOW()) 
             ON DUPLICATE KEY UPDATE last_updated = NOW()`,
            [machineId]
          ).catch(e => { console.error('DB Error:', e.message); });
        }
      }
    } catch (err) {
      console.error('❌ Failed to save MQTT log to DB:', err.message);
    }
  });

  client.on('error', (err) => {
    console.error('❌ MQTT Broker Connection Error:', err.message);
    // Do not throw the error to prevent Node.js crash
  });

  client.on('offline', () => {
    console.warn('⚠️ MQTT Broker went offline. Awaiting automatic reconnect...');
  });

  client.on('reconnect', () => {
    console.log('🔄 MQTT Broker attempting to reconnect...');
  });

  client.on('close', () => {
    console.log('⚠️ MQTT Broker connection closed');
  });
};

export const publishMessage = (topic, message) => {
  if (!client || !client.connected) {
    console.error('❌ Cannot publish: MQTT client not connected');
    return false;
  }
  client.publish(topic, message, { qos: 0 }, (err) => {
    if (err) {
      console.error(`❌ Failed to publish to [${topic}]:`, err.message);
    } else {
      console.log(`📤 Published to [${topic}]: ${message}`);
    }
  });
  return true;
};
