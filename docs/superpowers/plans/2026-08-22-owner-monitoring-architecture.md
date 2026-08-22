# Owner monitoring architecture (M-OPS-01)

**Date:** 2026-08-22  
**Status:** Active — v1 building  
**Parent:** `2026-08-22-owner-console-modules-complete.md`  
**Harness:** Profile → Owner Console → **System monitoring** (and sibling sections)

---

## Objective

Platform owner (solo founder) sees **production health** from TestFlight while away. Mobile is a **pull dashboard + inspect path**; server holds platform truth. Not a full ops platform at RC scale (~100 tasks, handful of tenants).

---

## Architecture (Owner Snapshot)

```text
Expo clients (all users)
  • Company-scoped writes (normal RLS)
  • v2: batched owner_exception_events (F-003, upload fail, api_error)
  • v3: Sentry (optional)

Supabase Postgres
  • v2: platform_owners
  • v2: RPC owner_kpi_snapshot(window)
  • v2: RPC owner_workflow_gaps() — SQL classifier twin
  • v2: owner_exception_events
  • v3: ops_metric_daily, ops_integrity_run (when history needed)

Owner Console (mobile, Tristan JWT)
  • KPI ← RPC (v2); v1 = honest stubs
  • Gaps: Loaded (Zustand) | Database (RPC, v2)
  • F-003: session diagnostic (v1); durable exceptions (v2)
  • Deep links / copy → Supabase + Stripe dashboards

External: Supabase Dashboard (infra), Stripe Dashboard (revenue), uptime monitor (v3)
```

**Never:** service-role key in mobile; live `COUNT(*)` from client without guarded RPC; fake KPIs from Zustand totals.

---

## Five planes

| Plane | RC+0 (v1–v2) | Implementation |
|---|---|---|
| **Observation** | Product counts + client exceptions | DB rows + batched events |
| **Storage** | Small tables only | `platform_owners`, `owner_exception_events`, later rollups |
| **Query** | Fixed RPCs or Edge gateway | `owner_kpi_snapshot`, `owner_workflow_gaps` |
| **Alert** | Defer custom push | v3: email/Sentry/uptime |
| **Integrity** | TS loaded + SQL authoritative | Shared gap rule IDs; Jest parity |

---

## Integrity contract

| Surface | Question | v1 | v2+ |
|---|---|---|---|
| **Loaded Gaps (TS)** | Does my session see bad tasks? | Live | Live |
| **Database Gaps (SQL)** | Is Postgres clean? | — | RPC |
| **F-003** | Silent 6-col strips? | Session counter | Durable events + alert if >0 |

Drift between TS and SQL counts → monitoring signal (sync/cache/classifier bug).

---

## Minimal schema (v2 Human Gate)

```sql
-- platform_owners: user_id PK → auth.users

-- owner_exception_events:
--   id, occurred_at, kind, code, actor_user_id,
--   company_id?, project_id?, task_id?, payload jsonb (no PII)

-- RPC owner_kpi_snapshot(from, to) → counts + generated_at
-- RPC owner_workflow_gaps() → task_id, codes[] (capped sample)
```

Auth: `SECURITY DEFINER` RPCs check `auth.uid() IN platform_owners`. Client allowlist remains **UI hide only**.

Do **not** add `platform_superuser` to jobsite `users.role` CHECK.

---

## Build vs buy (this scale)

| Use now | Build v2 | Defer |
|---|---|---|
| Supabase Dashboard | 2 owner RPCs + exception log | Warehouse, log drains |
| Stripe Dashboard | Client exception flush | Datadog |
| — | SQL integrity auditor (scheduled) | Daily rollup until history needed |

---

## Version phases

See `2026-08-22-owner-console-modules-complete.md` § Version phases (v1/v2/v3).

---

## Do not build (at this scale)

1. Service-role in Expo bundle  
2. Mobile full-table scans for KPIs  
3. Fake platform numbers from loaded store  
4. Manual p95 presented as live monitoring  
5. Full `app_events` for every tap  
6. Economics / tenant **writes** on phone  
7. “Zero logins 24h” alerts with few customers  

---

## References

- Modules plan: `2026-08-22-owner-console-modules-complete.md`
- Gaps classifier: `2026-08-19-workflow-gaps-bin.md`
- Multi-model synthesis: 2026-08-22 strategic + architecture reviews
- F-003: `src/api/deferredSchemaObservability.ts`
