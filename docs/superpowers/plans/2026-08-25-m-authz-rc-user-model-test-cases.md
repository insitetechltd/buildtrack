# M-AUTHZ-RC — user model test cases

**Date:** 2026-08-25  
**Construct SoT:** `2026-08-24-company-user-project-model.md`  
**Implement plan:** `2026-08-24-m-authz-rc-implement.md`  
**Milestone:** `WS-AUTHZ / M-AUTHZ-RC`  
**Out of scope:** `M-AUTHZ-02` (liaison / project invite / host-absorb) — only **invariant** cases that prove RC does not paint that corner shut.

Actors (fixtures):

| Alias | Seat | Notes |
|---|---|---|
| Henry | CA (`admin`) | Host company |
| Sarah | PM (`manager`) | Host company |
| Bob | Worker (`member`) | Host company |
| Pat | Worker | Host company |
| Guest | (future partner) | **Not RC** — negative only |

---

## How to read

| Column | Meaning |
|---|---|
| **ID** | Stable case id |
| **Layer** | L1 Jest contract · L2 integration/adapter · L3 headed / Maestro smoke |
| **Status** | `covered` / `gap` / `headed-due` relative to repo as of 2026-08-25 |

---

## A — Layers must not collapse

| ID | Case | Steps / assert | Layer | Status |
|---|---|---|---|---|
| A01 | Invite ≠ place | Invite Worker creates seat only; no `user_project_assignments` row | L1/L2 | gap (invite path) |
| A02 | Place ≠ seat change | Place Bob on job does not change `systemPermission` / billing seat | L1 | covered (`upsert` member) |
| A03 | PA ≠ seat | Crowning Sarah PA does not change her system seat to admin | L1 | gap (explicit assert) |
| A04 | CA alone ≠ job authority | Henry not on Project A → no Project A tasks in field lists | L1 | covered (admin + empty `viewerProjectIds`) |
| A05 | CA+PA on one job only | Henry PA on A, member-only on B → sees all A tasks; B only if membership rules allow | L1/L2 | gap |

---

## B — Place on a job

| ID | Case | Steps / assert | Layer | Status |
|---|---|---|---|---|
| B01 | Same-company pool | Add-member / UM assign roster excludes other-company + pending | L1 | covered |
| B02 | No trade title picker — Project Detail | Add Member UI has no ProjectRole / trade list; helper cites Edit Project for PA | L2 | gap (integration assert) |
| B03 | No trade title picker — User Management | Assign modal has project picker only; no “Select Project Role” | L2 | gap |
| B04 | Default grant = member | Place writes `worker` / `MEMBER_GRANT_CATEGORY` shim | L1 | covered |
| B05 | Both admin directions | Place from Project Detail **and** User Management both call same upsert helper | L2 | gap (adapter spy) |
| B06 | Already on job | Re-place updates, does not duplicate active assignment | L1 | covered |
| B07 | Exclude already-on-job from add pool | `companyUsersEligibleForProjectAdd` excludes assigned ids | L1 | covered |
| B08 | Multi-co invariant | No UI path offers global people directory | L2/L3 | headed-due |

---

## C — Name Project Admin

| ID | Case | Steps / assert | Layer | Status |
|---|---|---|---|---|
| C01 | Label | UI / helper label = “Project Admin” (not Lead PM) | L1/L2 | covered (label + Edit Project copy) |
| C02 | Eligible: CA | Henry on job appears in PA picker | L1/L2 | covered |
| C03 | Eligible: PM | Sarah on job appears in PA picker | L1/L2 | covered |
| C04 | Anti-disguise: Worker | Bob on job **absent** from PA picker; crowning with `candidateUser=Bob` throws | L1/L2 | covered (helper); L2 picker filter covered via ProjectsScreen |
| C05 | Must already be on job | CA/PM not on job **absent** from PA picker | L2 | covered (EditProjectModal filter) |
| C06 | Demote not remove | Crown Sarah → prior Henry PA becomes member, still on job | L1/L2 | covered |
| C07 | Clear PA | Select “No Project Admin” → demote leftover leads to member | L2 | gap (explicit clear case) |
| C08 | Reject worker crown at API | `upsert(..., asProjectAdmin, candidateUser=worker)` throws | L1 | covered |
| C09 | Partner never host PA | Documented invariant; no host-company picker shows partner ids | L1 (pool) | covered by same-company; L3 N/A until AUTHZ-02 |

---

## D — CA same field UI + avatar management

| ID | Case | Steps / assert | Layer | Status |
|---|---|---|---|---|
| D01 | Root tabs | Logged-in CA sees Activity, Camera, Tasks (not AdminDashboard root tab) | L2/L3 | headed-due |
| D02 | Profile → Company management | Avatar → Profile → “Company management” opens Admin Dashboard stack | L2/L3 | gap adapter + headed-due |
| D03 | Company Plan still CA-only | Worker/PM do not see Company management / Company plan entries | L2 | partial (plan covered; management gap) |
| D04 | CA can create task | Create Task form renders for admin (no ban copy) | L2 | covered |
| D05 | CA FAB | Dashboard/Tasks `showCreateTaskFab` true for CA | L2 | gap (adapter unit) |
| D06 | Escape hatch | From Company management, avatar/profile returns to field shell | L3 | headed-due |

---

## E — Task visibility by seat / grant

| ID | Case | Steps / assert | Layer | Status |
|---|---|---|---|---|
| E01 | Worker | Sees only `assignedTo`∋me or `assignedBy`=me | L1 | covered |
| E02 | PM on job | Sees all tasks on assigned projects | L1 | covered |
| E03 | CA field (no dump) | CA with empty membership → no company-wide tasks | L1 | covered |
| E04 | CA on job | CA with `viewerProjectIds=[A]` sees Project A tasks (incl. peer) | L1 | covered |
| E05 | Hold loading | Admin/manager without project scope ready → deny (callers hold loading) | L1 | covered |
| E06 | PA visibility (target) | CA+PA on job sees all job tasks (same as PM band target) | L1 | gap if PA uses worker band today — **verify runtime** |
| E07 | KPI surface | Company management / Admin Dashboard still shows company stats (not field list) | L2/L3 | headed-due |

---

## F — Privileges matrix smoke (construct table)

| ID | Privilege | Henry CA | Sarah PM | Bob Worker | Henry as PA | Layer | Status |
|---|---|---|---|---|---|---|---|
| F01 | Subscribe / seats / invite | Yes | No | No | No (unless CA) | L2/L3 | partial |
| F02 | Create/delete company projects | Yes | No | No | No | L2 | existing projects admin |
| F03 | Company KPIs via avatar | Yes | No | No | No | L3 | headed-due |
| F04 | Same field UI | Yes | Yes | Yes | Yes | L3 | headed-due |
| F05 | Manage who on this job | Only if PA | Only if PA | No | Yes | L2 | gap (gate on add-member) |
| F06 | Auto-PA on every project | No | No | No | N/A | L1/L2 | gap (assert no auto-crown on create project) |

---

## G — Multi-company spine (RC invariants only)

| ID | Case | Assert | Layer | Status |
|---|---|---|---|---|
| G01 | Place company-scoped | Pool never includes `companyId ≠ host` | L1 | covered |
| G02 | Grant enum small | Place writes member shim; PA writes PA shim only — no trade roles as join identity | L1 | covered |
| G03 | Invite ≠ project invite | Company invite still seat-only (no project row) | L2 | gap |
| G04 | No partner PA path in RC | No UI to crown non-host-company user | L2 | covered by pool |

---

## H — Headed / Maestro smoke pack (minimum RC exit)

Run on iPhone 17 Pro Max + Metro `:8081`, `com.buildtrack.app.local`. Visual PNG read required.

| ID | Flow | Pass criteria | Status |
|---|---|---|---|
| H01 | CA login → Activity | Bottom tabs = Activity / Camera / Tasks; no Admin “Dashboard” root tab | **PASS** (headed) |
| H02 | Avatar → Company management | Opens projects/users/KPI shell; can navigate back to field | **PASS** (headed) |
| H03 | Place Bob on Project A (Detail) | No title picker; Bob appears as member | **PASS** (headed) |
| H04 | Place Pat via User Management | Same; success copy does not cite trade role | **PASS** (headed) |
| H05 | Name Sarah PA on Edit Project | Picker shows CA/PM on job only; Bob absent; prior PA demoted, still listed | **PASS** (headed) |
| H06 | CA create task on job | Camera → Create Task form usable (not admin-ban screen) | **PASS** (headed 2026-08-27) |
| H07 | CA field list | On Project A only: peer tasks visible; tasks on Project B (not member) absent | **PASS** (headed 2026-08-27) |
| H08 | Worker regression | Bob still sees assigned/created only | **PASS** (headed 2026-08-27) |

---

## Coverage summary (2026-08-25)

| Bucket | Covered | Gap / headed |
|---|---|---|
| Contract helpers (membership + visibility) | Strong | A03, A05, E06 |
| Integration UI | Partial (Projects PA picker, Create Task CA) | B02–B03, B05, D02–D03, F05–F06 |
| Headed smoke | **H01–H08 all PASS** (2026-08-27) | **Milestone Closed** — see `docs/superpowers/reports/2026-08-27-m-authz-rc-close.md` |

**Recommended next:** optional L2 backlog (B02/B03/D02, F05/F06) only if product wants harder gates; commercial sequence → **M-OPS-ENV-01** then **M-BILL-01**.

---

## Explicit non-cases (do not write as RC pass)

- Partner liaison add/remove (Path A)
- Project invite URL accept (Path B/C)
- Host-absorb billing flip
- Worker crowned PA
- Trade title as allow/deny
- Owner Admin app
