# Ubuntu Server 22.04 / 24.04 LTS Setup Guide — AdEarn AI
## Production Host Hardening, Isolation, and Operations Runbook

This runbook details the comprehensive, step-by-step preparation for hosting AdEarn AI on a clean, supported Ubuntu 22.04 or 24.04 LTS server.

---

## 1. Operating System Updates & Base Hardening

Connect as `root` or an initial sudo user via SSH:

```bash
# Update repository metadata and upgrade all packages
sudo apt update && sudo apt upgrade -y

# Install essential administration, networking, and security packages
sudo apt install -y curl wget git ufw htop fail2ban unzip ca-certificates gnupg lsb-release unattended-upgrades

# Enable automatic security patches
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 2. Dedicated Non-Root Application User

Never run production applications or Docker commands as `root`. Create a dedicated service user `adearn`:

```bash
# Create user with home directory and bash shell
sudo adduser --disabled-password --gecos "AdEarn AI Deployment User" adearn

# Grant sudo privileges
sudo usermod -aG sudo adearn

# Set up SSH directory for the deploy user
sudo mkdir -p /home/adearn/.ssh
sudo chmod 700 /home/adearn/.ssh
```

Copy your authorized administrator SSH public key:
```bash
sudo cp /root/.ssh/authorized_keys /home/adearn/.ssh/authorized_keys
sudo chown -R adearn:adearn /home/adearn/.ssh
sudo chmod 600 /home/adearn/.ssh/authorized_keys
```

---

## 3. Secure SSH Configuration

Edit `/etc/ssh/sshd_config` (or `/etc/ssh/sshd_config.d/hardening.conf`):

```ini
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
AllowTcpForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers adearn
```

Test syntax and restart SSH daemon:
```bash
sudo sshd -t
sudo systemctl restart ssh
```

---

## 4. UFW Firewall Configuration

Expose **only** SSH (port 22) and Web traffic (ports 80 and 443). **Never expose MySQL (port 3306) or Redis (port 6379)** to the public internet:

```bash
# Set baseline firewall policy to deny incoming, allow outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH with rate limiting (mitigates rapid brute force)
sudo ufw limit 22/tcp comment 'SSH'

# Allow Web traffic
sudo ufw allow 80/tcp comment 'HTTP (Let\'s Encrypt challenge & redirect)'
sudo ufw allow 443/tcp comment 'HTTPS TLS Gateway'

# Enable firewall and verify verbose status
sudo ufw --force enable
sudo ufw status verbose
```

---

## 5. Docker Installation and Verification

Install official Docker Engine and Compose plugin:

```bash
# Add Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker packages
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add deploy user to docker group
sudo usermod -aG docker adearn

# Enable Docker on system boot
sudo systemctl enable docker
sudo systemctl restart docker
```

Verification:
```bash
docker --version
docker compose version
```

---

## 6. Secure Deployment Directory

Switch to the `adearn` user and clone the repository:

```bash
sudo su - adearn
git clone https://github.com/adearn/adearn-ai.git /home/adearn/app
cd /home/adearn/app

# Create necessary persistent host directories
mkdir -p storage/uploads logs nginx/ssl nginx/certbot/conf nginx/certbot/www backups/mysql backups/pre_deploy

# Set strict permissions
chmod -R 750 storage logs backups
chmod +x scripts/*.sh
```

---

## 7. Environment Configuration

Copy `.env.example` to production `.env`:

```bash
cp .env.example .env
chmod 600 .env
```

Generate strong cryptographic secrets:
```bash
# Generate 64-character hex strings for secrets
openssl rand -hex 32  # Use for JWT_SECRET
openssl rand -hex 32  # Use for COOKIE_SECRET
openssl rand -hex 24  # Use for DB_PASSWORD
openssl rand -hex 24  # Use for REDIS_PASSWORD
```

Populate `.env` with production parameters according to `docs/deployment/ENVIRONMENT_VARIABLES.md`.

---

## 8. Database and Redis Networking

In `docker-compose.yml`, MySQL 8.0 (`db`) and Redis 7 (`redis`) are strictly joined to `internal_net` with `internal: true`.
- They do **not** bind any host ports.
- Neither port 3306 nor port 6379 is accessible from outside Docker.
- Application container communicates via internal Docker DNS (`db:3306`, `redis:6379`).

---

## 9. Application Startup

Launch core data services first and verify readiness:

```bash
# Start MySQL and Redis in background
docker compose up -d db redis

# Check container health status
docker compose ps
```

Wait until `adearn-db` and `adearn-redis` report `(healthy)`.

---

## 10. Nginx Configuration

Verify Nginx reverse proxy configuration syntax:

```bash
# Verify config files in repository
cat nginx/nginx.conf
cat nginx/conf.d/adearn.conf
```

Key features configured in `nginx/conf.d/adearn.conf`:
- TLS 1.2 and TLS 1.3 only (modern cipher suites).
- HTTP-to-HTTPS 301 redirection.
- Rate limiting zones (`auth_limit` 5r/s, `api_limit` 15r/s, `general_limit` 30r/s).
- Gzip compression on JSON and assets.
- Next.js static asset caching (`/_next/static/` max-age=1y immutable).
- Security headers (`HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`).

---

## 11. HTTPS Setup (Let's Encrypt Certbot)

For a live domain (e.g., `adearn.ai`):

```bash
# 1. Start Nginx on HTTP to serve ACME challenge
docker compose up -d nginx

# 2. Run Certbot to acquire certificates
docker run -it --rm --name certbot \
  -v "/home/adearn/app/nginx/certbot/conf:/etc/letsencrypt" \
  -v "/home/adearn/app/nginx/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d adearn.ai -d www.adearn.ai \
  --email admin@adearn.ai --agree-tos --no-eff-email

# 3. Reload Nginx to activate SSL certificate
docker compose exec nginx nginx -s reload
```

Set up automated certificate renewal via crontab:
```bash
sudo crontab -e
# Add line:
0 3 * * 1 docker run --rm -v "/home/adearn/app/nginx/certbot/conf:/etc/letsencrypt" -v "/home/adearn/app/nginx/certbot/www:/var/www/certbot" certbot/certbot renew --quiet && cd /home/adearn/app && docker compose exec -T nginx nginx -s reload
```

---

## 12. Health Verification

Verify application container and dependent services:

```bash
# Query application health probe
curl -s http://127.0.0.1:3000/api/health | jq .
```

Expected response:
```json
{
  "status": "UP",
  "service": "AdEarn AI Core API Engine",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "engine": "MySQL 8.0",
      "latencyMs": 1
    },
    "payoutAdapter": {
      "mode": "sandbox",
      "status": "ready"
    },
    "ledgerEngine": {
      "status": "operational",
      "currency": "INR (Integer Paise)"
    }
  }
}
```

---

## 13. Backup Configuration

Set up automated daily database backup via cron:

```bash
crontab -e
# Add line to execute backup daily at 02:00 AM:
0 2 * * * /home/adearn/app/scripts/backup_db.sh /home/adearn/backups/mysql >> /home/adearn/app/logs/backup.log 2>&1
```

Verify manual execution:
```bash
bash /home/adearn/app/scripts/backup_db.sh
ls -lh /home/adearn/backups/mysql/
```

---

## 14. Monitoring and Log Management

Configure log rotation in `/etc/logrotate.d/adearn`:

```ini
/home/adearn/app/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 adearn adearn
}
```

View live container logs:
```bash
docker compose logs -f --tail=100 app
docker compose logs -f --tail=100 nginx
```

---

## 15. Reboot / Restart Resilience Test

Verify that Docker and all containers survive an unexpected host reboot:

```bash
sudo reboot
```

After reboot, verify:
```bash
sudo su - adearn
cd /home/adearn/app
docker compose ps
# All services (app, db, redis, nginx) must show "Up" or "(healthy)"
curl -s http://127.0.0.1:3000/api/health | jq .status
```

---

## 16. Release Update Procedure

To deploy an updated version safely:

```bash
cd /home/adearn/app
bash ./scripts/deploy.sh
```

This automatically:
1. Runs a safety snapshot of the MySQL database.
2. Tags existing container image as fallback.
3. Builds the updated Docker image.
4. Executes non-destructive Prisma database migrations.
5. Performs rolling container restart.
6. Probes `/api/health` up to 12 times.
7. Reloads Nginx reverse proxy.

---

## 17. Rollback Procedure

If a release fails health checks or exhibits runtime defects:

```bash
cd /home/adearn/app
bash ./scripts/rollback.sh
```

To roll back both the container and restore the pre-deploy database snapshot:
```bash
bash ./scripts/rollback.sh --with-db-restore
```
