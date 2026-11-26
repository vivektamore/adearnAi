# AdEarn AI — Production Deployment Manual

This manual provides complete step-by-step instructions for deploying AdEarn AI to production servers.

---

## 1. System Requirements

- **Operating System**: Ubuntu 22.04 LTS / 24.04 LTS or Debian 12
- **Compute**: Minimum 4 vCPUs, 8 GB RAM (16 GB recommended for high impression concurrency)
- **Node.js**: Node.js v20 LTS or v22 LTS (`node -v >= 20.0.0`)
- **Package Manager**: npm 10+
- **Database Engine**: MySQL Server 8.0+ with InnoDB storage engine
- **Process Manager**: PM2 or Docker
- **Reverse Proxy**: Nginx 1.22+ with HTTP/2 and TLS 1.3 support

---

## 2. Server Provisioning & Database Setup

### 2.1 MySQL 8.0 Provisioning
```bash
# Install MySQL 8.0
sudo apt update
sudo apt install -y mysql-server

# Secure installation
sudo mysql_secure_installation

# Log in as root and configure production database and user
sudo mysql -u root -p
```

Inside MySQL console:
```sql
CREATE DATABASE adearn_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'adearn_prod'@'localhost' IDENTIFIED BY 'STRONG_COMPLEX_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON adearn_ai.* TO 'adearn_prod'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Application Deployment Procedure

### 3.1 Clone & Dependencies Installation
```bash
git clone https://github.com/adearn/adearn-ai.git /var/www/adearn-ai
cd /var/www/adearn-ai

# Install dependencies (frozen lockfile)
npm ci --production=false
```

### 3.2 Environment Setup
```bash
cp .env.production.example .env.production
nano .env.production
```
Configure `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, and ensure `PAYOUT_MODE="sandbox"` is set initially.

### 3.3 Database Migrations & Initial Chart of Accounts
```bash
# Push schema and generate Prisma client
npx prisma generate
npx prisma db push

# Provision clean production seed accounts (system accounts & chart of accounts)
node scripts/seed.js
```

### 3.4 Build Application
```bash
npm run build
```

### 3.5 Process Management with PM2
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'adearn-ai',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

Start the application:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 4. Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/adearn.ai`:
```nginx
server {
    listen 80;
    server_name adearn.ai www.adearn.ai;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name adearn.ai www.adearn.ai;

    ssl_certificate /etc/letsencrypt/live/adearn.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/adearn.ai/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/adearn.ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. Post-Deployment Verification
Run the automated smoke test suite against the live production origin:
```bash
TEST_BASE_URL="https://adearn.ai" npm test
```
Verify:
1. `npm test` finishes with all 14 test suites reporting 0 failures.
2. `node scripts/reconcile_ledger.js` outputs `100% BALANCED & INTEGRITY CONFIRMED`.

