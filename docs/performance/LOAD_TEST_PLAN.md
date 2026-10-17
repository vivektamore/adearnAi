# Load & Stress Test Plan — AdEarn AI

## 1. Objectives

1. Quantify the maximum throughput (RPS) and latency distributions (p50, p95, p99) under sustained concurrent user traffic.
2. Verify zero database connection drops or deadlock timeouts under concurrent campaign browsing and wallet queries.
3. Validate memory and CPU stability of the Next.js runtime and MySQL 8.0 engine.

---

## 2. Test Workload Profiles

### Profile A: Read-Heavy Feed & Campaign Browsing (Simulating peak morning & evening creator activity)
- Target: `/api/campaigns?limit=10&page=1`
- Concurrency: 25 concurrent worker threads
- Volume: 500 requests per benchmark cycle
- Expected SLA: p95 < 800ms, Error Rate < 0.1%

### Profile B: Write-Intensive Task Telemetry & Wallet Accounting
- Target: `/api/tasks/submit`
- Workload: Interactive attention telemetry submissions with kinematic coordinates and dwell timestamps
- Expected SLA: p95 < 600ms, Overdraft Prevention 100%

### Profile C: Baseline Overhead Probe
- Target: `/api/health`
- Workload: Dependency health and latency check
- Expected SLA: avg < 50ms

---

## 3. Test Architecture & Environment

- **Server Hardware**: Local Host (Windows 11 x64, Intel i7/AMD Ryzen, Node.js v20.17.0)
- **Database Engine**: MySQL 8.0 Community Server (Service `MySQL80`, port 3306)
- **Execution Script**: `scripts/load_test.js` using Node.js `perf_hooks` and persistent keepalive HTTP agent.
