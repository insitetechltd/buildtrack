# Company / user / project model + ACL construct

**Date:** 2026-08-24  
**Status:** **LOCKED (product construct)** — user GO 2026-08-24 evening; **seat law addendum 2026-08-25** (CA ≠ PM seat by default)  
**Milestone:** `WS-AUTHZ / M-AUTHZ-RC` (commercial RC)  
**Not this ship:** `M-AUTHZ-02` liaison / project invite / host-absorb  
**Runtime:** still partially on older admin-shell + ProjectRole picker — **construct is law; code catch-up is the RC implement work**  
**Canvases:** session `acl-layers-roles-map.canvas.tsx`, `acl-simplify-project-role.canvas.tsx`

---

## Locked construct (plain language)

| Role | Layer | What it is | Necessity |
|---|---|---|---|
| **Company admin (CA)** | Company authority (`admin`) | Pays, seats, invite Worker/PM, create/delete company projects, **project KPIs** via **avatar → management**. Same field UI as everyone when on a job. **Not a PM seat by default** — default deployable seat = **Worker**; may be upgraded to PM seat (`deployable_seat=pm`) under entitlement. | Someone must run the company box |
| **PM** | Deployable / billable seat (`manager`) | Field professional: when on a job, sees **that job’s tasks**, stronger assign rights, billable PM seat. Not billing. Not automatic roster boss. | Field managers who are **not** the billing admin |
| **Worker** | Deployable / billable seat (`member`) | Execution on jobs they’re on: mostly assigned/created-by-me tasks, weaker assign rights. **Default seat for new CA.** | Crew who do the work |
| **Project Admin (PA)** | **Project grant** (not a seat) | Named responsibility **on one job**: team (who on/off) + job authority. Requires membership. | Someone accountable for **this** job’s team |

**Anti-disguise:** a worker **cannot** become a PM by wearing PA. PA is crownable only on **CA or PM** already on that job.

**CA + PA:** company admin gets field/PM-like authority **on that job** by being placed and crowned PA — not by being CA alone, and not on every project automatically.

**PM vs PA:** PM is what you *invite/pay for*. PA is what you *name on a job*. SMEs often put both hats on one human. Coordinators who only do tasks stay **workers** on the job.

**Drop:** eight ProjectRole trade titles from admin Place-on-a-job (contractor, inspector, …). They are not ACL. Optional free-text title later — never allow/deny.

**Same UI:** all seats use the same task/camera/activity product. CA opens company management from the **avatar**, not a separate admin-only app shell.

**CA task visibility (target):** company **KPIs / project health**, not a dump of every individual task across the company.

---

## Three layers (do not collapse)

### 1. Company

- Tenant (`companies`), seats, plan caps (`company_entitlements`).
- `Company.type` = organization identity, not permission.
- CA operates here: subscribe, seats, create/delete projects, KPI management surface.

### 2. System permission (app seat) + deployable seat

- Company authority: `admin` (CA).
- Deployable / billable seats: `manager` (PM) | `member` (Worker).
- **Seat law (2026-08-25 lock):** CA ≠ PM seat by default. New/founding CA auto-defaults to **Worker** deployable seat. Upgrade CA to PM via `users.deployable_seat = 'pm'` (same `pm_seats` entitlement gate as inviting a PM). Place-on-a-job does **not** change seat class.
- Written by invite (Worker / PM) or founding create (CA + worker seat). Does **not** put anyone on a job.
- Drives seat class, billing meters, who→whom ranks, default task-visibility band when on a job.

| Company role | Deployable seat | Seat bucket |
|---|---|---|
| CA (`admin`) | default / unset / `worker` | **Worker** |
| CA (`admin`) | `pm` (explicit upgrade) | **PM** |
| PM (`manager` / `supervisor`) | (role) | **PM** |
| Worker (`member` / `worker`) | (role) | **Worker** |
| Soft-inactive (`is_active=false`) | any | **none** (seat freed) |

### 3. Project membership + grant

- **Membership (on/off):** must be on the job to see/work that job (isolation wall).
- **Grant:** `member` | `project_admin` (PA). Later `liaison` (`M-AUTHZ-02`).
- PA ≠ trade label. Old `lead_project_manager` **product meaning** (unique named authority, demote-not-remove) migrates to **PA**. Storage may shim `category=lead_project_manager` until DDL.

---

## Admin verbs (ACL administration)

Henry / CA does not edit three matrices. Verbs:

1. **Invite** — Worker or PM seat (system). No project grant.
2. **Place on a job** — same-company person + project (no title picker). Default grant `member`.
3. **Name PA** — crown CA or PM already on the job; previous PA stays on the job as member (demote grant, don’t kick off).
4. **Place myself + name PA** — how CA takes job authority on a specific site.

Grants are derived. Duplicate Place-on-a-job forms are ACL defects.

---

## Invite vs assign

| Action | Writes | Meaning |
|---|---|---|
| Invite Worker / PM | `users` + seat | System seat only |
| Place on a job | `user_project_assignments` | Membership (+ optional PA grant) |

---

## Privileges (target)

| Privilege | CA | PM | Worker | PA (on that job) |
|---|---|---|---|---|
| Subscribe / seats / invite | Yes | No | No | No (unless also CA) |
| Create / delete company projects | Yes | No | No | No |
| Company project KPIs (avatar management) | Yes | No | No | No |
| Same field UI | Yes | Yes | Yes | Yes (on job) |
| See all tasks on a job they’re on | Via PA on that job (target) | Yes | No (assigned/created) | Yes |
| Manage who is on this job (same company) | Only if PA on that job | Only if PA | No | Yes |
| External parties on job | Later — PA | Later — PA | No | Later (`M-AUTHZ-02`) |
| Automatic PA on every company project | **No** | **No** | **No** | N/A |

---

## Runtime today vs this lock (honest gap)

**Phases A–C shipped in code (2026-08-26 catch-up):**

- Same field shell for CA / PM / Worker — management via avatar → **Company management**
- Field task lists for CA are membership-scoped (not company-wide dump)
- Place-on-a-job has no trade title picker; Name PA via Edit Project (CA|PM only)
- Project Detail on-job roster add/remove = **PA grant only** (CA Place without PA stays on User Management)
- Member rows label **Project Admin** / **Member** (no trade-title ACL display)

**Still open for milestone close:**

- Headed smoke H01–H08 (`2026-08-25-m-authz-rc-user-model-test-cases.md`)
- Interim storage shim `lead_project_manager` for PA until dedicated grant column

Do not claim M-AUTHZ-RC closed until headed smoke passes.

---

## Multi-company inclusion (post-RC — shape only)

One project will later include host + partner companies (`documentation/multi-company-project-membership.md`).

| Grant / path | Who | RC now |
|---|---|---|
| `member` | Anyone placed on the job (host today; guests later) | Yes |
| `project_admin` (PA) | **Host** CA or PM on that job only | Yes (shim `lead_project_manager`) |
| `liaison` | Partner company responsible person for same-company roster | **Not RC** — Path A |
| Project invite B/C | Outsider → membership as member; seats on their company or host-absorb | **Not RC** |

**Do not** use trade titles as join identity. **Do not** make partner people host PA by default. Place-on-a-job stays company-scoped so Path A can reuse the same verb on the liaison’s company roster.

Implement plan: `docs/superpowers/plans/2026-08-24-m-authz-rc-implement.md`.

---

## Explicitly out of RC / still M-AUTHZ-02

- Partner liaison, project invite URL, host-absorb seats
- Cross-company Place-on-a-job
- Owner Admin app (`M-OPS-03`)
- Making trade titles drive RLS
- Crowning workers as PA

---

## Acceptance (construct + RC)

**Construct (locked):**

- CA / PM / Worker / PA definitions above; anti-disguise rule; CA+PA path; drop trade title picker from product law.

**Implement / close M-AUTHZ-RC:**

- Same Place-on-a-job both admin directions; same-company roster only.
- No trade title picker (or shim-only write, never shown).
- Name PA: CA or PM only; demote previous PA to member, keep on job.
- Headed smoke of Place-on-a-job + Name PA.
- Track (may span slice): same field UI for CA + avatar management; CA KPI surface not all-tasks dump.
