# Production MySQL 8.0 Database Setup & Tuning — AdEarn AI

AdEarn AI requires MySQL 8.0 with InnoDB, ACID transactional compliance, strict collation, and connection pool optimization.

---

## 1. Relational Character Set & Collation

To prevent corruption of international symbols, Indian script names (Devanagari, Tamil, Telugu), and emojis, all tables use:
- Character Set: `utf8mb4`
- Collation: `utf8mb4_unicode_ci`

Configured in Docker MySQL command:
```bash
--character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
```

---

## 2. Dedicated Application User & Least-Privilege Grants

Never connect the Next.js application using `root`. Create a dedicated user `adearn_user` with restricted privileges:

```sql
-- Connect as root
docker compose exec -it db mysql -u root -p

-- Create Database if not exists
CREATE DATABASE IF NOT EXISTS adearn_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create User
CREATE USER IF NOT EXISTS 'adearn_user'@'%' IDENTIFIED BY 'AdearnSecureDB2025!';

-- Grant required operational privileges
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES ON adearn_ai.* TO 'adearn_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;
```

---

## 3. Recommended Performance Parameters (`my.cnf`)

For a dedicated server with 4GB to 16GB RAM, place these parameters in `/etc/mysql/conf.d/adearn-perf.cnf`:

```ini
[mysqld]
# Buffer Pool Size (approx 60-70% of available RAM on dedicated DB host)
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 1   # ACID strict compliance for financial ledger
innodb_flush_method = O_DIRECT

# Connection Limits
max_connections = 300
wait_timeout = 600
interactive_timeout = 600

# Slow Query Logging
slow_query_log = 1
slow_query_log_file = /var/lib/mysql/slow-query.log
long_query_time = 0.5   # Log queries taking longer than 500ms
```

---

## 4. Connection Pooling Configuration

Prisma manages connection pooling via the connection string query parameter:
```
mysql://adearn_user:password@db:3306/adearn_ai?connection_limit=30&pool_timeout=10
```

Recommended pool sizes:
- Single App replica: `connection_limit=30`
- Multiple App replicas (e.g., 3 instances): `connection_limit=15` per instance (total 45 connections, well within `max_connections=300`).
