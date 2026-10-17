# Nginx Reverse Proxy & Load Balancer Configuration — AdEarn AI

AdEarn AI uses Nginx as the edge gateway for SSL termination, request buffering, rate limiting, and reverse proxying to Next.js.

---

## 1. Architecture

```
[Public Internet]
       │
   Port 80/443
       ▼
 [Nginx Reverse Proxy]
   - SSL / TLS 1.3 Termination
   - Rate Limiting (Auth: 5r/s, API: 15r/s, General: 30r/s)
   - Security Headers (HSTS, CSP, XFO)
   - Static Asset Caching (/_next/static/ - 365 days)
       │
   Internal Docker Network
       ▼
 [Next.js Cluster (Port 3000)]
```

---

## 2. Testing Configuration Syntax

Before reloading or starting Nginx in production, always validate configuration syntax:

```bash
docker compose exec nginx nginx -t
```

Expected output:
```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## 3. Reloading Configuration with Zero Downtime

When updating `nginx/conf.d/adearn.conf`, trigger a seamless reload without dropping client connections:

```bash
docker compose exec nginx nginx -s reload
```

---

## 4. Rate Limiting Rules & Burst Settings

Nginx enforces three rate-limiting zones using client IP (`$binary_remote_addr`):

1. **Authentication Zone (`zone=auth_limit`)**:
   - Matches: `/api/auth/`
   - Rate: `5 requests/sec` with burst `10 nodelay`.
   - Purpose: Mitigates credential stuffing, password guessing, and automated account registration attacks.

2. **API Zone (`zone=api_limit`)**:
   - Matches: `/api/`
   - Rate: `15 requests/sec` with burst `30 nodelay`.
   - Purpose: Protects backend queries and prevents task submission scraping.

3. **General Zone (`zone=general_limit`)**:
   - Matches: `/` (HTML, document pages)
   - Rate: `30 requests/sec` with burst `50 nodelay`.

---

## 5. Security Headers & HSTS

The following headers are injected automatically on all responses:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: SAMEORIGIN` (prevents clickjacking)
- `X-Content-Type-Options: nosniff` (prevents MIME sniffing)
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
