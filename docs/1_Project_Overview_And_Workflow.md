# 1. Project Overview & Workflow

## Introduction
**SmartBuddy** is a modern Internet of Things (IoT) management and payment platform. It connects physical hardware machines (such as water dispensers, vending machines, etc. using SIMCom modules) to a central cloud server. It allows users to pay via QR codes (UPI) and allows administrators to monitor machine health, water levels, and revenue in real-time.

## The Core Workflow

### 1. Hardware Registration (Auto-Provisioning)
1. A new PCB/SIM module is powered on.
2. It sends an HTTP POST request or connects via MQTT to the central Server.
3. The server checks if the `machine_id` exists in the database.
4. If it doesn't exist, the system automatically registers it as an **"Unassigned Machine"**.

### 2. Admin Assignment
1. The Admin logs into the React Dashboard.
2. They navigate to the **Unassigned Machines** page.
3. They assign the raw machine to a specific **Client** and **Project**.
4. The machine is now "Active" and ready for public use.

### 3. Customer Payment Flow
1. A customer walks up to the physical machine.
2. They scan the QR code pasted on the machine using PhonePe/GPay/Paytm.
3. The QR code redirects them to the **SmartBuddy Web App** (`/pay/:machineId`).
4. The user selects an amount and clicks "Pay Now".
5. **Razorpay** handles the transaction.
6. Upon success, the React app tells the Node.js backend to record the transaction.
7. The Node.js backend sends an **MQTT Signal** to the physical machine to dispense the product (e.g., turn on the water relay).

### 4. Real-time Telemetry (Live Updates)
- The machine periodically sends its status (e.g., Water Tank Level = 80%).
- The Node.js server receives this via the `/api/iot/post` endpoint or via MQTT.
- This data is stored in the `datatest` table.
- The React Dashboard fetches this data to show live charts and alerts if maintenance is needed.

## User Roles
- **Admin**: Has full access. Can create clients, projects, manage staff, and view all transactions.
- **Operation**: Can manage machines and view reports, but cannot access sensitive administrative settings.
- **Client**: Can only view the dashboard, machines, and reports associated with their specific assigned projects.
