# Ubuntu Server 22.04 / 24.04 LTS Setup Guide — AdEarn AI

This runbook details the bare-metal or cloud VM preparation for hosting AdEarn AI in production.

---

## 1. System Updates & Base Hardening

Connect as `root` or `sudo` user:

```bash
# Update repositories and upgrade packages
sudo apt update && sudo apt upgrade -y

# Install essential utilities
sudo apt install -y curl wget git ufw htop fail2ban unzip ca-certificates gnupg lsb-release
```

---

## 2. Dedicated Non-Root Application User

Never run production applications or Docker commands as `root`. Create a dedicated service user `adearn`:

```bash
# Create user with home directory and bash shell
sudo adduser --disabled-password --gecos "" adearn

# Grant sudo privileges
sudo usermod -aG sudo adearn

# Switch to the adearn user
sudo su - adearn
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

Copy your authorized SSH public key:
```bash
echo "ssh-ed25519 AAAAC3... your-admin-key" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## 3. SSH Hardening

Edit `/etc/ssh/sshd_config`:

```ini
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
AllowTcpForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
```

Restart SSH:
```bash
sudo systemctl restart ssh
```

---

## 4. UFW Firewall Configuration

Expose **only** HTTP (80), HTTPS (443), and SSH (22). Never expose MySQL (3306) or Redis (6379) to the public internet:

```bash
# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH with rate limiting
sudo ufw limit 22/tcp

# Allow Web Traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable Firewall
sudo ufw enable

# Verify Status
sudo ufw status verbose
```

---

## 5. Fail2ban Intrusion Prevention

Configure fail2ban to mitigate brute-force SSH attempts:

```bash
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
```

---

## 6. Install Docker Engine & Docker Compose Plugin

```bash
# Add Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add adearn user to docker group
sudo usermod -aG docker adearn
```

Verify Docker installation:
```bash
docker --version
docker compose version
```

---

## 7. Clone Repository & Setup Directory

```bash
sudo su - adearn
git clone https://github.com/adearn/adearn-ai.git /home/adearn/app
cd /home/adearn/app

# Create storage mounts
mkdir -p storage/uploads logs nginx/ssl nginx/certbot/conf nginx/certbot/www
chmod -R 750 storage logs
```
