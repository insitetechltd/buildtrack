# M-AUTHZ-RC implement plan

**Date:** 2026-08-24  
**Construct SoT:** `2026-08-24-company-user-project-model.md`  
**Multi-company SoT (post-RC):** `documentation/multi-company-project-membership.md`  
**Status:** Phases A–C code + 2026-08-26 catch-up (PA roster gate, labels, dead picker strip, Company management copy). **Headed smoke remaining** for close.

---

## Design constraint — multi-company on one project

RC must not paint AUTHZ-02 into a corner. One project will later hold **host + partner companies**.

| Path (later) | Who appears on the job | Seat bill | Roster power |
|---|---|---|---|
| **A Liaison** | Partner people | Partner company | One **liaison** grant per `(project, partner_company)` — same-company add/remove only |
| **B Project invite** | Outsider on **their** company | Invitee company | Join as **member** (not host PA) |
| **C Host absorb** | Outsider on **host** seats | Host company | Still **member** unless separately crowned PA (host CA/PM only) |

**RC invariants that keep that door open:**

1. **Place-on-a-job is always company-scoped** (host roster today; later liaison’s company roster). Never a global directory.
2. **PA is host-only authority** — only host CA or host PM on that job. Partner people are never host PA by default.
3. **Grant enum stays small:** `member` | `project_admin` | later `liaison`. No trade ProjectRole as join identity.
4. **Invite ≠ assign** stays: company seat invite ≠ project membership; Path B/C project invite ≠ company invite.
5. Assignment row remains SoT for “who is on this project” (multi-company doc).

Do **not** implement A/B/C in this slice. Only keep shapes compatible.

---

## Phases

### Phase A — Place-on-a-job + Name PA (this slice, first)

- Remove trade title picker both admin directions; write membership as member (`category` shim `worker`).
- Rename Lead PM UX → **Project Admin**; eligibility = CA or PM; demote previous PA to member, keep on job.
- Helper API: `isEligibleProjectAdminCandidate`, `upsertProjectMembership` default member; PA path shims `lead_project_manager`.
- Jest for eligibility + demote + no-worker-PA.

### Phase B — Same field UI for CA

- CA gets Activity / Camera / Tasks like everyone.
- Company management (Admin Dashboard, User Management, Company Plan, Projects admin) via **avatar / profile**, not a separate root-tab-only shell.
- Allow CA to create tasks when on a job (remove hard admin create ban) consistent with construct.

### Phase C — CA field lists ≠ all company tasks

- Field task lists for CA: membership-scoped (like PM) when on jobs; not every company task.
- Company KPI / project health stays on management surface (avatar path).

### Exit

- Jest green for touched suites.
- Headed smoke: Place-on-a-job (no title), Name PA, CA opens field tabs + avatar management (when B/C land).
- Update NOW / ROADMAP notes; construct doc runtime-gap section.

---

## Out of scope this execute

- M-AUTHZ-02 DDL / liaison UI / project invite URL
- Free-text job titles
- Worker-as-PA
- Owner Admin app
