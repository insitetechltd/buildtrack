# Workflow-gaps bin — platform superuser only

**Date:** 2026-08-19  
**Milestone:** `WS-OPS / M-OPS-01` (ROADMAP Order 15.05) — **first implementation after commercial RC**, not this week.  
**Discussion lock:** `docs/superpowers/analysis/2026-08-19-roadmap-clarification.md`  
**Status:** Pipeline. Gate A folded: **only platform owner**; never on worker/admin Activity.  
**Metro:** No `src/` land while any Maestro is on this packager.

## User lock (2026-08-19)

- Do **not** show gaps on Activity, Tasks, Drafts, or company Admin Dashboard.
- Need an **app superuser** surface to monitor the whole product.
- Audience: **only that superuser**. Company admins and field users must not see the bin.

## Why the illegal states exist

Intended Create: title + description + project → Create Task. Assignees are **not** actually required (stars are lying). `createTask` then sets `new` if creator ∉ `assignedTo`, or `in_progress` if self-assigned.

**Unassigned + `in_progress` is not a flow.** It is garbage (old writes, bugs, or a draft hack). Same class: blank title, no project, no originator, legacy statuses, review-not-100%.

Save Draft as unassigned `in_progress` is **rejected**. Park that plan.

## Intended machine

| Status | Assignees | Meaning |
|---|---|---|
| `new` | ≥1 | Waiting for accept |
| `declined` | ≥1 | Back to originator |
| `accepted` | ≥1 | Accepted, not started |
| `in_progress` | ≥1 | WIP |
| `rejected` | ≥1 | Rework |
| `submitted_for_review` | ≥1 + 100% | Review |
| `approved` / `completed` / `done` / `cancelled` | any | Terminal |

Required: `projectId`, `assignedBy`, non-empty title. `declined` is **intended** (do not use `getWorkflowPhase === null` as a gap).

## Gap codes

Deleted (`deletedAt`) excluded.

| Code | Rule | Primary rank |
|---|---|---|
| `GAP_NO_TITLE` | blank title | 1 |
| `GAP_NO_PROJECT` | no project | 2 |
| `GAP_NO_ORIGINATOR` | no assignedBy | 3 |
| `GAP_UNASSIGNED_WIP` | `in_progress`/`accepted`/`rejected` + empty assignees | 4 |
| `GAP_UNASSIGNED_OPEN` | other open status + empty assignees | 5 |
| `GAP_LEGACY_STATUS` | legacy alias | 6 |
| `GAP_PHASE_UNKNOWN` | not in intended ∪ terminal ∪ legacy | 7 |
| `GAP_REVIEW_INCOMPLETE` | submitted_for_review and completion ≠ 100 | 8 |
| `GAP_SELF_NEW` | `new` but creator ∈ assignedTo | 9 |

Normalize `assignedTo` with trim/filter before empty checks. Show **all** codes on the row, not only primary.

## Superuser vs company admin (honest limit)

Today `company_admin` maps to RLS `admin` and can already read broadly. That is **not** the superuser product. Henry must **not** get this UI.

**Seeing every row in Postgres** requires a new platform privilege + RLS (or a service-role read-only script). Client hide is enough to not confuse users; it is **not** a security boundary.

### Phase A (no schema, RC) — recommended next

- Classifier `src/utils/taskWorkflowGaps.ts` + Jest (every code + intended negatives + deletedAt + whitespace assignees).
- **Superuser home** screen, Profile entry **only** if `isPlatformSuperuser(user)` — allowlist of auth user id(s) in a non-`EXPO_PUBLIC` config if possible; otherwise a committed allowlist of **your** user UUID is still extractable from the binary. Accept that for RC “don’t confuse users.”
- Bin lists gaps in the **loaded task store** (RLS-visible). Label the screen: “Loaded tasks only — not a full-table audit.”
- Actions v1: inspect (Task Detail read-only as much as practical). **No swipe-delete** on this slice (H1: draft delete guard would kill real WIP).
- **Do not create a new Auth user** until you name the email and give Human GO. Prefer tagging **your existing** login as the allowlist.

### Phase B (Human Gate) — real “monitor the whole app”

- Live SQL read-only twin of the classifier (redacted aggregates + sample ids). Answers “what is in the database.”
- Optional later: `platform_superuser` role distinct from `company_admin`, RLS read-all, dedicated Auth user. **Ask before any live apply.**

## Out of scope this slice

- Activity / Tasks / Drafts UI
- Save Draft
- Auto-repair
- Swipe-delete
- Putting the bin on Admin Dashboard (`isAdmin`)

## Validation (Critique B folded)

- Jest per code + multi-code list + `GAP_UNASSIGNED_WIP` can be primary
- Intended `new`+assignee and `in_progress`+assignee **absent**
- `isPlatformSuperuser` false → no nav entry (Profile test)
- Headed: sign in as ordinary user → no Superuser; as allowlisted user → bin; unique gap title visible
- SQL twin required before claiming “database is clean”
- Do not seed illegal rows through Create UI

## Gate A

- Critique A: [risks](a9680ce7-6083-4c19-94e2-71bb8f926abc) C1 (Save Draft vs gaps) **resolved by parking Save Draft**. H1 delete **resolved by no swipe**. H2 tenant leak **resolved by superuser-only + Phase B RLS**. H3 declined **folded**. H4 WIP primary **folded**. H5 no-project **Superuser must query store unfiltered by active project** (and SQL for DB). H6 PTR: do not touch DashboardScreen.
- Critique B: [validation](0da97cf6-f938-4f2e-80c6-aef3fbb18a22) SQL twin + classifier boundaries folded.

**Builder:** classifier + Superuser screen **after** Metro quiet and allowlist identity confirmed. No Dashboard edits.
