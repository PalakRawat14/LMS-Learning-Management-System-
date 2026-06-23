# Oracle Cloud Always Free - Complete Setup Guide

**Best for unlimited resources completely free forever**

## Why Oracle Cloud?

| Feature | Render.com | Oracle Cloud |
|---------|-----------|--------------|
| Web Server | 0.5GB RAM | 2 vCPU, 12GB RAM |
| Database Storage | 0.25GB | 100GB |
| App Sleeps | Yes (after 15 min) | No (always on) |
| Cost | Free forever | Free forever |
| Complexity | ⭐ Easy | ⭐⭐⭐ Hard |

---

## Step 1: Create Oracle Cloud Account

1. Go to https://www.oracle.com/cloud/free/
2. Click "Start for free"
3. Sign up with email
4. Provide payment method (won't be charged for free tier)
5. Wait for account activation (2-5 minutes)

---

## Step 2: Create Virtual Machine

1. **Sign in** to Oracle Cloud Console
2. **Menu** → Compute → Instances
3. **Create Instance**
   - Name: `lms-server`
   - Image: Ubuntu 24.04 (always free eligible)
   - Shape: Ampere (always free, 4 OCPU, 24GB RAM) ⭐
   - VCN: Create new
   - Subnet: Public subnet
   - SSH Key: Generate and download key pair
   - Storage: 50GB (free tier supports up to 200GB)

4. Click **Create** (wait ~3 minutes)

---

## Step 3: SSH into VM

```bash
# Make key readable
chmod 600 ~/Downloads/lms_key.key

# SSH into VM (replace IP)
ssh ubuntu@<PUBLIC_IP_ADDRESS> -i ~/Downloads/lms_key.key
```

---

## Step 4: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Install PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Install PM2 (process manager)
sudo npm install -g pm2

# Verify installations
node --version
psql --version
pm2 --version
```

---

## Step 5: Set Up PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL:
CREATE USER lms_user WITH PASSWORD 'sql_nikhil';
CREATE DATABASE lms_db OWNER lms_user;
GRANT ALL PRIVILEGES ON DATABASE lms_db TO lms_user;
\q

# Enable PostgreSQL on startup
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

---

## Step 6: Clone & Deploy Your App

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/lms.git
cd lms

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies and build
cd client
npm install
npm run build
cd ..

# Copy production .env
cp .env.example server/.env
```

---

## Step 7: Configure Environment Variables

```bash
# Edit production .env
nano server/.env
```

Update these values:
```
NODE_ENV=production
PORT=5000
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lms_db
DB_USER=lms_user
DB_PASSWORD=sql_nikhil
CLIENT_URL=http://<YOUR_PUBLIC_IP>:5000
JWT_SECRET=<generate-random-32-char-string>
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password
```

Save: `Ctrl+O` → Enter → `Ctrl+X`

---

## Step 8: Start Server with PM2

```bash
# Navigate to server directory
cd ~/lms/server

# Start server with PM2
pm2 start src/app.js --name "lms-api"

# View logs
pm2 logs lms-api

# Save PM2 config to auto-start
pm2 startup
pm2 save

# Verify it's running
pm2 status
```

---

## Step 9: Configure Firewall

```bash
# Allow port 5000 in Oracle Cloud Firewall
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload

# Or if using iptables
sudo ufw allow 5000/tcp
sudo ufw reload
```

---

## Step 10: Test Deployment

```bash
# From your local machine
curl http://<YOUR_PUBLIC_IP>:5000/api/health

# Should return:
# {"status":"ok","time":"2026-05-26T10:30:00.000Z"}
```

---

## Step 11: (Optional) Set Up Domain & HTTPS

### Using Cloudflare (Free)
1. Point domain to your Oracle VM IP
2. Enable Cloudflare SSL (free tier)
3. Update `CLIENT_URL` in `.env`

### Using Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt install -y certbot

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Update server to use HTTPS
# (Requires code changes to src/app.js)
```

---

## Monitoring & Maintenance

```bash
# View all PM2 processes
pm2 list

# Monitor resources
pm2 monit

# View logs
pm2 logs lms-api

# Restart app
pm2 restart lms-api

# Stop app
pm2 stop lms-api

# Delete app from PM2
pm2 delete lms-api

# PostgreSQL status
sudo systemctl status postgresql

# Database backup
pg_dump -U lms_user -d lms_db > backup.sql

# Database restore
psql -U lms_user -d lms_db < backup.sql
```

---

## Troubleshooting

### App won't start
```bash
# Check logs
pm2 logs lms-api

# Check port is available
sudo netstat -tlnp | grep 5000

# Verify PostgreSQL running
sudo systemctl status postgresql
```

### Database connection error
```bash
# Test connection
psql -h localhost -U lms_user -d lms_db

# Check credentials in .env
cat server/.env | grep DB_
```

### Port blocked
```bash
# Check firewall
sudo firewall-cmd --list-all
sudo ufw status

# Open port
sudo ufw allow 5000/tcp
```

---

## Scaling Tips (Still Free!)

1. **Database replication**: Set up standby server
2. **Load balancing**: Use HAProxy
3. **Caching**: Install Redis server
4. **Monitoring**: Use PM2 Plus (some features free)

All resources are still free on Oracle Cloud Always Free tier!

---

## Cost Summary

| Item | Monthly Cost |
|------|--------------|
| Compute VM | **FREE** |
| PostgreSQL | **FREE** |
| Storage | **FREE** |
| Bandwidth | **FREE** |
| **Total** | **$0/month** |

---

## Next: Custom Domain

Once working, add a domain:

1. Register domain (Namecheap, GoDaddy - $10/year)
2. Point DNS to your Oracle VM IP
3. Add SSL certificate (Let's Encrypt free)
4. Update CLIENT_URL in .env
5. Done!

---

## Support

- Oracle Cloud Docs: https://docs.oracle.com/en-us/iaas/
- PostgreSQL Docs: https://www.postgresql.org/docs/15/
- Node.js Docs: https://nodejs.org/docs/
- PM2 Docs: https://pm2.keymetrics.io/docs/

