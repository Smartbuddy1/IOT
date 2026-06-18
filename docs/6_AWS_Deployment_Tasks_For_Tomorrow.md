# 6. Tomorrow's Task List: AWS Deployment & MQTT Setup

This is the step-by-step checklist of tasks to execute tomorrow to deploy the SmartBuddy project live on AWS.

## Task 1: AWS EC2 Instance Creation
- [ ] Log in to the AWS Management Console.
- [ ] Launch a new **EC2 Instance** (Select Ubuntu 24.04 LTS).
- [ ] Configure **Security Group Inbound Rules** to open the following ports:
  - `22` (SSH - for terminal access)
  - `80` (HTTP - for React frontend)
  - `443` (HTTPS - for SSL)
  - `5005` (Custom TCP - for Node.js Backend API)
  - `1883` (Custom TCP - for MQTT Broker)
- [ ] Generate and download the `.pem` key file to securely log into the server.
- [ ] Allocate an **Elastic IP** (optional but recommended) so the server IP never changes.

## Task 2: Install Required Software on AWS
- [ ] Connect to the AWS server via SSH.
- [ ] Update packages: `sudo apt update && sudo apt upgrade -y`
- [ ] Install Node.js (v20): `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`
- [ ] Install Nginx: `sudo apt install nginx -y`
- [ ] Install PM2 globally: `sudo npm install -g pm2`

## Task 3: Setup Private MQTT Broker (Mosquitto)
- [ ] Install Mosquitto: `sudo apt install mosquitto mosquitto-clients -y`
- [ ] Enable Mosquitto to start on boot: `sudo systemctl enable mosquitto`
- [ ] Create a password file for authentication: `sudo mosquitto_passwd -c /etc/mosquitto/passwd Trifrnd` (It will ask to type the password: `Smart_Trifrnd`).
- [ ] Create a configuration file `sudo nano /etc/mosquitto/conf.d/default.conf` and add:
  ```
  allow_anonymous false
  password_file /etc/mosquitto/passwd
  listener 1883
  ```
- [ ] Restart the Mosquitto service: `sudo systemctl restart mosquitto`

## Task 4: Setup MySQL Database
- [ ] Install MySQL: `sudo apt install mysql-server -y`
- [ ] Secure MySQL: `sudo mysql_secure_installation`
- [ ] Log into MySQL: `sudo mysql`
- [ ] Create database: `CREATE DATABASE smart_iot;`
- [ ] Import your local `smart.sql` backup to the AWS server.

## Task 5: Deploy SmartBuddy Code
- [ ] Clone the code: `git clone https://github.com/Smartbuddy1/IOT.git`
- [ ] **Backend Setup:**
  - `cd IOT/server && npm install`
  - Create `.env` file with MySQL credentials and Razorpay keys.
  - Start API: `pm2 start src/index.js --name "smartbuddy-api"`
  - Save PM2: `pm2 save && pm2 startup`
- [ ] **Frontend Setup (VERCEL):**
  - Go to vercel.com and import your GitHub repository.
  - Set the root directory to `frontend`.
  - Add Environment Variable: `VITE_API_BASE_URL=http://<AWS_PUBLIC_IP>:5005/api`
  - Deploy!

## Task 6: Hardware Team Handover
- [ ] Share the **AWS Public IP** with the hardware developer.
- [ ] Instruct them to update the C/C++ firmware with the new IP for both HTTP POST and MQTT Broker connections.
- [ ] Test a live transaction on a physical machine!
