# 8. Final Setup: Backend, Nginx, and Domain

Since your AWS EC2 instance is successfully built and your backend code is downloaded securely, follow this final guide to make your API live on the internet with a domain name and SSL.

---

## Phase 1: Start the Backend (PM2)
Before routing traffic, we need to ensure the Node.js API is running continuously in the background.

1. **Create your `.env` file:**
   Navigate to your backend folder and create the environment file:
   ```bash
   cd ~/IOT/server
   nano .env
   ```
   *Paste your local `.env` variables (Database credentials, Razorpay keys, MQTT details). Press `Ctrl+X`, `Y`, and `Enter` to save.*

2. **Start the API using PM2:**
   ```bash
   pm2 start src/index.js --name "smartbuddy-api"
   ```

3. **Ensure PM2 restarts on server reboot:**
   ```bash
   pm2 save
   pm2 startup
   ```
   *(Run the exact command that PM2 outputs on the screen to finalize the startup script).*

---

## Phase 2: Setup Nginx as a Reverse Proxy
Instead of exposing port 5005 directly to the internet, industry standard is to use Nginx to receive traffic on standard port 80 (HTTP) and route it to your Node.js app internally.

1. **Install Nginx:**
   ```bash
   sudo apt install -y nginx
   ```

2. **Create a Server Block Configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/smartbuddy
   ```

3. **Paste the following Nginx Configuration:**
   *(Replace `api.yourdomain.com` with your actual domain name. If you don't have a domain yet, put your EC2 Public IP address).*
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com; # Or your Public IP

       location / {
           proxy_pass http://127.0.0.1:5005;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   *Save and exit (`Ctrl+X`, `Y`, `Enter`).*

4. **Enable the Configuration and Restart Nginx:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/smartbuddy /etc/nginx/sites-enabled/
   sudo nginx -t  # This checks for syntax errors
   sudo systemctl restart nginx
   ```

---

## Phase 3: Point Your Domain (GoDaddy / Hostinger)
To connect your custom domain (e.g., `api.smartbuddy.com`) to your AWS server:

1. Log in to your Domain Registrar (GoDaddy, Hostinger, Namecheap).
2. Go to **DNS Management** for your domain.
3. Add a new **A Record**:
   - **Type:** `A`
   - **Name/Host:** `api` (or `@` if you want the root domain)
   - **Value/Points To:** `Your_EC2_Public_IP` (e.g., 13.206.x.x)
   - **TTL:** Default / 1 Hour
4. Save the record. *(Note: DNS propagation can take 10 minutes to a few hours).*

---

## Phase 4: Secure with SSL (Free HTTPS)
For Razorpay and Vercel to communicate with your backend, it **must** have an SSL certificate (`https://`).

1. **Install Certbot:**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. **Generate the SSL Certificate:**
   ```bash
   sudo certbot --nginx -d api.yourdomain.com
   ```
   *Certbot will ask for your email and automatically configure Nginx for HTTPS. Choose "Redirect" if prompted to force HTTPS.*

**Congratulations!** Your industry-level backend is now fully live, secured, and connected to your domain. You can update your Vercel frontend `.env` to point to `https://api.yourdomain.com/api`.
