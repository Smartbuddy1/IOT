import mqtt from 'mqtt';
import pool from '../config/db.js';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';

export const mqttEmitter = new EventEmitter();

dotenv.config();

let client = null;

// In-memory cache to prevent spamming the database with UPDATE machines SET status='active'
// Every time a machine sends a message, we only update the DB once per minute.
const activeMachineCache = {};

// Memory leak prevention: Clean up old inactive cache entries every 6 hours
setInterval(() => {
  const now = Date.now();
  for (const key in activeMachineCache) {
    if (now - activeMachineCache[key] > 24 * 60 * 60 * 1000) {
      delete activeMachineCache[key];
    }
  }
  for (const key in liveIOCache) {
    if (now - liveIOCache[key].timestamp > 24 * 60 * 60 * 1000) {
      delete liveIOCache[key];
    }
  }
}, 6 * 60 * 60 * 1000);

// Cache for Live IO Diagnostics
export const liveIOCache = {};

export const getLiveIOState = (machineId) => {
  return liveIOCache[machineId] || null;
};

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
      mqttEmitter.emit('message', { topic, message: msgStr });

      // 1. Save all logs to mqtt_messages table (Fire and forget, don't await to avoid blocking)
      pool.query(
        'INSERT INTO mqtt_messages (topic, message) VALUES (?, ?)',
        [topic, msgStr]
      ).catch(e => console.error('Failed to log MQTT message:', e.message));

      // 2. Extract machine ID and payload
      let machineId = null;
      let payload = {};
      let reportedStatus = null;

      if (topic.startsWith('machines/') || topic.startsWith('smartbuddy/devices/')) {
        machineId = topic.split('/').pop(); // Extract from topic
      }
      
      // Try parsing JSON payload or comma-separated string
      try {
        if (msgStr.includes('{')) {
          payload = JSON.parse(msgStr);
          if (payload.machine_id) machineId = payload.machine_id;
          if (payload.device_id) machineId = payload.device_id;
          if (payload.status || payload.state) {
            const s = String(payload.status || payload.state).trim().toLowerCase();
            if (['ready', 'busy', 'maintenance', 'active', 'idle', 'offline', 'error', 'failed', 'online', 'water_low', 'water low', 'waterlow', 'low_water', 'low water', 'water_normal', 'waternormal', 'water_ok', 'waterok', 'water_full', 'waterfull', 'normal', 'wl', 'low', 'empty'].includes(s)) {
              reportedStatus = (s === 'active' || s === 'idle' || s === 'online') ? 'ready' : (s === 'waterlow' || s === 'water low' || s === 'low_water' || s === 'low water' || s === 'wl' || s === 'low' || s === 'empty') ? 'water_low' : (s === 'water_normal' || s === 'waternormal' || s === 'water_ok' || s === 'waterok' || s === 'water_full' || s === 'waterfull' || s === 'normal') ? 'water_normal' : s;
            }
          }
        } else if (msgStr.includes(',')) {
          // Hardware sends comma separated string like: SBE2T100,ready,Coin_UPI,5,En,5,5,11,11
          // Or transactions like: SBE2T101,busy,Coin,5
          const parts = msgStr.split(',');
          if (parts.length > 0) {
            machineId = parts[0].trim(); // First part is usually the Machine ID
            
            // Handle IO_STAT payload
            if (parts.length > 1 && parts[1].trim() === 'IO_STAT') {
              if (parts.length >= 22) {
                liveIOCache[machineId] = {
                  timestamp: Date.now(),
                  states: {
                    // Inputs
                    'PB Coin': parts[2] === '1',
                    'PB Flush': parts[3] === '1',
                    'RFID Push Button': parts[4] === '1', // PB-RFID
                    'Emergency Internal Push Button': parts[5] === '1', // PB-EXTRA
                    'Door Limit Switch': parts[6] === '1', // LIMIT-SWITCH
                    'Water Level Sensor': parts[7] === '1', // WLL-IN
                    'Coin Acceptor': parts[8] === '1', // EXT-IN1
                    'Emergency External Push Button': parts[9] === '1', // EXT-IN2
                    'PIR Sensor': parts[10] === '1', // PIR
                    
                    // Outputs
                    'Strike Lock': parts[11] === '1',
                    'Buzzer': parts[12] === '1',
                    'Coin Acceptor Control': parts[13] === '1',
                    'Flush Valve': parts[14] === '1',
                    'Sprinkler Valve': parts[15] === '1',
                    'Floor Valve': parts[16] === '1',
                    'Motor (0.5 HP)': parts[17] === '1',
                    'Red Indicator': parts[18] === '1',
                    'Green Indicator': parts[19] === '1',
                    'Exhaust Fan': parts[20] === '1',
                    'Electronic Lighting Module': parts[21] === '1'
                  }
                };
              }
              return; // IO_STAT doesn't contain status keywords, we can skip further comma-separated parsing
            }
            
            // Handle COIN_RECV payload
            if (parts.length >= 3 && parts[1].trim() === 'COIN_RECV') {
              const coinValue = parseInt(parts[2].trim(), 10) || 0;
              if (!liveIOCache[machineId]) {
                liveIOCache[machineId] = { timestamp: Date.now(), states: {}, coinsReceived: 0 };
              }
              // Accumulate coins received during this diagnostic session
              liveIOCache[machineId].coinsReceived = (liveIOCache[machineId].coinsReceived || 0) + coinValue;
              liveIOCache[machineId].timestamp = Date.now();
              return; // Skip further parsing
            }

            // Scan all parts of the comma-separated string for status and water level keywords
            for (let i = 1; i < parts.length; i++) {
              const s = parts[i].trim().toLowerCase();
              if (['ready', 'busy', 'maintenance', 'active', 'idle', 'offline', 'error', 'failed', 'online', 'water_low', 'water low', 'waterlow', 'low_water', 'low water', 'water_normal', 'waternormal', 'water_ok', 'waterok', 'water_full', 'waterfull', 'normal', 'wl', 'low', 'empty'].includes(s)) {
                if (s === 'waterlow' || s === 'water low' || s === 'low_water' || s === 'low water' || s === 'wl' || s === 'low' || s === 'empty') {
                  reportedStatus = 'water_low';
                  break; // Prioritize water_low alert if present anywhere in the message!
                } else if (s === 'water_normal' || s === 'waternormal' || s === 'water_ok' || s === 'waterok' || s === 'water_full' || s === 'waterfull' || s === 'normal') {
                  reportedStatus = 'water_normal';
                } else if (!reportedStatus) {
                  reportedStatus = (s === 'active' || s === 'idle' || s === 'online') ? 'ready' : s;
                }
              }
            }
            
            // Handle Transactions: e.g. SBE2T101,busy,Coin,5 or SBE2T101,busy,Button
            if (parts.length >= 3 && parts[1].trim().toLowerCase() === 'busy') {
              const paymentMode = parts[2].trim();
              const isFree = paymentMode.toLowerCase() === 'button' || paymentMode.toLowerCase() === 'free';
              const amount = parts.length >= 4 ? parseFloat(parts[3].trim()) : 0;
              
              if (isFree || (!isNaN(amount) && amount > 0)) {
                const transAmt = isFree ? 0 : amount;
                const transMode = isFree ? 'free' : paymentMode.toLowerCase();
                const payId = isFree ? 'free' : paymentMode.toLowerCase();
                
                pool.query(
                  'INSERT INTO trans (machin_id, trans_amt, trans_mode, pay_id, status, date_time) VALUES (?, ?, ?, ?, ?, NOW())',
                  [machineId, transAmt, transMode, payId, 'success']
                ).then(() => {
                  console.log(`✅ Transaction saved for ${machineId}: ${transAmt} via ${transMode}`);
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

        // Auto-register machine ONLY if not seen before and not in DB (prevents duplicates when machine_id lacks UNIQUE index)
        if (!activeMachineCache[machineId]) {
          activeMachineCache[machineId] = Date.now(); // Synchronous lock to prevent concurrent race conditions
          pool.query("SELECT id FROM machines WHERE machine_id = ? LIMIT 1", [machineId]).then(([rows]) => {
            if (rows && rows.length === 0) {
              pool.query("INSERT INTO machines (machine_id, status) VALUES (?, 'ready')", [machineId]).catch(() => {});
            }
          }).catch(() => {});
        }

        // ALWAYS record heartbeat timestamp in device_live_status whenever ANY MQTT message arrives from this machine!
        pool.query(
          `UPDATE device_live_status SET last_updated = NOW() WHERE machine_id = ?`,
          [machineId]
        ).then(([result]) => {
          if (result && result.affectedRows === 0) {
            pool.query(`INSERT INTO device_live_status (machine_id, last_updated) VALUES (?, NOW())`, [machineId]).catch(() => {});
          }
        }).catch(() => {});

        // OPTIMIZATION: Update DB immediately when status changes, without delay or heavy throttling
        const now = Date.now();
        if (reportedStatus) {
          activeMachineCache[machineId] = now;
          if (reportedStatus === 'water_low') {
            pool.query("UPDATE machines SET status = 'water_low' WHERE machine_id = ?", [machineId]).catch(e => { console.error('DB Error:', e.message); });
            pool.query(
              `UPDATE device_live_status SET water_level = 'LOW', last_updated = NOW() WHERE machine_id = ?`,
              [machineId]
            ).then(([result]) => {
              if (result && result.affectedRows === 0) {
                pool.query(`INSERT INTO device_live_status (machine_id, water_level, last_updated) VALUES (?, 'LOW', NOW())`, [machineId]).catch(()=>{});
              }
            }).catch(e => { console.error('DB Error:', e.message); });
          } else if (reportedStatus === 'water_normal') {
            pool.query("UPDATE machines SET status = 'ready' WHERE machine_id = ?", [machineId]).catch(e => { console.error('DB Error:', e.message); });
            pool.query(
              `UPDATE device_live_status SET water_level = 'NORMAL', last_updated = NOW() WHERE machine_id = ?`,
              [machineId]
            ).then(([result]) => {
              if (result && result.affectedRows === 0) {
                pool.query(`INSERT INTO device_live_status (machine_id, water_level, last_updated) VALUES (?, 'NORMAL', NOW())`, [machineId]).catch(()=>{});
              }
            }).catch(e => { console.error('DB Error:', e.message); });
          } else {
            // For regular heartbeats (ready/busy/maintenance), do NOT overwrite if machine is currently in water_low alert!
            pool.query(
              "UPDATE machines SET status = ? WHERE machine_id = ? AND status != 'water_low'",
              [reportedStatus, machineId]
            ).catch(e => { console.error('DB Error:', e.message); });
          }
        } else if (!activeMachineCache[machineId] || (now - activeMachineCache[machineId]) > 5000) {
          activeMachineCache[machineId] = now;
          // If no specific status was reported in this message, mark ready if it was previously offline or failed
          pool.query(
            "UPDATE machines SET status = 'ready' WHERE machine_id = ? AND status IN ('offline', 'failed', 'inactive')",
            [machineId]
          ).catch(e => { console.error('DB Error:', e.message); });
        }

        // 4. Update device_live_status (Sensors and Heartbeat)
        if (Object.keys(payload).length > 0) {
          // Insert or Update the live status with sensors
          // Preserve explicit LOW or NORMAL alert status if reportedStatus was just set!
          const water_level = reportedStatus === 'water_low' ? 'LOW' : reportedStatus === 'water_normal' ? 'NORMAL' : (payload.water_level || payload.waterLevel || '0');
          const pir_sensor = payload.pir || payload.pir_sensor || '0';
          const door_lock = payload.door || payload.door_lock || '0';
          const pb_coin = payload.pb_coin || payload.coin || '0';
          const pb_flush = payload.pb_flush || payload.flush || '0';

          pool.query(
            `UPDATE device_live_status SET 
            water_level = ?, 
            pir_sensor = ?, 
            door_lock = ?, 
            pb_coin = ?, 
            pb_flush = ?, 
            last_updated = NOW() 
            WHERE machine_id = ?`,
            [water_level, pir_sensor, door_lock, pb_coin, pb_flush, machineId]
          ).then(([result]) => {
            if (result && result.affectedRows === 0) {
              pool.query(
                `INSERT INTO device_live_status 
                (machine_id, water_level, pir_sensor, door_lock, pb_coin, pb_flush, last_updated) 
                VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [machineId, water_level, pir_sensor, door_lock, pb_coin, pb_flush]
              ).catch(()=>{});
            }
          }).catch(e => { console.error('DB Error:', e.message); });
        } else {
          // Just update Heartbeat
          pool.query(
             `UPDATE device_live_status SET last_updated = NOW() WHERE machine_id = ?`,
            [machineId]
          ).then(([result]) => {
            if (result && result.affectedRows === 0) {
              pool.query(`INSERT INTO device_live_status (machine_id, last_updated) VALUES (?, NOW())`, [machineId]).catch(()=>{});
            }
          }).catch(e => { console.error('DB Error:', e.message); });
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

export const notifyMachineBusy = (machineId) => {
  if (machineId) {
    activeMachineCache[machineId] = Date.now();
  }
};

