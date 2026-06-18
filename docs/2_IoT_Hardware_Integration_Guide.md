# 2. IoT Hardware Integration Guide

This document explains how the physical hardware (SIMCom A7672S / ESP32) communicates with the SmartBuddy MERN backend.

## Hardware to Server Communication

There are two primary ways the hardware talks to the server: **HTTP POST** and **MQTT**.

### 1. HTTP POST API (Data Ingestion)
When the machine completes a local transaction (e.g., someone inserts a coin) or when it sends a telemetry update (like water level), it makes an HTTP POST request to the server.

**Endpoint:** `POST http://<YOUR_SERVER_IP>:5005/api/iot/post`
**Headers:** `Content-Type: application/json`

**Payload for Coin/Card Transaction:**
```json
{
  "machine_id": "M-1001",
  "type": "transaction",
  "amount": 10.00,
  "payment_mode": "coin",
  "status": "success"
}
```

**Payload for Live Telemetry (Water Level):**
```json
{
  "machine_id": "M-1001",
  "type": "live_update",
  "water_level": 85
}
```

### 2. MQTT Communication (Real-time Dispensing)
When a user pays via UPI on their phone, the server needs to tell the hardware to dispense the water *instantly*. HTTP is too slow for this 2-way instant trigger, so we use **MQTT**.

1. **Broker:** A mosquito (or Aedes) broker runs on your server at port `1883`.
2. **Subscription:** As soon as the hardware powers on, it connects to `mqtt://<YOUR_SERVER_IP>:1883` and **subscribes** to a unique topic: `machine/M-1001/command`.
3. **Trigger:** When Razorpay confirms a successful payment, the Node.js backend publishes a message to `machine/M-1001/command` with the payload `DISPENSE_10` (or similar).
4. **Action:** The hardware receives this MQTT message instantly and triggers the relay to open the water valve.

### Important Note for Firmware Developers
Whenever the server IP address changes (e.g., moving to AWS), the firmware developer **must** update the hardcoded `SERVER_URL` and `MQTT_BROKER_IP` inside the C/C++ code of the SIM module before flashing it.
