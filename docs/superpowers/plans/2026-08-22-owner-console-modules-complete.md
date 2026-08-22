# Owner Console — complete module plan (M-OPS-01)

**Date:** 2026-08-22  
**Updated:** 2026-08-22 (three-section IA: Monitoring / Economics / Tenant ops)  
**Status:** Planning complete — ready for build kickoff with web track  
**Harness:** Taskr mobile → Profile → Owner Console (platform superuser only)

---

## Information architecture (locked 2026-08-22)

Three top-level sections separate **watch** (monitoring), **money** (economics), and **do** (tenant operations).

```
Profile → Owner Console
│
├─ [1] System monitoring              ← health, KPIs, data integrity (read-only)
│     ├─ KPI dashboard
│     ├─ Reliability & incidents
│     └─ Data integrity
│           ├─ Workflow Gaps                    ← live (Phase A)
│           ├─ Platform audit / SQL twin        ← Phase B (Human Gate)
│           └─ Deferred-schema strip counter    ← F-003 observability
│
├─ [2] Economics                      ← platform P&L view (read-only v1)
│     ├─ Revenue
│     ├─ Platform costs (incremental)
│     └─ Unit economics & margin
│
└─ [3] Tenant operations              ← actions + per-tenant rollups
      ├─ Plans & entitlements
      ├─ Users & companies
      ├─ Usage vs caps (per company)
      └─ Owner audit log (mutations)
```

**Not on Owner Console:** company-admin User Management (Henry), Activity/Tasks gaps, user feedback inbox (parked → optional future **Product signals** under Monitoring), Wave 2 DMS UI, jobsite/project cost (`M-COST-01`).

**Metric placement rule**

| Question | Section |
|---|---|
| How is the **platform** doing today? | System monitoring → KPI |
| Is **infra / core loop** healthy? | System monitoring → Reliability |
| Is **data** trustworthy? | System monitoring → Data integrity |
| What do we **earn** vs **spend**? | Economics |
| What do I **change** for a tenant? | Tenant operations |

Platform KPIs = aggregates. Per-company usage vs plan caps = Tenant operations → Usage vs caps (not KPI dashboard).

---

## Section 1 — System monitoring

Read-only. No tenant mutations from this section.

### 1a — KPI dashboard

| | |
|---|---|
| **Status** | Planned (B2) |
| **Purpose** | Platform-wide product health at a glance |
| **Time windows** | Today / 7d / 30d with % change vs prior period |

**v1 metrics**

| Metric | Notes |
|---|---|
| Logins / DAU / WAU | Auth session or `last_sign_in` rollup |
| New users | Auth + `users` row created |
| New companies | `companies` created |
| New projects | `projects` created |
| Tasks created | `tasks` INSERT count |
| Photos uploaded | Storage + upload success path |
| Active projects | Projects with activity in window |

**Phase B+ — activation funnel**

Signup → first project → first task → first photo (conversion rates, not just counts).

**Phase B+ — promo attribution**

Requires lightweight source field at signup (`signup_source`, UTM, or invite code). Bridge “traffic from promotions” in Economics → Revenue proxy until Stripe ties out.

**Data source v1:** daily rollup table or Edge cron → owner read API. Avoid heavy live scans on mobile.

### 1b — Reliability & incidents

| | |
|---|---|
| **Status** | Planned (B5) |
| **Purpose** | Critical delays, outages, and core-loop failure visibility |

**v1 signals**

| Signal | Source |
|---|---|
| API / PostgREST error rate | Supabase logs or app error hook |
| Slow queries (p95) | Supabase dashboard import or manual entry v1 |
| Realtime disconnect / stale-after-nav | Existing reconnect observability |
| Photo upload failure % | Upload service + taskStore hooks |
| Task create failure % | taskStore error path |
| Auth error spikes | Auth logs / failed login count |
| Security anomalies | Failed login spikes; cross-project access attempts when RLS logging exists |

**Incidents v1:** owner-entered outage / degraded notes + timestamps (manual). Optional public status page link later.

**Phase C — alerting:** threshold rules → email/push when away (upload failures > X, zero logins 24h, etc.). Mobile console alone is pull-only.

**Phase B+ — release health:** % users on current app build (TestFlight vs store); useful after Owner Console ships on TF.

### 1c — Data integrity

#### Workflow Gaps (live)

| | |
|---|---|
| **Status** | **Live** (Phase A) |
| **Purpose** | Illegal / unintended task states in the **loaded** client store |
| **Actions v1** | Inspect → Task Detail; no delete/repair |
| **Label** | “Loaded tasks only — not a full-table audit.” |
| **Out of scope** | Activity/Tasks UI; swipe-delete; auto-repair |
| **Code** | `src/utils/taskWorkflowGaps.ts`, `WorkflowGapsScreen.tsx` |

#### Platform audit / SQL twin (Phase B)

| | |
|---|---|
| **Status** | Planned — Human Gate |
| **Purpose** | Cross-tenant read-only SQL: gap counts, subscription health, orphan rows, storage/DB mismatch |
| **Requires** | `platform_superuser` RLS or service-role read script |
| **Not** | Live repair from audit screen |

#### Deferred-schema strip counter (F-003)

| | |
|---|---|
| **Status** | Planned — surface existing observability |
| **Purpose** | Count silent 6-col strips (`deferredSchemaObservability.ts`) as data-integrity KPI |
| **Columns** | primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site |

**Validation:** Jest classifier; headed Tristan → gaps; Henry → no Profile entry; SQL twin before “database is clean” claims.

---

## Section 2 — Economics

Platform P&L view. Read-only in v1; manual cost entry until provider APIs.

### 2a — Revenue

| | |
|---|---|
| **Status** | Planned (B3) |
| **SoT when live** | **Stripe** (MRR, subs, add-ons) — not proxy counts alone |
| **R6 paper today** | `src/billing/orgPlans.ts`; R7 = checkout CTA only |

**Panels**

| Panel | v1 | Live |
|---|---|---|
| MRR / ARR | Manual or Stripe Dashboard import | Stripe webhook sync |
| New subscriptions / trial→paid | Stripe + entitlements table | Webhook |
| Add-on seats (worker pack, PM seat) | Stripe | Webhook |
| Churn / cancelled | Stripe | Webhook |
| Usage → revenue **bridge** | New users / tasks / photos by company; promo-attributed signups | Proxy until metered billing |
| Stripe reconciliation | Flag when proxy ≠ Stripe | Required before “revenue” is trusted |

**Not v1:** customer self-serve plan change portal (dedicated billing milestone when Stripe live).

### 2b — Platform costs (incremental)

| | |
|---|---|
| **Status** | Planned (B3 stubs → B4 feeds) |
| **Purpose** | Variable infra spend tied to usage growth |

| Cost line | When |
|---|---|
| Supabase (DB, storage, egress, auth MAU) | Now |
| Web hosting (Vercel) | When M-WEB ships |
| AI tokens / inference | When M-AI-01+ |
| BYO storage egress | Deferred (`WS-STORAGE`) |

**v1:** manual monthly entry per line. **v2:** provider API pulls (Supabase billing API, Vercel, OpenAI usage).

### 2c — Unit economics & margin

| | |
|---|---|
| **Status** | Planned (after 2a + 2b have data) |
| **Examples** | Cost per active company; cost per 1k photos; gross margin estimate |
| **Depends on** | Both revenue and cost sides populated |

**Not:** jobsite/project cost (`M-COST-01`); invoice generation.

---

## Section 3 — Tenant operations

Actions and per-tenant rollups. Human Gate before live writes.

### 3a — Plans & entitlements

| | |
|---|---|
| **Status** | Planned (B4) |
| **Purpose** | Tier catalog, Stripe subscription state, seat/project/storage **gates** |
| **DB (Human Gate)** | e.g. `plan_tiers`, `company_subscriptions`, `company_entitlements` — sync from Stripe webhooks |
| **Gates (Phase C)** | Block create user / create project / upload when over cap |
| **UI v1** | List companies + plan + caps + usage summary; manual override for owner |
| **Depends on** | Stripe webhook endpoint (server/Edge); schema Human Gate |

### 3b — Users & companies

| | |
|---|---|
| **Status** | Planned (B4) |
| **Plan** | `2026-08-22-owner-console-user-management.md` |
| **Purpose** | Owner create / deactivate; **bind `company_id` at create only** |
| **Hard rule** | **No company switch** for existing users |
| **Coupling** | Create user → entitlements seat check (3a) when live |
| **Human Gate** | Service-role or `platform_superuser` write path |
| **Distinct from** | Henry `UserManagementScreen`, web `/a/users`, M-AUTHZ-02 project invite |

### 3c — Usage vs caps (per company)

| | |
|---|---|
| **Status** | Planned (B4) |
| **Purpose** | Tenant rollup: projects, task/entry counts, storage bytes vs entitlement caps |
| **Aligns with** | `M-DMS-DATA` metering (Wave 2); read-only first |
| **UI v1** | Table: company → usage vs caps; drill read-only |

Distinct from Section 1 KPI totals (platform-wide).

### 3d — Owner audit log

| | |
|---|---|
| **Status** | Planned (with B4 writes) |
| **Purpose** | Every owner mutation: user create/deactivate, plan override, entitlement bypass |
| **Visible from** | Tenant ops; summarized in Economics as “manual adjustments” |

---

## Parked / deferred (named, not built)

| Item | Future home | Why defer |
|---|---|---|
| User feedback inbox | Monitoring → Product signals | Parked product decision |
| Jobsite cost | Not Owner Console | `M-COST-01` — customer-facing |
| Full billing portal | Dedicated billing milestone / M-OPS-01 B4+ | M-WEB-03 = reports/branding, not billing |
| BYO storage costs | Economics costs | `WS-STORAGE` deferred |
| CI / Maestro health | Monitoring → Reliability (optional) | Solo-dev ops; low priority |

---

## Version phases (Owner Snapshot — locked 2026-08-22)

Architecture SoT: `2026-08-22-owner-monitoring-architecture.md`

### v1 — TestFlight / away (no schema Human Gate) **← building**

| In | Out |
|---|---|
| Three-section shell + section screens | Platform KPI numbers from client store |
| Workflow Gaps under Monitoring → Data integrity | SQL twin in-app |
| KPI + reliability honest stubs | Tenant ops writes |
| F-003 session counter (labeled) | Economics dollar amounts |
| Economics / Tenant ops preview stubs | Alerts, rollup cron |

**Exit:** Tristan → Monitoring → Gaps → Task Detail; Henry no entry.

### v2 — First monitoring Human Gate

- `platform_owners` + `owner_kpi_snapshot` + `owner_workflow_gaps` RPCs
- `owner_exception_events` + client flush
- Gaps Loaded / Database toggle; audit log before writes

### v3 — Pull insufficient

- Alerting; optional daily rollups; Sentry/uptime
- Web `/owner/*` reuses RPCs; tenant writes via Edge only

**Then M-OPS-02** (core-loop tightness) — parallel ok after v1 close.

---

## Build phases (legacy map)

| Phase | Version | Deliverable | Human Gate? |
|---|---|---|---|
| **A** | v1 partial | Harness + Workflow Gaps | No (**done**) |
| **B1** | **v1** | Three-section nav + section screens | No (**in progress**) |
| **B2** | **v2** | KPI from RPC (not client scan) | **Yes** |
| **B3** | v1 stub / v3 live | Economics external v1 | Stripe when live |
| **B4** | v2–v3 | Audit → tenant ops via Edge | **Yes** |
| **B5** | **v2** | SQL twin + durable F-003 | **Yes** |
| **C** | **v3** | Alerts, rollups, enforcement | After v2 |

---

## Acceptance

### Planning — complete

- [x] IA + monitoring architecture + v1/v2/v3

### v1 build — in progress

- [x] Three-section shell + Monitoring/Economics/Tenant screens
- [ ] Headed smoke PNGs

## References

- **Monitoring architecture:** `2026-08-22-owner-monitoring-architecture.md`
- Gaps classifier: `2026-08-19-workflow-gaps-bin.md`
- Users module: `2026-08-22-owner-console-user-management.md`
- Dual-track kickoff: `2026-08-22-dual-track-kickoff-owner-console-and-web.md`
- Deferred schema F-003: ROADMAP / findings backlog
- Billing paper SKUs: `src/billing/orgPlans.ts`
