# Nginx Reverse Proxy & Load Balancer Configuration — AdEarn AI
## Production Edge Gateway, Security Headers, Rate Limiting, and Upstream Configuration

AdEarn AI utilizes Nginx as the high-performance edge gateway for SSL termination, request buffering, rate limiting, and reverse proxying to the Next.js application cluster.

---

## 1. Gateway Architecture

```
[Public Internet]
       │
   Port 80/443
       ▼
 [Nginx Reverse Proxy]
   - SSL / TLS 1.2 & 1.3 Termination
   - Strict Rate Limiting (Auth: 5r/s, API: 15r/s, General: 30r/s)
   - Security Headers (HSTS, CSP, XFO, Sniff Protection)
   - Static Asset Caching (/_next/static/ - 365 days immutable)
   - ACME HTTP-01 Challenge Passthrough for Certbot
       │
   Internal Docker Bridge (internal_net)
       ▼
 [Next.js Cluster (Port 3000)]
```

---

## 2. Configuration Validation & Zero-Downtime Reload

Before applying configuration changes in production, always validate syntax:

```bash
docker compose exec nginx nginx -t
```

Expected output:
```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Apply updates without dropping in-flight connections:
```bash
docker compose exec nginx nginx -s reload
```

---

## 3. Trusted Proxy Headers & Security Controls

Nginx forwards canonical client identity to Next.js while preventing header spoofing:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

In `src/middleware.ts`, Next.js checks `$remote_addr` and trusted forwarded headers for rate limiting and fraud telemetry.

---

## 4. Rate Limiting Zones

Nginx enforces three rate-limiting zones using client IP (`$binary_remote_addr`):

1. **Authentication Zone (`zone=auth_limit`)**:
   - Location: `/api/auth/`
   - Rate: `5 requests/sec` with `burst=10 nodelay`.
   - Purpose: Mitigates credential stuffing, brute force password guessing, and automated registration attacks.

2. **API Zone (`zone=api_limit`)**:
   - Location: `/api/`
   - Rate: `15 requests/sec` with `burst=30 nodelay`.
   - Purpose: Protects transaction APIs, task polling, and ledger queries.

3. **General Zone (`zone=general_limit`)**:
   - Location: `/` (HTML portal pages)
   - Rate: `30 requests/sec` with `burst=50 nodelay`.

---

## 5. Production Security Headers & HSTS

Injected on all responses from the edge:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (enforces HTTPS for 2 years)
- `X-Frame-Options: SAMEORIGIN` (prevents clickjacking)
- `X-Content-Type-Options: nosniff` (prevents MIME type confusion attacks)
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`

---

## 6. Horizontal Scaling: Multi-Instance Upstream

To scale Next.js across multiple container instances on the same host or cluster, update the `upstream` block in `nginx/conf.d/adearn.conf`:

```nginx
upstream adearn_backend {
    least_conn; # Route traffic to container with least active connections
    server app_1:3000 max_fails=3 fail_timeout=10s;
    server app_2:3000 max_fails=3 fail_timeout=10s;
    keepalive 64;
}
```
