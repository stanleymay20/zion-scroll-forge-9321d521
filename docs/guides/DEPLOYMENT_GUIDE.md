# ScrollUniversity Deployment Guide
**"Build your house on the rock" - Matthew 7:24**

## Prerequisites

### Required Accounts & Services
1. **Supabase** - Database, Auth, Storage, Real-time
2. **OpenAI** - GPT-4o API access
3. **Stripe** - Payment processing
4. **D-ID or Synthesia** - AI video avatars
5. **Ethereum Node** - Alchemy, Infura, or QuickNode
6. **Domain** - scrolluniversity.org
7. **Hosting** - Vercel, Railway, or AWS

### Required Tools
- Node.js 20+
- npm or yarn
- Git
- Docker (optional)
- Supabase CLI

## Step 1: Database Setup

### 1.1 Create Supabase Project
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref
```

### 1.2 Run Migrations
```bash
# Apply all migrations
supabase db push

# Or manually through Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Run each migration file in order
# 3. Start with 20241217000000_create_profiles.sql
# 4. End with 20251217000000_complete_schema_sync.sql
```

### 1.3 Configure RLS Policies
All RLS policies are included in migrations. Verify in Supabase Dashboard:
- Authentication > Policies
- Ensure all tables have appropriate policies enabled

## Step 2: Environment Configuration

### 2.1 Backend Environment (.env)
```env
# Server
NODE_ENV=production
PORT=3001
CLUSTER_WORKERS=4

# Database
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Redis (Upstash or Redis Cloud)
REDIS_URL=redis://default:[password]@[host]:6379

# Authentication
JWT_SECRET=[generate-strong-secret]
JWT_REFRESH_SECRET=[generate-strong-secret]

# Supabase
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_KEY=[your-service-key]

# OpenAI
OPENAI_API_KEY=sk-[your-key]

# Video Avatar (choose one)
DID_API_KEY=[your-did-key]
# OR
SYNTHESIA_API_KEY=[your-synthesia-key]

# Stripe
STRIPE_SECRET_KEY=sk_live_[your-key]
STRIPE_WEBHOOK_SECRET=whsec_[your-secret]
STRIPE_PUBLISHABLE_KEY=pk_live_[your-key]

# Blockchain
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/[your-key]
PRIVATE_KEY=[your-wallet-private-key]
SCROLLCOIN_CONTRACT_ADDRESS=[deployed-contract-address]
SCROLLBADGE_CONTRACT_ADDRESS=[deployed-contract-address]

# CORS
FRONTEND_URL=https://scrolluniversity.org
PORTAL_URL=https://portal.scrolluniversity.org
MOBILE_URL=https://m.scrolluniversity.org

# Email (SendGrid, AWS SES, or SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=[your-sendgrid-api-key]
EMAIL_FROM=noreply@scrolluniversity.org

# Monitoring (optional)
SENTRY_DSN=[your-sentry-dsn]
```

### 2.2 Frontend Environment (.env.production)
```env
VITE_API_URL=https://api.scrolluniversity.org
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_[your-key]
VITE_ENVIRONMENT=production
```

## Step 3: Smart Contract Deployment

### 3.1 Deploy ScrollCoin Token
```bash
cd backend/contracts

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to mainnet (or testnet first)
npx hardhat run scripts/deploy-scrollcoin.js --network mainnet

# Save contract address to .env
```

### 3.2 Deploy ScrollBadge NFT
```bash
# Deploy NFT contract
npx hardhat run scripts/deploy-scrollbadge.js --network mainnet

# Verify on Etherscan
npx hardhat verify --network mainnet [contract-address]
```

## Step 4: Backend Deployment

### Option A: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Add environment variables
railway variables set DATABASE_URL=[value]
# ... add all other variables

# Deploy
railway up
```

### Option B: Docker + AWS ECS
```bash
# Build Docker image
cd backend
docker build -f Dockerfile.production -t scrolluniversity-api:latest .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [account-id].dkr.ecr.us-east-1.amazonaws.com
docker tag scrolluniversity-api:latest [account-id].dkr.ecr.us-east-1.amazonaws.com/scrolluniversity-api:latest
docker push [account-id].dkr.ecr.us-east-1.amazonaws.com/scrolluniversity-api:latest

# Deploy to ECS (use provided task definition)
aws ecs update-service --cluster scroll-cluster --service scroll-api --force-new-deployment
```

### Option C: Vercel (Serverless)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd backend
vercel --prod

# Configure environment variables in Vercel dashboard
```

## Step 5: Frontend Deployment

### Option A: Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Build
npm run build

# Deploy
vercel --prod

# Configure custom domain
vercel domains add scrolluniversity.org
```

### Option B: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist

# Configure custom domain in Netlify dashboard
```

### Option C: AWS S3 + CloudFront
```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://scrolluniversity-frontend --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id [id] --paths "/*"
```

## Step 6: Database Seeding

### 6.1 Seed Initial Data
```bash
cd backend
npm run seed:prod

# This will create:
# - Sample courses
# - Faculty members
# - Daily devotions
# - System configuration
```

### 6.2 Create Admin User
```sql
-- Run in Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('admin@scrolluniversity.org', crypt('your-password', gen_salt('bf')), NOW());

-- Get the user ID and add admin role
INSERT INTO public.user_roles (user_id, role, is_active)
VALUES ('[user-id-from-above]', 'superadmin', true);
```

## Step 7: Configure External Services

### 7.1 Stripe Webhooks
1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://api.scrolluniversity.org/api/payments/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook secret to environment variables

### 7.2 OpenAI Rate Limits
1. Go to OpenAI Dashboard > Settings > Limits
2. Set appropriate rate limits for production
3. Enable usage notifications

### 7.3 Supabase Auth Providers
1. Go to Supabase Dashboard > Authentication > Providers
2. Enable Email provider
3. Configure Google OAuth (optional)
4. Configure Microsoft OAuth (optional)
5. Set redirect URLs

## Step 8: Monitoring & Logging

### 8.1 Set Up Sentry
```bash
# Install Sentry
npm install @sentry/node @sentry/react

# Configure in backend/src/index.ts and src/main.tsx
```

### 8.2 Configure Log Aggregation
```bash
# Option A: Papertrail
# Add remote_syslog2 to send logs

# Option B: CloudWatch
# Configure AWS CloudWatch Logs agent

# Option C: Datadog
# Install Datadog agent
```

### 8.3 Set Up Uptime Monitoring
- UptimeRobot: Monitor `/health` endpoint
- Pingdom: Monitor critical endpoints
- StatusPage: Public status page

## Step 9: CDN & Performance

### 9.1 Configure CloudFlare
1. Add domain to CloudFlare
2. Enable:
   - Auto Minify (JS, CSS, HTML)
   - Brotli compression
   - HTTP/3
   - Early Hints
3. Set caching rules for static assets
4. Configure Page Rules for API

### 9.2 Enable Caching
```nginx
# Nginx configuration for static assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Step 10: Security Hardening

### 10.1 SSL/TLS Configuration
```bash
# Use Let's Encrypt for free SSL
certbot --nginx -d scrolluniversity.org -d www.scrolluniversity.org

# Or use CloudFlare SSL (Full Strict mode)
```

### 10.2 Security Headers
Already configured in `backend/src/middleware/productionSecurity.ts`:
- HSTS
- CSP
- X-Frame-Options
- X-Content-Type-Options

### 10.3 Rate Limiting
Configured in middleware:
- General API: 100 requests/15min
- Auth endpoints: 5 requests/15min
- Admissions: 10 requests/hour

## Step 11: Backup & Disaster Recovery

### 11.1 Database Backups
```bash
# Supabase automatic backups (enabled by default)
# Additional manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql s3://scrolluniversity-backups/
```

### 11.2 Backup Schedule
- Automated daily backups (Supabase)
- Weekly full backups to S3
- Monthly archive backups
- Retention: 30 days rolling, 12 months archive

## Step 12: Testing Production

### 12.1 Health Checks
```bash
# Backend health
curl https://api.scrolluniversity.org/health

# Database connectivity
curl https://api.scrolluniversity.org/health | jq '.checks.database'

# Frontend
curl https://scrolluniversity.org
```

### 12.2 Smoke Tests
```bash
# Run production smoke tests
cd backend
npm run test:production

# Test critical flows:
# - User registration
# - Login
# - Course enrollment
# - Payment processing
# - AI tutor session
```

## Step 13: Launch Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies enabled and tested
- [ ] Smart contracts deployed and verified
- [ ] Backend deployed and health check passing
- [ ] Frontend deployed and accessible
- [ ] SSL certificates installed
- [ ] DNS configured correctly
- [ ] Stripe webhooks configured
- [ ] Email service configured and tested
- [ ] Monitoring and alerting set up
- [ ] Backups configured and tested
- [ ] Admin user created
- [ ] Initial content seeded
- [ ] Security scan completed
- [ ] Performance testing completed
- [ ] Documentation updated
- [ ] Team trained on operations

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL

# Check connection pool
# Increase max connections in Supabase if needed
```

### Redis Connection Issues
```bash
# Test Redis
redis-cli -u $REDIS_URL ping

# Check memory usage
redis-cli -u $REDIS_URL info memory
```

### API Not Responding
```bash
# Check logs
railway logs
# or
docker logs [container-id]

# Check process
pm2 status
pm2 logs
```

## Support & Maintenance

### Regular Maintenance Tasks
- **Daily**: Monitor error rates, check health endpoints
- **Weekly**: Review logs, check disk space, update dependencies
- **Monthly**: Security updates, performance review, backup verification
- **Quarterly**: Disaster recovery drill, security audit

### Emergency Contacts
- DevOps Lead: [contact]
- Database Admin: [contact]
- Security Team: [contact]

---

**Deployment Date**: [Date]
**Deployed By**: [Name]
**Version**: 1.0.0
**Status**: ✅ Production Ready
