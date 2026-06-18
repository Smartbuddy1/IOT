# 5. AWS Deployment & Maintenance Guide

This document covers how to host the SmartBuddy MERN project on a production server (like AWS EC2 Ubuntu) and how to maintain it.

## 1. Initial Server Setup
When you get a new Ubuntu server, you must install the core dependencies:
- **Node.js** (v18 or v20)
- **Nginx** (To route internet traffic)
- **MySQL** (To store your data)
- **PM2** (A process manager that keeps Node.js running if it crashes)

**Security Groups**: In the AWS Console, make sure you open ports:
- `80` (HTTP web access)
- `443` (HTTPS)
- `5005` (For your Node API if accessed directly)
- `1883` (For your MQTT Broker)

## 2. Deploying the Backend
The backend must run continuously. We use `pm2` for this.
1. Put the code in `/home/ubuntu/SmartBuddy28May/server`
2. Run `npm install`
3. Create your `.env` file with your database credentials.
4. Run `pm2 start src/index.js --name "smartbuddy-api"`
5. Run `pm2 save` to ensure it starts automatically if the server reboots.

### Viewing Logs
If something goes wrong (e.g., payments fail), check the backend logs:
```bash
pm2 logs smartbuddy-api
```

## 3. Deploying the Frontend
The React frontend is just a set of static files once built.
1. Go to `/home/ubuntu/SmartBuddy28May/frontend`
2. Ensure your `.env` file points to your public server IP:
   `VITE_API_BASE_URL=http://<YOUR_AWS_IP>:5005/api`
3. Run `npm install`
4. Run `npm run build`
5. Copy the generated `dist/` folder to `/var/www/html/` where Nginx serves it.

## 4. Database Maintenance
To back up your database, SSH into the server and run:
```bash
mysqldump -u root -p smart_iot > smart_iot_backup.sql
```
To restore a backup:
```bash
mysql -u root -p smart_iot < smart_iot_backup.sql
```

## 5. Pushing New Updates
When you make changes to the code locally on your laptop:
1. `git push` to GitHub.
2. SSH into your AWS Server.
3. Run `git pull origin main`.
4. If you changed the backend: `pm2 restart smartbuddy-api`.
5. If you changed the frontend: Run `npm run build` again and copy the new files to `/var/www/html/`.
