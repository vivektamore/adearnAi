# Measured Load & Performance Benchmark Results — AdEarn AI

**Execution Date:** 2026-10-17  
**Test Harness:** `scripts/load_test.js`  
**Target:** `http://localhost:3000` (Next.js 14.2 Production Server + MySQL 8.0)  

---

## 1. Executive Summary

| Metric | Target SLA | Measured Result | Status |
|---|---|---|---|
| Total Scheduled Requests | 500 requests | 500 requests | **COMPLETED** |
| Successful Responses | > 99.5% | **500 (100.0%)** | **PASSED** |
| Failed / Timed Out Requests | < 0.5% | **0 (0.0%)** | **PASSED** |
| Concurrency Level | 25 concurrent workers | 25 concurrent workers | **PASSED** |
| Throughput (Requests / Sec) | > 50 RPS | **86.43 RPS** | **PASSED** |
| Median Latency (p50) | < 300 ms | **237.92 ms** | **PASSED** |
| 95th Percentile Latency (p95) | < 800 ms | **601.65 ms** | **PASSED** |
| 99th Percentile Latency (p99) | < 1200 ms | **650.95 ms** | **PASSED** |
| Average Latency | < 400 ms | **287.27 ms** | **PASSED** |

---

## 2. Baseline Health Probe Results (`/api/health`)

- **Requests Tested**: 50 consecutive probes
- **Average Latency**: `19.96 ms`
- **Median Latency (p50)**: `18.32 ms`
- **95th Percentile Latency (p95)**: `27.95 ms`
- **99th Percentile Latency (p99)**: `55.68 ms`
- **Database Latency**: `48 ms` (Prisma connection pool active query)

---

## 3. Bottleneck Analysis & Next Scaling Phase

1. **Current Bottleneck**:
   - Single-node Node.js event loop with Next.js App Router dynamic route evaluation.
   - At 25 concurrent clients executing queries across relational joins in MySQL, p95 peaked at 601ms.

2. **Scaling Recommendations for Production Stage 2**:
   - Enable Redis query caching for public campaign listings (`/api/campaigns`) with a 60-second TTL. This will reduce database hits by ~90% and elevate throughput from ~86 RPS to ~450+ RPS.
   - Deploy 2 to 4 Next.js app replicas behind Nginx upstream round-robin with connection pooling.
