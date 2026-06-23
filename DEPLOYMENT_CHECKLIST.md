# Pre-Deployment Checklist

## ✅ PostgreSQL Setup
- [x] PostgreSQL 15 installed and running
- [x] Database `lms_db` created
- [x] User `lms_user` created with password
- [x] Permissions granted
- [x] Connection tested locally

## ✅ Code Updates
- [x] Removed SQLite fallback from database config
- [x] Updated CORS for production environments
- [x] SSL support added for PostgreSQL
- [x] Environment variables configured for production
- [x] `.env.example` updated with production values

## ⚠️ Before Deployment - Generate These Values

### 1. Generate Strong JWT_SECRET
```bash
# Run this in terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output and use it for JWT_SECRET
```

### 2. Generate Database Password
```bash
# Or use online generator:
# https://www.random.org/passwords/
# or
# https://passwordsgenerator.net/
```

### 3. Gmail App Password
```
1. Enable 2FA on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Select "Mail" and "Other (custom name)"
4. Use the generated 16-character password
```

---

## 📋 Choose Your Deployment Path

### OPTION 1: Render.com (Recommended - Easiest)
**Best for**: Quick deployment, less technical setup
**Pros**: Easy UI, auto-deploy from GitHub, free tier works
**Cons**: App sleeps after 15 min inactivity

**Time**: 5-10 minutes

**Steps**:
1. ✅ Have GitHub account with repo pushed
2. ✅ Create Render account (free)
3. ✅ Create PostgreSQL database on Render
4. ✅ Create Web Service pointing to GitHub
5. ✅ Set environment variables
6. ✅ Deploy!

**Guide**: See `DEPLOYMENT_GUIDE.md`

---

### OPTION 2: Oracle Cloud (Best Value - Unlimited Free)
**Best for**: Unlimited resources, always-on app
**Pros**: Truly unlimited free forever, 2 vCPU + 12GB RAM
**Cons**: More technical setup, manual server management

**Time**: 20-30 minutes

**Steps**:
1. ✅ Create Oracle Cloud account (free)
2. ✅ Create Ubuntu VM (Ampere - always free eligible)
3. ✅ SSH into VM
4. ✅ Install Node.js, PostgreSQL, PM2
5. ✅ Clone repo and configure
6. ✅ Start with PM2
7. ✅ Set up firewall/domain

**Guide**: See `ORACLE_SETUP.md`

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] Change default `JWT_SECRET` to generated value
- [ ] Change `DB_PASSWORD` to strong password
- [ ] Use Gmail App Password (not regular password)
- [ ] Set `NODE_ENV=production`
- [ ] Remove hardcoded debug domains from CORS
- [ ] Use HTTPS with valid SSL certificate
- [ ] Enable database backups
- [ ] Set rate limiting on API endpoints
- [ ] Enable request logging/monitoring
- [ ] Set up automated backups (weekly)
- [ ] Document database backup procedure

---

## 📊 Performance Optimization (Post-Deployment)

### Database
- [ ] Create indexes on frequently queried fields
- [ ] Enable query logging to identify slow queries
- [ ] Set up connection pooling
- [ ] Regular VACUUM and ANALYZE

### Application
- [ ] Enable gzip compression in Express
- [ ] Use CDN for static assets (Cloudflare free)
- [ ] Implement caching strategy
- [ ] Monitor error rates
- [ ] Track database query performance

### Monitoring
- [ ] Set up error tracking (Sentry free tier)
- [ ] Monitor server resources
- [ ] Set up alerts for failures
- [ ] Track API response times

---

## 🗂️ File Structure After Deployment

```
lms/
├── server/
│   ├── src/
│   ├── .env                 # Production environment (DO NOT COMMIT)
│   ├── package.json
│   └── uploads/             # User files
├── client/
│   ├── dist/                # Built frontend (production)
│   ├── src/
│   └── package.json
├── .env.example             # Template (commit this)
├── render.yaml              # Render.com config
├── Procfile                 # Process file
├── DEPLOYMENT_GUIDE.md      # This guide
├── ORACLE_SETUP.md          # Oracle Cloud guide
└── README.md
```

---

## 🚀 Quick Deployment Commands

### Push to GitHub
```bash
cd /Users/nikhil/Desktop/lms
git add .
git commit -m "Production-ready: PostgreSQL migration"
git push origin main
```

### Test Locally Before Deploying
```bash
# Terminal 1: Start PostgreSQL
brew services start postgresql@15

# Terminal 2: Start server
cd server
NODE_ENV=production npm run dev

# Terminal 3: Start client (optional)
cd client
npm run dev

# Test endpoints
curl http://localhost:5000/api/health
```

---

## 📞 Troubleshooting Resources

| Issue | Solution |
|-------|----------|
| Can't connect to PostgreSQL | Check DB_HOST, DB_USER, DB_PASSWORD |
| CORS errors | Verify CLIENT_URL matches frontend domain |
| Build fails | Check npm install works locally |
| App crashes | Check `NODE_ENV=production` |
| Database full | Check storage quota on hosting |
| App sleeps (Render) | Upgrade to paid tier or upgrade to Oracle |

---

## ✨ Next Steps After Deployment

1. **Test all features**
   - User registration
   - Login
   - Create courses
   - Upload materials
   - Submit assignments

2. **Set up monitoring**
   - Email alerts for errors
   - Database backup schedule
   - Server health checks

3. **Plan scaling**
   - Monitor usage patterns
   - Plan for upgrade if needed
   - Set up CDN for static assets

4. **Domain & SSL** (Optional)
   - Register domain name
   - Point DNS to server
   - Get SSL certificate (Let's Encrypt free)
   - Update CLIENT_URL

---

## 📖 Recommended Reading

- [Render.com Documentation](https://render.com/docs)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-performance/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## ❓ Quick Questions?

**Q: Will my app go down if it's on Render free tier?**
A: It will go to sleep after 15 min of inactivity, taking ~30s to wake up. Not ideal for production. Use Oracle Cloud for always-on.

**Q: Can I upgrade later without losing data?**
A: Yes! Both Render and Oracle allow upgrades. Your database data stays intact.

**Q: How much will it cost if I upgrade?**
A: Render ~$7-20/mo. Oracle depends on what you add (~$10-50/mo for additional resources).

**Q: How do I backup my database?**
A: Both platforms provide automated backups. Manual backups via `pg_dump` are recommended weekly.

---

**STATUS**: ✅ Ready for deployment!

Start with either `DEPLOYMENT_GUIDE.md` (Render) or `ORACLE_SETUP.md` (Oracle Cloud).

