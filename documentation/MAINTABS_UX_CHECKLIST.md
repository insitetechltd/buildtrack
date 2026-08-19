# MainTabs function discovery and UX checklist

Canonical product-test checklist for **what exists** on MainTabs, **who may use it**, and **how we prove it** (human + Maestro).

Linked from [TESTING_STRATEGY.md](../TESTING_STRATEGY.md) (Layer 3 / RC gate) and [maestro/README.md](../maestro/README.md).

**Roles (do not mix):**

| Seat | `isAdmin` | Bottom tabs | Day-to-day project work (create / accept / update / review / approve) |
|------|-----------|-------------|------------------------------------------------------------------------|
| **Company admin** | yes | **Dashboard only** | **No.** Org: company, projects-as-containers, seats, billing. |
| **Field operator** (worker / manager / member) | no | Activity · Camera · Tasks | **Yes.** Task creator (not company admin) approves review. |

Approve/reject on Task Detail is **`assignedBy` (creator)**, never the company-admin shell. Do not put admin on section X.

Profile is a **root overlay** (header avatar), not a tab.

**Out of MainTabs:** Login, Create company, invite → Set password.  
**DEV-only (skip Release):** Developer Settings, Dev Admin, Sprint7 sandbox.

---

## How to use

- **Discovery:** walk every row once; Skip only with reason.  
- **RC human:** field operator **B–E** (required) + admin **G–J** (org) + header **A**.  
- **RC Maestro (required before release):** field operator **B–E** only — `npm run test:e2e:maestro:rc-worker-be`. Human still signs off PNGs / device.  
- **UI consistency:** section **L** while on each screen. No code change from that list until a screen is scoped.

Legend — **Maestro:** Covered / Partial / Gap / Exempt / Dev-only.

---

## A. Shared header (both seats)

| ID | Journey | Manual | Maestro |
|----|---------|--------|---------|
| H01 | Avatar opens Profile menu | ☐ | Partial (`launch-smoke` trigger; menu in sprint7-open-developer-settings) |
| H02 | Profile & Settings | ☐ | Gap |
| H03 | Change Project | ☐ | Covered `journey-login-switch-projects.yaml` (Sprint7 seeds) |
| H04 | Logout confirm | ☐ | Gap (Alert Exempt) |
| H05 | Logout cancel | ☐ | Gap |
| H06 | Developer Settings | Skip on Release | Dev-only |

Menu rows must match: Profile & Settings, Change Project, Logout (`__DEV__`: + Developer Settings).

---

## B. Field — Activity

| ID | Journey | Manual | Maestro (RC) |
|----|---------|--------|----------------|
| W-A01 | Land Activity (`dashboard-screen__root`) | ☐ | **Covered** P01 `_boot` + `launch-smoke.yaml` |
| W-A02 | Project summary visible | ☐ | Partial |
| W-A03 | Queue tiles → Tasks | ☐ | Partial `qa01-scenario-b-overdue-crunch.yaml` |
| W-A04 | Activity row → Task Detail | ☐ | Gap |
| W-A05 | Drafts Show/Hide | ☐ | Gap |
| W-A06 | Resume draft → Create Task | ☐ | Gap |
| W-A07 | Swipe-delete draft | ☐ | Gap + Alert Exempt |
| W-A08 | Create FAB (if shown) | ☐ | Partial (Camera tab is SoT) |

---

## C. Field — Camera (create / Update shortcut)

| ID | Journey | Manual | Maestro (RC) |
|----|---------|--------|----------------|
| W-C01 | Camera → Create Task form | ☐ | **Covered** P01, `task-core-live-create.yaml` |
| W-C02 | Title + submit | ☐ | **Covered** P01 / task-core create |
| W-C03 | One photo + submit | ☐ | **Covered** **P01** (P02–P22 = extra suite, not RC min) |
| W-C04 | Back / cancel | ☐ | Partial P06 |
| W-C05 | Assignee / tags / location / due | ☐ | Gap |
| W-C06 | Container / area | ☐ | Gap |
| W-C07 | Task Detail → center tab Update | ☐ | **Covered** U01 seed path |

---

## D. Field — Tasks

| ID | Journey | Manual | Maestro (RC) |
|----|---------|--------|----------------|
| W-T01 | Tasks list | ☐ | **Covered** U01 `_seed-task-open-update`, P01 submit landing |
| W-T02 | Row → Task Detail | ☐ | **Covered** U01 seed; journeys (Sprint7) |
| W-T03 | Search | ☐ | Partial qa01-d (section visible) |
| W-T04 | Filter sheet | ☐ | Gap |
| W-T05 | Pull to refresh | ☐ | **Covered** `W-T05-pull-to-refresh.yaml` |

---

## E. Field — Task Detail + follow-ons

| ID | Journey | Manual | Maestro (RC) |
|----|---------|--------|----------------|
| W-D01 | Accept | ☐ | Gap |
| W-D02 | Decline | ☐ | Partial qa01-a (Sprint7) |
| W-D03 | Update text | ☐ | **Covered** `task-core-live-progress.yaml` |
| W-D04 | Update + photo | ☐ | **Covered** **U01** |
| W-D05 | Add comment | ☐ | Gap |
| W-D06 | Add subtask | ☐ | Gap |
| W-D07 | Submit for review | ☐ | **Covered** `task-core-live-completion.yaml` (seeded live task; not P01) |
| W-D08 | Edit (creator) | ☐ | Gap |
| W-D09 | Photo viewer | ☐ | Gap |
| W-D10 | Archive (completed only) | ☐ | **Covered** `W-D10-archive.yaml` headed PASS 2026-08-19 — Tasks → Filters → QUEUE → Archived |

RC Maestro min for E is **U01** (update+photo). W-D07 is Task Core, not the P/U one-shots.

---

## F. Field — Profile overlay

| ID | Journey | Manual | Maestro |
|----|---------|--------|---------|
| W-P01 | Card shows field role (not Admin) | ☐ | Gap |
| W-P02–P05 | Language / theme / reload / password | ☐ | Gap |
| W-P06–P07 | Help / Terms / Privacy | ☐ | Exempt (Safari) |
| W-P08 | **No** Company plan | ☐ | Gap |
| W-P09 | **No** Delete Account | ☐ | Gap |

---

## G–J. Company admin (org only — not project day-to-day)

Admin has **no** Activity / Camera / Tasks. Do **not** ask admin to create, update, or approve tasks.

| ID | Journey | Manual | Maestro |
|----|---------|--------|---------|
| A-D01 | Dashboard only; field tabs absent | ☐ | Gap |
| A-D02 | Company name | ☐ | Gap |
| A-D03 | Projects stat → list | ☐ | Gap |
| A-D04 | Team stat → User Management | ☐ | Gap |
| A-D05 | Completed / Admins stats (display) | ☐ | Gap |
| A-P01–P06 | Projects list / create / detail / edit / members | ☐ | Gap |
| A-U01–U07 | Invite, copy HTTPS link, assign seats, last-admin protect | ☐ | Gap; clipboard Exempt |
| A-PR01 | Role Admin | ☐ | Gap |
| A-PR02 | Company plan | ☐ | Gap |
| A-PR03 | Checkout (`buy.stripe.com`) | ☐ | Exempt |
| A-PR04–P05 | Settings / legal | ☐ | Gap / Exempt |

---

## K. Field cross-role loop (not admin)

Two **field** seats: **creator** + **assignee**. Company admin is not in this loop.

| ID | Journey | Manual | Maestro |
|----|---------|--------|---------|
| X01 | Creator creates (Camera) | ☐ | Covered P01 / task-core create |
| X02 | Assignee accepts | ☐ | Gap |
| X03 | Assignee updates | ☐ | Covered U01 / progress |
| X04 | Assignee submits review | ☐ | Covered task-core-completion |
| X05 | **Creator** approves (not admin) | ☐ | Gap |
| X06 | Creator rejects → assignee reworks | ☐ | Partial qa01-a |
| X07 | Isolation (wrong project hidden) | ☐ | Partial qa01-c |

---

## L. Within-screen format (human; no auto-fix)

On **each** screen you open: same type level = same size/weight; same single-line field height; same section headers; avatar always the same Profile menu. Full consideration list: headers, labels, `TextField` vs one-off `TextInput`, `px-4` vs `px-6`, teal `AppScreenHeader` vs `StandardHeader` / `ModernScreenHeader`, sticky footer inset-once, row component one-per-list. Known drift: Create Task mixed inputs; Add Comment `StandardHeader`; Admin/Profile never fully on teal shell. Do not “fix” admin vs field tabs.

---

## RC Maestro gate (B–E) — before release

Field-operator one-shots (live login `john.managera@test.com` via `_boot`; **not** Henry/admin):

```bash
export MAESTRO_UDID="<booted iPhone UDID>"
npm run test:e2e:maestro:rc-worker-be
```

That runs **P01** then **U01** via `scripts/maestro/run-*-one.sh` (Photos ensure + `run-local.sh`).

| Section | Proved by this gate |
|---------|---------------------|
| B | P01 `_boot` → `dashboard-screen__root` |
| C | P01 library → form → submit |
| D | P01 lands Tasks; U01 opens Tasks → detail → Update |
| E | U01 photo progress submit |

**Not** in this min gate: admin G–J, drafts, filters, accept/approve, Stripe. Preflight: [`.cursor/rules/maestro-preflight.md`](../.cursor/rules/maestro-preflight.md). **PNG read before rc=0.** Two-sim SOP: distinct UDIDs only; 1 Maestro job per UDID.

Optional extra (not substitute): `test:e2e:maestro:journeys`, `test:e2e:maestro:task-core`, full P/U suites.

**Assumption:** Maestro “manager” (`john.managera`) is a **field** tab user (`isAdmin` false), not company admin.
