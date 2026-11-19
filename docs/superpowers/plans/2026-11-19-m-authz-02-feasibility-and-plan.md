# M-AUTHZ-02 review — multi-company membership

**Status:** Review note. Not a build GO. Not a schema apply.  
**Date:** 2026-11-19  
**Milestone:** `WS-AUTHZ / M-AUTHZ-02` — parked, ordered next, not started.  
**Product law:** `documentation/multi-company-project-membership.md` (locked 2026-08-21)  
**Build spec:** `docs/superpowers/specs/2026-10-07-m-authz-02-prd.md` (locked 2026-10-07)  
**Already shipped:** `M-AUTHZ-RC` (one company on its own jobs), `M-REPORT-01` (report close), `S-UX-01K2` (who may assign whom inside that company)

This note restates the locked scheme, then judges whether it can be built on the code and tables that exist, then lays out the order of work. If this note and the product law disagree, the product law wins.

---

## Where it stands

Stopped on purpose. Commercial RC shipped the one-company field loop. Multi-company was left until after that. The PRD was parked on 2026-10-07. No invite table, liaison grant, seat-payer column, cross-company comment, or new row-level security has been written or applied.

`M-REPORT-01` is closed. The working order still puts `M-AUTHZ-02` next, then `M-OPS-03`, then `M-AI-01`. `M-OPS-02` is closed. `M-OPS-03` does not unlock this work. Schema, invite tables, the liaison grant, the seat-payer column, the inter-company comment, and row-level security still wait for a written go-ahead.

Same-company roster, company invite, Project Admin, team row, report visibility, and report close stay as they are. A notice and one final comment apply only when the manager and the filer are in different companies.

---

## What “delegation” means here

Two different things share the word.

| Name | What it is | State |
| --- | --- | --- |
| Who may assign a task to whom | Privilege ranks inside one company. A person may select someone only if their rank is at least as high. | Shipped (`S-UX-01K2`). Row-level security for that rule was deferred. |
| Partner liaison | The host appoints one person at a partner company to add and remove that partner’s own people on one job. | Not built. This is Path A of `M-AUTHZ-02`. |

Restarting “multi-company delegation” means the second row, inside the three-path membership model below. It does not reopen the same-company assignee picker.

---

## Locked scheme

### Intent

Several companies can be on one jobsite project. Each company pays for its own people. Nobody browses a global people directory. A large partner crew is managed by one liaison, so the host does not keep that roster. The host can still choose to pay for an outsider. Everyone on the job already has a platform account, or gets one by accepting an invite.

### Three paths

**Path A — partner liaison.** The host Project Admin names one company already on the platform and one email. The appointment succeeds only when that account’s company is the named partner. The host is not shown that company’s roster. If someone from that partner is already on the job, the host may appoint that person instead. One active liaison per partner company per project. The host can replace them. The replaced liaison cannot add or remove. The liaison adds and removes only their own company’s people, from their own company’s list, on that one job. Those adds use the partner seat meter and are refused when it is full. The host meter does not move. The liaison is not host Project Admin. A partner person is never given host Project Admin.

**Path B — project invite.** The host Project Admin, or that partner’s liaison, sends a project-scoped link to one named email. A liaison may invite only an email that already belongs to their own company. The invite stores the project, email, named company, token, expiry, inviter, intended role `member`, and billing path B. Accept creates one assignment on that project only. The matching account must accept. A different email, or an expired or revoked link, creates nothing. Seats stay on the named company. Until accept, the person is not on the team and is not in any picker. The pending invite is visible to the inviter and the host Project Admin.

**Path C — host absorbs the seat.** Same invite and accept as Path B, except the billing company is the host. Only a host Project Admin may select “bill to our seats.” A liaison cannot. The person stays in their own company. Accept uses the host seat meter and is refused when that meter is full. The partner meter does not move. The count starts at accept and stops when the person is removed from the project. Nothing absorbs a seat silently.

### Authority and knowledge

Company admin is not project manager. Org admin does not gain create, edit, assign, or approve rights by holding that office. Project authority comes from a grant on that job. A company admin can see which of their own people are on which jobs, including a job another company owns. That list is the person’s name and the project’s name. Opening the job still requires an assignment.

### Pickers

Add-from-company shows the viewer’s own company, plus people already on this project. Create, edit, triage, and task assignment follow that rule. There is no platform-wide list and no cross-company name search. Putting someone from another company on the job is the project invite.

### Report close

Only when the manager and the filing worker are in different companies. The manager’s close is still the close: status becomes resolved immediately, a typed note is required, and photos stay with that note. The filer is told on the report and on Tasks → Outbox. The notice names the closer and shows the line already stored by `M-REPORT-01`. The filer may add exactly one text comment, with an optional photo. It carries their name, time, and company. It does not change status, assignees, or ownership, cannot be edited or deleted, does not reopen the report, and does not start a thread. If they never write it, the close still stands. A same-company close, including on a mixed job, writes no notice and offers no later comment. A worker’s own close does not gain a second comment. If the liaison later removes that filer, the filer keeps read access to reports they filed and keeps the one unused comment. They do not keep the rest of the job.

### Explicit non-goals

- Any change to same-company roster, company invite, Project Admin, team-row layout, report visibility, or same-company close.
- A partner company admin as a required gate before accept.
- A global people directory, or showing the host a partner roster.
- Silent host billing, or moving a Path C person into the host company.
- Giving a guest or a liaison host Project Admin.
- Reopening a closed report, or a reply thread after the final comment.
- Holding a close until the worker comments.
- Changing Stripe plan prices.
- Owner HQ, on-site Q&A, drawings, and the daily-report build.

---

## Proposed data shape

Not a migration. These objects are the ones the product law and PRD name. They are not applied.

What already exists and stays:

- `companies`, `users.company_id`, `projects.company_id` (the host).
- `user_project_assignments`: one active row per user per project (`user_project_assignments_active_unique`). Columns today: `user_id`, `project_id`, `project_role`, `assigned_by`, `is_active`, timestamps. The app writes `project_role` from `ProjectRole` in `src/types/buildtrack.ts`.
- Company seat invite (`inviteCompanyUser`) writes a seat inside the inviting company. It is not a project invite.
- Seat meters already exist on company entitlements (`pm_seats` and worker seats). A company-admin seat is not a jobsite seat.
- Report close already writes `assigner_comment` and then `issue_resolved` in `src/state/taskStore.supabase.ts`.

What the restart adds, after a written go-ahead:

| Object | Purpose |
| --- | --- |
| Project invite row | `project_id`, email, named company, token, expiry, inviter, intended role `member`, billing path B or C, status. No assignment until accept. |
| Liaison grant | One active liaison for `(project_id, partner_company_id)`. Not a second host Project Admin. |
| Seat payer | On the assignment, which company’s meter this membership counts against. Default is the person’s own company. Path C sets the host. `users.company_id` does not change. |
| One cross-company comment | Filer’s name, time, company, text, optional photo. Immutable. Does not change task status or assignees. |
| Row-level security | A guest sees that project, not the host company. A company admin’s outbound list does not open another company’s job. Pending invites are inviter-side state, not a directory. |

### Grant storage, and why it is not a one-line check change

`user_project_assignments.project_role` is still a trade-title check: `lead_project_manager`, `contractor`, `subcontractor`, `inspector`, `architect`, `engineer`, `worker`, `foreman`. Host Project Admin is stored as the `lead_project_manager` shim (`isProjectAdmin` in `src/types/buildtrack.ts`). The company-model lock already says a later dedicated grant is `member`, `project_admin`, or `liaison`, and that the trade-title column may remain a shim until that grant exists.

Putting `liaison` into the trade-title check would mix “what trade is this person” with “may this person edit the partner roster.” The implementation should add a grant beside `project_role`, keep today’s `lead_project_manager` shim working for host Project Admin, and leave same-company rows untouched. That choice is part of the Human Gate. It is not a silent alter.

---

## How it would operate

1. Host Project Admin appoints a liaison by named company plus email, or by picking someone from that partner who is already on the job. Success or failure is shown. The partner roster is not.
2. The liaison places and removes their own company’s people on that job. The partner seat meter moves. The host meter does not. The host’s own roster action is unchanged.
3. A project invite is a link, not a directory pick. Accept is the matching signed-in account only. Path B bills the named company. Path C bills the host, and only the host Project Admin can choose it.
4. The team list on a mixed job shows accepted members and each person’s company. A one-company job’s team row does not gain a company name.
5. Task assignment, triage, and team add offer the viewer’s company plus people already on this project. They do not call a platform-wide user list.
6. A company admin opens an outbound list of their own people and the jobs those people are on. The list does not open the other company’s project.
7. A cross-company report close notifies the filer on the report and on Outbox, then allows one comment. A same-company close does none of that.

---

## Commercial rules

| Rule | Meaning |
| --- | --- |
| Default | Each company pays for its own employees. |
| Hosting a project | Does not put partner people on the host meter. |
| Company-admin seat | Org governance. Not a billable jobsite seat. |
| Path C | Host Project Admin explicitly chooses “bill to our seats.” Never silent. |
| Plan prices | Unchanged. The existing seat meter is what “full” means. |
| Partner company admin | Not a required accept gate. A later non-blocking notice is allowed. |
| Knowledge vs authority | A company admin sees where their people are. They do not gain project manage rights from that list. |

Copy already locked: default guest stays on their company; “Bill this person to our seats” is the host-absorb choice.

---

## Feasibility

**Verdict:** Feasible, in slices, after the Human Gate for anything that writes schema or changes who can read a row. Not feasible as one app-only change, and not feasible by overloading today’s `project_role` check.

What makes it buildable:

- Membership is already one assignment row per person per project. Paths A–C add a grant and a seat payer to that row. They do not need a second membership table.
- Company identity, project ownership, company invites, and seat meters already exist. Path B is a new invite kind. It does not replace `inviteCompanyUser`.
- The report close already stores a typed note and a resolved line. The cross-company notice and one comment can sit on that close. The PRD allows this slice to be built and tested before the invite tables exist.
- Same-company behavior is specified as an oracle. Every slice can be rejected if a one-company job changes.

What makes it unsafe to start casually:

- **Human Gate.** Invite tables, the liaison grant, the seat-payer column, comment storage, and row-level security are danger-gate schema. A `42703` or `PGRST204` on the destination database is a failure, not a warning. DEV-green is not PROD-green.
- **Grant column vs trade-title check.** The live check does not contain `member`, `project_admin`, or `liaison`. Shipping liaison by inserting a new `project_role` value will fail the check or collide with the Project Admin shim.
- **Picker leak.** Create Task and task-detail triage still read `getAllUsers()` (`useCreateTaskViewAdapter`, `useTaskDetailViewAdapter`). The product law calls a platform-wide picker a defect. Closing that leak is part of this work, not a follow-up.
- **Seat accounting.** Partner adds must move the partner meter only. Path C must move the host meter only, and only while that person is on the project. A wrong meter is a billing defect.
- **Isolation.** A guest on one host project must not gain the host’s other projects, the host roster, or reports they cannot open today. A removed filer keeps only their own filed reports and the unused comment.
- **Web spike.** Uncommitted web desk code already inserts `user_project_assignments`. It must not grow a second membership model ahead of this gate, and it is not the first surface to ship.

The close-record slice is the only part that can start before DDL. Paths A–C, picker isolation, and seat counts are not accepted until the tables exist and are proved on the destination database.

---

## Implementation plan

No phase below applies SQL until the written go-ahead for that phase. Same-company behavior is re-checked at the end of every phase.

### Phase 0 — Close record, no new tables

Build only the cross-company difference on top of `M-REPORT-01`.

- Detect “manager company ≠ filer company” from the two users’ `company_id`.
- On that close only: persistent notice on the report and on Tasks → Outbox, using the closer’s name and the stored “Issue resolved by {name}: Resolved with reply” line, plus the note and photos.
- One filer comment after that close. Text required. Optional photo does not consume the comment by itself. Second comment, empty comment, and anyone else’s comment are refused. Status, close time, and assignees stay.
- Same-company close, including two people of the same company on a mixed job, writes no notice and offers no comment. A worker’s own close does not gain one.
- If the comment needs a new column or a new activity type the destination database does not have, stop and take that column to the Human Gate. Do not strip the write and call it done.

**Done when:** PRD acceptance items 8–12 pass on the destination the app is pointed at, and item 1 still matches the current app.

### Phase 1 — Human Gate schema

Written GO, then one migration set. Dry-run first.

- Dedicated grant on `user_project_assignments`, with `liaison` as a value. Keep the existing `project_role` shim so current Project Admin rows still resolve.
- Unique active liaison per `(project_id, partner_company_id)`.
- Seat payer on the assignment. Null or “own company” for every row that exists today.
- Project invite table as specified above. Token, expiry, revoke, and status. No assignment until accept.
- Storage for the one cross-company comment if Phase 0 could not store it immutably.
- Row-level security: membership still comes from an active assignment; a company admin’s outbound read cannot open another company’s project; pending invites are not world-readable; a removed filer can still read reports they filed.

**Done when:** the migration is applied on the destination, existing one-company assignments still load, and anon still cannot read the new tables.

### Phase 2 — Path A

Host Project Admin appoints, replaces, and removes a liaison. The liaison adds and removes only their own company’s people. Partner meter moves. Host meter does not. Host Project Admin actions for the host’s own people stay as they are. A second active liaison for the same partner on the same project is refused.

### Phase 3 — Path B

Project-scoped invite link. Accept only for the matching account, before expiry. Member on that project only. Pending invite visible to the inviter and the host Project Admin, and absent from every picker. Seat stays on the named company. Refused when that meter is full.

### Phase 4 — Path C

“Bill to our seats” is a host Project Admin control only. Accept uses the host meter. The person remains in their own company. Removal stops the host count. A liaison cannot select it.

### Phase 5 — Pickers, team row, company-admin list

- Create, edit, triage, delegation, and team add stop using a platform-wide user list. Offer the viewer’s company plus people already on this project.
- Mixed-job team row shows company after accept. One-company team row is unchanged.
- Company admin outbound list is name plus project name. It does not navigate into another company’s job.

### Phase 6 — Prove

- Same-company oracle (PRD item 1) on a one-company job and on a mixed job.
- Seat cases: partner full, host full, Path C does not move the partner meter, host add of host people still uses the host meter.
- Invite cases: wrong email, expired link, revoked link, accept before expiry.
- Removal: partner filer keeps filed reports and one unused comment; a same-company removal does not gain that retention.
- Destination proof for the new tables and policies. A headed pass on the close notice and on one liaison add. Jest covers the oracle and the refusals. A green DEV run does not close the milestone.

### Out of the first build

Owner HQ, on-site Q&A, drawings, daily reports, Stripe price changes, a blocking partner-admin approve step, and the uncommitted web desk. The web desk may follow the same assignment and invite rules after the mobile path is proved. It does not lead.

---

## Review questions

1. Is the grant a new column beside `project_role`, as this note recommends, or an extension of the trade-title check?
2. Phase 0 starts before the Human Gate. Does the one comment fit in today’s activity rows, or does it need its own table at the gate?
3. Confirm the working order is still `M-AUTHZ-02` before `M-OPS-03`.
