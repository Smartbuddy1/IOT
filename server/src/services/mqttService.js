import mqtt from 'mqtt';
import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

let client = null;

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
  });

  client.on('message', async (topic, message) => {
    const msgStr = message.toString();
    console.log(`📩 MQTT Message: [${topic}] -> ${msgStr}`);

    try {
      // 1. Save all logs to mqtt_messages table
      await pool.query(
        'INSERT INTO mqtt_messages (topic, message) VALUES (?, ?)',
        [topic, msgStr]
      );

      // 2. If topic is aarya (or starts with machines/), log machine ping to datatest
      if (topic === 'aarya' || topic.startsWith('machines/')) {
        await pool.query(
          'INSERT INTO datatest (topic_name, machine_id, received_time) VALUES (?, ?, NOW())',
          [topic, msgStr]
        );

        // 3. Update the live machine status in the 'machines' table
        let machineId = null;
        if (topic.startsWith('machines/')) {
          machineId = topic.split('/')[1];
        } else if (msgStr.length > 0 && msgStr.length < 20 && !msgStr.includes('{')) {
          // Fallback if payload is just a plain machine ID string
          machineId = msgStr;
        } else {
          // Attempt to parse JSON payload to find machine_id
          try {
            const parsed = JSON.parse(msgStr);
            if (parsed.machine_id) machineId = parsed.machine_id;
          } catch(e) {}
        }

        if (machineId) {
          await pool.query(
            'UPDATE machines SET status = ? WHERE machine_id = ?',
            ['active', machineId]
          );
        }
      }
    } catch (err) {
      console.error('❌ Failed to save MQTT log to DB:', err.message);
    }
  });

  client.on('error', (err) => {
    console.error('❌ MQTT Broker Connection Error:', err.message);
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
  client.publish(topic, message, { qos: 1 }, (err) => {
    if (err) {
      console.error(`❌ Failed to publish to [${topic}]:`, err.message);
    } else {
      console.log(`📤 Published to [${topic}]: ${message}`);
    }
  });
  return true;
};
