# Owner ↔ Taskr task query contract

**Status:** **Locked guiderail** (2026-09-01)  
**Milestone:** `WS-OPS / M-OPS-03` Phase 1a–1d (read-only tenant drill-down)  
**Audience:** HQ Owner app (`apps/owner/`), Taskr mobile (`src/state/taskStore.supabase.ts`), Edge `owner-tenant-read`  
**Related:** Multi-agent evaluation SYNC NOW ([risks](agent://6ecf1b0c-7f06-44b1-ada6-63afbb31952a), [validation](agent://d3edbeb0-e973-423a-ba36-31b1b5e3a1d1)); kickoff [`docs/superpowers/plans/2026-08-30-m-ops-03-owner-internal-tf-kickoff.md`](../docs/superpowers/plans/2026-08-30-m-ops-03-owner-internal-tf-kickoff.md)

---

## Guiderail policy (locked)

**Synchronization is governance, not a shared codebase.**

| In scope | Out of scope |
|----------|--------------|
| Same **predicates** (lifecycle, assignee, scope, counts) | Same **runtime module** (no cross-Expo/Deno npm package) |
| Same **parity fixtures + tests** | Same **sort order** or **column payloads** |
| Edge reads **only tables/columns Taskr uses** for the same concept | Edge inventing parallel models (`task_assignments` while Taskr uses `assigned_to[]`) |
| Contract amendment before new task-read Edge actions | Using sync as excuse to bloat Edge with full Taskr task shape |

**Veto rule:** Any HQ task read that cannot cite a section of this document is out of scope until the contract is amended.

**DDL rule (v1):** Align behavior in TypeScript first. A read-only DB view/RPC is allowed only after the same predicate is duplicated **3+ times** or Edge delivery is blocked — always Human Gate.

This document is the **semantic source of truth**. Implementations stay local; drift is caught by parity tests, not code sharing.

---

## 1. Purpose

Prevent operator-trust defects where HQ shows tasks, counts, or assignees that disagree with Taskr field reality.

**Canonical incident (2026-09-01):** HQ `listTasks` queried `public.task_assignments`, which was absent from DEV schema cache. Taskr SoT for assignees is `tasks.assigned_to[]` + `primary_assignee_id` (text, post M-SUPABASE-03b). HQ must not introduce a third assignee path.

**Delivery loop:** contract (this doc) → local implementations → parity tests → Judge GO on alignment slices.

---

## 2. Surfaces in scope

| Surface | Transport | Auth | Scope key |
|---------|-----------|------|-----------|
| Taskr Tasks tab | Supabase client | JWT + RLS | Session-visible projects |
| Taskr project tasks | Supabase client | JWT + RLS | `projectId` |
| Taskr user tasks | Supabase client | JWT + RLS | `userId` |
| HQ company / project / user task lists | Edge `listTasks` | Platform-owner JWT + service role | `companyId`, optional `projectId`, optional `userId` |
| HQ task detail | Edge `getTask` | Platform-owner JWT + service role | `taskId` + `companyId` |
| HQ project summary | Edge `getProject` | Platform-owner JWT + service role | `projectId` + `companyId` |
| HQ company detail stats | Edge `getCompany` | Platform-owner JWT + service role | `companyId` |
| HQ project list row counts | Edge `listProjects` | Platform-owner JWT + service role | `companyId` |

Every row that displays a **task count** or **task list** for operators is in scope.

---

## 3. Non-goals (explicit)

- **No shared npm package** imported by Expo and Deno Edge.
- **No new DDL** for contract v1 alignment (no views, RPCs, or `task_assignments` reads).
- **No write/mutation semantics** — read/list/count/detail only.
- **No requirement** that HQ and Taskr return identical columns, pagination UX, or sort order (see §7).
- **No merging** HQ into Taskr or vice versa.

---

## 4. Named predicates (spec)

Implementations must behave as if these named rules exist (extract to helpers locally; names are normative for reviews).

### 4.1 `TASK_LISTABLE` — default list/count membership

A task is **listable** iff:

```sql
deleted_at IS NULL
AND archived_at IS NULL
AND cancelled_at IS NULL
```

| Tombstone | Taskr | HQ Edge (pre-alignment) | **Contract** |
|-----------|-------|-------------------------|----------------|
| `deleted_at` | ✓ filtered | ✓ filtered | **required** |
| `archived_at` | ✓ filtered | ✓ filtered | **required** |
| `cancelled_at` | ✓ filtered | ✗ not filtered | **required — align HQ** |

**Decision (locked):** Cancelled tasks are **excluded** from default HQ lists and counts (match Taskr). A future `includeCancelled` operator mode requires contract v2.

**Detail exception:** `getTask` by id may return a tombstoned row for audit, but list/count/stats paths **must** apply `TASK_LISTABLE`.

**Supabase expression (Edge / Taskr):**

```ts
.is("deleted_at", null)
.is("archived_at", null)
.is("cancelled_at", null)
```

---

### 4.2 User-related task membership (terminology lock)

| Term | Meaning | Columns |
|------|---------|---------|
| **Assigner** | Who assigned / owns the assignment | `assigned_by` |
| **Assignee** | Who the task is assigned **to** (does the work) | `assigned_to[]`, `primary_assignee_id` |
| **Delegate** | Non-primary helper assignee | `delegated_user_ids[]` (and members of `assigned_to` who are not primary) |

Assigner **owns** the task administratively. Assignee does **not** “own” the task.

#### 4.2a `TASK_ASSIGNED_TO_USER(U)` — Taskr field list only

Field workers see work assigned **to** them:

```sql
assigned_to @> ARRAY[U]::uuid[]
OR primary_assignee_id = U::text
```

#### 4.2b `TASK_RELATED_TO_USER(U)` — HQ User → Tasks (admin full picture)

HQ operators need every listable task in the company that touches `U`:

```sql
assigned_by = U                          -- assigner
OR assigned_to @> ARRAY[U]::uuid[]       -- assignee
OR primary_assignee_id = U::text         -- primary assignee
OR delegated_user_ids @> ARRAY[U]::text[] -- delegate (include when column present)
```

Each list row **should** expose `relationRoles: ("assigner" | "assignee" | "delegate")[]` so the UI can show the whole picture.

| Surface | Predicate |
|---------|-----------|
| Taskr `fetchTasksByUser` | `TASK_ASSIGNED_TO_USER` only |
| HQ `listTasks` + `userId` | `TASK_RELATED_TO_USER` |

**Forbidden until Human Gate + Taskr migration:** reads from `task_assignments` for list/count/detail.

**Assignee count (detail):** unique people in `assigned_to[]`, else `1` if `primary_assignee_id` set, else `0`.

---

### 4.3 `TASK_IN_COMPANY(C)` — HQ project scope

```sql
tasks.project_id IN (
  SELECT id FROM projects WHERE company_id = C
)
```

Taskr equivalent: RLS + session project visibility (implicit). Cross-company task leakage in HQ is a **safety defect**.

Every HQ task read must verify `project.company_id === companyId` (or equivalent join) before returning data.

---

### 4.4 `TASK_EFFECTIVE_STATUS(row)` — display and filter

```ts
effective_status = row.status ?? row.current_status ?? "new"
```

- List/detail display uses `effective_status`.
- HQ optional `status` filter on `listTasks` compares against `effective_status`.
- Taskr store normalization must not show `'new'` when `status` column is populated and `current_status` is stale.

---

### 4.5 `TASK_SEARCH_TITLE(q)` — HQ server search (v1)

- Input: trimmed, max 80 chars, strip `% * _`.
- Match: case-insensitive `title ILIKE '%' || q || '%'`.
- **Does not** search assignee name, project name, or status string.

Client UI **must not** advertise multi-column search until contract v2 expands server search.

---

## 5. Count semantics (locked)

**Invariant:** For the same env, scope, and time, all of the following use **`TASK_LISTABLE` + scope predicates**:

| Metric | Handlers |
|--------|----------|
| Project summary `taskTotal` / `tasksByStatus` | `getProject` |
| Company hero `stats.tasks` | `getCompany` |
| Project row `taskCount` | `listProjects` |
| List `total` + row set | `listTasks` |

**Pre-alignment gaps (A1 closed 2026-09-01):**

| Handler | Was | Now |
|---------|-----|-----|
| `handleGetProject` | All tasks by `project_id` | `TASK_LISTABLE` |
| `handleGetCompany` | Head count without lifecycle | `countListableTasksForProjects` |
| `handleListProjects` / `handleListAllProjects` | Raw project_id counts | `countListableTasksByProjectId` |
| `handleListTasks` | Missing `cancelled_at` | `applyTaskListable` via `applyTaskListScope` |

Operator-visible symptom (summary ≠ drill-down) should be resolved after Edge deploy.

---

## 6. Search UX (HQ)

| Layer | v1 behavior |
|-------|-------------|
| Edge `listTasks` `query` | `TASK_SEARCH_TITLE` only |
| `TaskListPane` | Must align label/placeholder with title-only search; remove or defer client-side assignee/project filtering that sends `query` to Edge |

---

## 7. Allowed intentional differences (locked)

| Dimension | Taskr | HQ | Change policy |
|-----------|-------|-----|---------------|
| Sort default | `created_at DESC` | `updated_at DESC` | Do not align without contract v2 |
| Pagination | Zustand cache | Edge `limit`/`offset` | OK |
| Payload shape | Full task domain | Operator subset | OK |
| Auth | RLS | Service role + owner allowlist | OK |
| User list memory | N/A | User-scoped `listTasks` merges two queries in memory before slice | OK for v1; revisit if tenant scale breaks Edge limits |

---

## 8. Implementation map

| Predicate | Taskr entrypoints | HQ Edge entrypoints |
|-----------|-------------------|---------------------|
| `TASK_LISTABLE` | `fetchTasks`, `fetchTasksByProject`, `fetchTasksByUser` | `applyTaskListScope`, **`handleGetProject`**, **`handleGetCompany`**, **`handleListProjects`** |
| `TASK_ASSIGNED_TO_USER` | `fetchTasksByUser` | — (field only) |
| `TASK_RELATED_TO_USER` | — | `fetchUserScopedTaskRows` (assigner ∪ assignee ∪ delegate) |
| `TASK_IN_COMPANY` | (RLS) | `companyProjectIds`, `assertProjectInCompany`, all task handlers |
| `TASK_EFFECTIVE_STATUS` | store normalize / map | `mapTaskListItem`, `handleGetTask`, `handleGetProject` status buckets |
| `TASK_SEARCH_TITLE` | N/A | `handleListTasks` |

**Files (only these may implement task query semantics):**

| File | Role |
|------|------|
| `src/state/taskStore.supabase.ts` | Taskr reads |
| `supabase/functions/owner-tenant-read/index.ts` | HQ Edge reads |
| `apps/owner/src/lib/fetchOwnerTenantRead.ts` | Parse/transport only — **no query predicates** |
| `apps/owner/src/screens/tenant/TaskListPane.tsx` | Search UX must match §6 |

**Edge internal rule:** New helpers compose named predicates; handlers do not inline alternate lifecycle rules.

---

## 9. Alignment backlog (ordered)

Contract is locked; code is **not yet fully aligned**. Work slices should follow this order:

| Order | Item | Surfaces | Status |
|-------|------|----------|--------|
| A1 | Apply `TASK_LISTABLE` to all HQ count paths (`getProject`, `getCompany`, `listProjects`, `listTasks`) | HQ Edge | **Shipped 2026-09-01** |
| A2 | Apply `TASK_ASSIGNED_TO_USER` OR to Taskr `fetchTasksByUser` | Taskr | **Shipped 2026-09-01** |
| A3 | Apply `TASK_EFFECTIVE_STATUS` on read in both surfaces | Both | **Shipped 2026-09-01** |
| A4 | Align `TaskListPane` search UX to `TASK_SEARCH_TITLE` | HQ client | **Shipped 2026-09-01** |
| A5 | Parity Jest + smoke extension (§10) | CI | **Shipped 2026-09-01** (Jest); Edge smoke `listTasks.statusFilter` after DEV deploy |
| — | Consider read-only DB view | **Deferred** (§11) |

Claiming “contract aligned” requires A1–A5 complete + Judge GO.

---

## 10. Parity proof (required before aligned claim)

### Fixture matrix

| ID | Scenario | Listable? | User-scoped (U)? |
|----|----------|-----------|------------------|
| T1 | Active; `assigned_to ∋ U` | Yes | Yes |
| T2 | Active; `primary_assignee_id = U`; empty `assigned_to` | Yes | Yes |
| T3 | `deleted_at` set | No | No |
| T4 | `archived_at` set | No | No |
| T5 | `cancelled_at` set | No | No |
| T6 | `status` only (`in_progress`) | Yes | — |
| T7 | `current_status` only (legacy) | Yes; effective status matches T6 | — |

### Tests

1. **Jest contract** — `src/__tests__/parity/task-query-contract.parity.test.ts`: pure predicate functions on fixtures (shared spec, dual implementations tested separately or via exported test vectors).
2. **Edge smoke** — extend `scripts/supabase/smoke-owner-tenant-read-dev.mjs`: `getProject.taskTotal === listTasks(projectId).total` for seeded tenant.
3. **HQ manual** — Project summary Tasks count === `TaskListPane` total; User Detail Tasks loads without Edge 500.

---

## 11. Edge governance (anti-sprawl guiderail)

### What this contract controls

- **Semantic sprawl** — one definition of listable, assigned, in-company.
- **Table sprawl** — Edge cannot add tables Taskr does not use for the same question.
- **Action sprawl** — new `action:` values require contract section + predicate reuse.

### What this contract does not do

- Shrink `owner-tenant-read/index.ts` (~1.7k lines) without a dedicated refactor slice.
- Replace Edge (HQ still needs service-role + company isolation).
- Remove all DDL forever.

### Sprawl control rules (locked)

| Rule | Enforcement |
|------|-------------|
| One tenant-read Edge | No `owner-tasks-read` fork without split plan |
| Predicate library | `applyTaskListScope`, `fetchUserScopedTaskRows`, shared count helper — **mandatory reuse** |
| No table unless Taskr uses it | Review blocker for Edge PRs |
| Action budget | New read actions cite §4 predicate |
| DDL escalation | 3× duplicate predicate **or** delivery blocked → propose view/RPC + Human Gate |

### DB-layer SoT (deferred)

Optional future: `active_tasks` view encapsulating `TASK_LISTABLE`. **Not part of v1 alignment.** Would amend contract v2 and reduce Edge TS, not replace this guiderail.

---

## 12. Change control

1. Amend this doc **first**, then implementations, then parity tests — same cycle.
2. Product changes to cancelled visibility, assignee model, or search scope = contract version bump.
3. `task_assignments` adoption = contract v2 + Taskr + Human Gate — never Edge-only.

---

## 13. Decisions log

| Date | Decision |
|------|----------|
| 2026-09-01 | **Sync as guiderail** — predicates + tests, not shared runtime |
| 2026-09-01 | **Cancelled tasks excluded** from default HQ lists/counts |
| 2026-09-01 | HQ User→Tasks = `TASK_RELATED_TO_USER` (assigner ∪ assignee ∪ delegate); Taskr stays assignee-only |
| 2026-09-01 | Terminology: assigner owns; assignee executes |
| 2026-09-01 | **Sort difference allowed** (`created_at` vs `updated_at`) |
| 2026-09-01 | **DB view deferred** until 3× duplication or blocked delivery |
| 2026-09-01 | **`task_assignments` deferred** until live everywhere + Taskr reads it |

---

## 14. Revision log

| Date | Version | Change |
|------|---------|--------|
| 2026-09-01 | draft | Initial draft post multi-agent evaluation |
| 2026-09-01 | **locked guiderail** | Follow-up pass: named predicates, alignment backlog, count-gap audit, decisions closed, enforcement rules |
| 2026-09-01 | A2 aligned | Taskr `fetchListableTasksAssignedToUser` — assignee-only |
| 2026-09-01 | A3–A5 aligned | `TASK_EFFECTIVE_STATUS` on Taskr+HQ reads; HQ title-only search UX; parity Jest T1–T7 |
