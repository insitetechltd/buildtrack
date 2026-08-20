# M-DATA-04 Realtime gate (Dashboard SQL)

**Project:** production (`zusulknbhaumougqckec`).  
**Who:** Owner / Administrator / Developer can **Run** these in SQL Editor. Reset may need Owner/Admin if privilege errors.  
**Clients:** 1–2 logged-in apps only (phone + Mac device is OK). **No Simulator. No Maestro.** Idle — no pull-to-refresh, no user switch, no app bounce.

Last reset (this cycle): `pg_stat_statements_reset` → **2026-08-20 05:15:41.56215+00** (13:15 HKT).  
Fair sample: wait **10 minutes** after that (`~05:25 UTC` / 13:25 HKT), then run **A + B**. Do not reset again in this window.

Prior reset `04:47:54+00` is closed (13-min idle, pre-185).

`pg_stat_statements` has **no timeline**. Totals are since the last reset only.

---

## 0) Reset (once, then wait 10 minutes)

```sql
SELECT pg_stat_statements_reset();
```

If A/B error with insufficient privilege:

```sql
GRANT pg_read_all_stats TO postgres;
```

Then retry A/B. Do **not** reset again unless starting a new window.

---

## A) What is burning time

```sql
SELECT
  left(query, 180) AS query_head,
  calls,
  round(total_exec_time::numeric, 1) AS total_ms,
  round(mean_exec_time::numeric, 3) AS mean_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 15;
```

---

## B) Realtime subscribe churn

```sql
SELECT
  left(query, 120) AS query_head,
  calls
FROM pg_stat_statements
WHERE query ILIKE '%realtime.subscription%'
   OR query ILIKE '%list_changes%'
ORDER BY calls DESC
LIMIT 10;
```

---

## C) Seq scans (optional)

```sql
SELECT
  relname AS table_name,
  seq_scan,
  idx_scan,
  n_live_tup
FROM pg_stat_user_tables
ORDER BY seq_scan DESC
LIMIT 15;
```

`subscription.n_live_tup` ≈ **current** Realtime subscription rows (not historical call count).

---

## Pass / fail (10 min idle, 1–2 clients)

| | Pass | Fail |
|---|---|---|
| B: `INSERT` / `with sub_tables` on `realtime.subscription` | Tens to low hundreds of **calls** | Thousands of calls in 10 min |
| A: `list_changes` (`SELECT wal->>`) | Not hundreds of seconds **total_ms** in 10 min | Dominates like the pre-reset dump (~486 s / 81k calls over a long window) |
| App | Sign-in works; no HTTP 522 on auth | Auth HTML/522 |

Pre-reset dumps (A/B/C from 2026-08-20 before reset) are **historical only** — do not use them to close or to claim hygiene failed.

---

## Related

- Investigation: `docs/superpowers/analysis/2026-08-20-db-spike-realtime-churn.md`
- App hygiene: `src/utils/RealtimeSyncManager.tsx`, `src/utils/realtimeReconnect.ts`
