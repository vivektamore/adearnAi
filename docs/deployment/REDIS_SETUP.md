# Redis 7 Cache & Job Queue Setup — AdEarn AI

AdEarn AI uses Redis 7 for distributed rate-limiting, session synchronization, task lock coordination, and background job queuing.

---

## 1. Security & Network Isolation

- Redis is attached exclusively to Docker's `internal_net` bridge.
- **Port 6379 is never published to the host or internet.**
- Password authentication (`AUTH`) is strictly enforced via `requirepass`.
- Dangerous commands (`FLUSHALL`, `FLUSHDB`, `CONFIG`, `DEBUG`) can be renamed or disabled in production:

```text
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
rename-command DEBUG ""
```

---

## 2. Persistence & Memory Policy

AdEarn AI requires Redis persistence for queued jobs and distributed lock states:

- **Append-Only File (AOF)**: `--appendonly yes`
- **Memory Cap**: `maxmemory 512mb`
- **Eviction Policy**: `maxmemory-policy allkeys-lru` (least recently used keys evicted when threshold reached, preserving recent tokens).

---

## 3. Testing Redis Health & Operations

```bash
# Connect to Redis CLI inside Docker container
docker compose exec redis redis-cli -a "AdearnSecureRedis2025!" ping
# Returns: PONG

# Check memory and keyspace stats
docker compose exec redis redis-cli -a "AdearnSecureRedis2025!" info memory
docker compose exec redis redis-cli -a "AdearnSecureRedis2025!" info stats
```
