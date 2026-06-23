# Free Deployment Guide - Render.com

## Quick Start (5 minutes)

### Step 1: Prepare Your Repository
```bash
cd /Users/nikhil/Desktop/lms
git init
git add .
git commit -m "Initial commit - ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/lms.git
git branch -M main
git push -u origin main
```

### Step 2: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (recommended)
3. Authorize GitHub access

### Step 3: Create PostgreSQL Database
1. In Render Dashboard → New +
2. Select "PostgreSQL"
3. Name: `lms-db`
4. Region: Oregon (free tier available)
5. PostgreSQL Version: 15
6. Billing Plan: **Free** (0.25GB storage)
7. Click "Create Database"
8. Wait 2-3 minutes for database to initialize
9. Copy the "Internal Database URL" (postgres://...)

### Step 4: Create Web Service
1. Dashboard → New + → Web Service
2. Connect to GitHub repo
3. Repository: Select `lms`
4. Name: `lms-api`
5. Environment: Node
6. Region: Oregon
7. Build Command: `npm --prefix server install && npm --prefix client install && npm --prefix client run build`
8. Start Command: `npm --prefix server start`
9. Plan: **Free**

### Step 5: Set Environment Variables
In Web Service Settings → Environment:

```
NODE_ENV=production
PORT=3000
DB_DIALECT=postgres
DB_HOST=<from database internal URL>
DB_PORT=5432
DB_NAME=<from database URL path>
DB_USER=<from database URL user>
DB_PASSWORD=<from database URL password>
CLIENT_URL=https://<your-app>.onrender.com
JWT_SECRET=<generate-32-char-random-string>
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=<your-app-password>
```

### Step 6: Deploy!
- Render auto-deploys on git push
- Or click "Deploy" button manually
- Wait 5-10 minutes for first deploy

---

## Free Tier Limitations (Render)

- **Web Service**: 0.5GB RAM, sleeps after 15 min inactivity (auto-wakes on request)
- **PostgreSQL**: 0.25GB storage, 5 simultaneous connections
- **Bandwidth**: Generous free limits
- **Duration**: Free forever

### ⚠️ Limitations to Know
- App sleeps after inactivity (first request wakes it ~30s delay)
- Database connection limit: 5
- If you need more storage/performance, upgrade to paid tier ($7+/mo)

---

## Alternative: Oracle Cloud Always Free (Unlimited)

If you want truly unlimited free tier:

1. Go to https://www.oracle.com/cloud/free/
2. Create Oracle account
3. Get 2 vCPU + 1GB RAM free VM forever
4. Install PostgreSQL on VM
5. Deploy Node.js app on same VM
6. More complex but unlimited resources

See `ORACLE_SETUP.md` for detailed instructions.

---

## Testing Your Deployment

Once deployed, test these endpoints:

```bash
# Health check
curl https://your-app.onrender.com/api/health

# Ping
curl https://your-app.onrender.com/api/ping

# Try login (example)
curl -X POST https://your-app.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}'
```

---

## Troubleshooting

### Build fails
- Check `npm install` works locally
- Verify Node version (14+)
- Check package.json syntax

### Database connection error
- Verify DB_HOST, DB_USER, DB_PASSWORD in environment
- Make sure PostgreSQL service started on Render
- Check connection limits (5 max)

### App won't start
- Check logs: Render Dashboard → Service → Logs
- Verify PORT=3000 (not 5000 on free tier)
- Check database initialization

### CORS errors
- Update CLIENT_URL in server environment
- Verify it matches your frontend domain

---

## Performance Tips

1. **Cold starts**: First request takes ~30s (auto-wake from sleep)
2. **Database queries**: Index frequently searched fields
3. **File uploads**: Store in cloud (AWS S3) not local FS
4. **Caching**: Add Redis for session/cache (free tier available)

---

## Next Steps (Scaling Up)

When you need more performance:

1. **Upgrade Web Service**: $7/mo for always-on
2. **Upgrade Database**: $15/mo for 5GB + more connections
3. **Add Redis Cache**: $15/mo for better performance
4. **Use CDN**: Cloudflare free for static assets

**Total realistic cost when scaling: $20-40/mo for production-grade app**

---

## Useful Links

- Render Docs: https://render.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/15/
- Sequelize Docs: https://sequelize.org/
- Node.js Best Practices: https://nodejs.org/en/docs/

