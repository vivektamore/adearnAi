# HTTPS & Automated SSL Certificate Setup — AdEarn AI

AdEarn AI uses Let's Encrypt automated TLS certificates managed by Certbot with automatic renewals.

---

## 1. Domain & DNS Verification

Before provisioning certificates, verify that DNS A-records are propagated globally:

```bash
# Check apex domain
dig +short A adearn.ai

# Check www subdomain
dig +short A www.adearn.ai
```

Both queries must return your production server's public IPv4 address.

---

## 2. Initial Certificate Generation with Certbot

Run Certbot via Docker or host to obtain initial certificates via webroot verification:

```bash
# Ensure ACME webroot directory exists
mkdir -p /home/adearn/app/nginx/certbot/www
mkdir -p /home/adearn/app/nginx/certbot/conf

# Obtain certificate
sudo docker run -it --rm --name certbot \
  -v "/home/adearn/app/nginx/certbot/conf:/etc/letsencrypt" \
  -v "/home/adearn/app/nginx/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email security@adearn.ai \
  --agree-tos \
  --no-eff-email \
  -d adearn.ai -d www.adearn.ai
```

---

## 3. Automated Renewal Cron Job

Let's Encrypt certificates expire every 90 days. Configure a system cron job on Ubuntu to run twice weekly:

```bash
sudo crontab -e
```

Add the following line:
```cron
0 3 * * 2,5 docker run --rm -v "/home/adearn/app/nginx/certbot/conf:/etc/letsencrypt" -v "/home/adearn/app/nginx/certbot/www:/var/www/certbot" certbot/certbot renew --quiet && docker exec adearn-nginx nginx -s reload
```

This runs Certbot on Tuesdays and Fridays at 3:00 AM UTC and triggers an zero-downtime Nginx reload if renewed.

---

## 4. Temporary Self-Signed Certificate (for Staging / Pre-DNS Testing)

If testing on a staging VM before pointing production DNS:

```bash
mkdir -p /home/adearn/app/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /home/adearn/app/nginx/ssl/privkey.pem \
  -out /home/adearn/app/nginx/ssl/fullchain.pem \
  -subj "/C=IN/ST=Karnataka/L=Bengaluru/O=AdEarn AI/CN=localhost"
```
