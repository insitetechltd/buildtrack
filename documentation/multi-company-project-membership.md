# Multi-Company Project Membership (Locked)

**Status:** Product law locked 2026-08-21 — **post-RC** (do not implement in commercial RC week)  
**Milestone:** `WS-AUTHZ / M-AUTHZ-02` (see `documentation/ROADMAP.md`)  
**Discussion lock:** `docs/superpowers/analysis/2026-08-19-roadmap-clarification.md` (addendum 2026-08-21)  
**Related:** `documentation/role-permission-matrix.md`, `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md` § Project team & multi-company

If this document conflicts with code, trust code and update this file. Until `M-AUTHZ-02` ships, runtime may still allow unsafe global admin user browse — that is a **defect**, not approved product.

---

## Product intent

Enable multiple companies on one jobsite project while:

1. Keeping a **clear pricing boundary** (who pays for whose seats)
2. Avoiding a **global people directory** (privacy + isolation wall)
3. Reducing **host overhead** via partner liaison where crews are large
4. Allowing the **host to absorb** an outsider’s seat when they choose to pay

Every participating person and company must **already be on the platform** (or complete invite → account on accept). No off-platform ghosts.

---

## Pricing / headcount (commercial law)

| Rule | Meaning |
|------|---------|
| Default | Each company is responsible for **its own employees’** seats |
| Hosting a project | Does **not** automatically consume host headcount for partner people |
| Company admin seat | **Not** field/project headcount — admin is org governance, not a billable jobsite seat burned by “including” them on projects |
| Path C exception | Host may **explicitly** absorb an outsider onto **host** seats — never silent |

Copy for product: default guest → **their** company; opt-in “Bill this person to **our** seats” → host absorb.

---

## Authority vs knowledge

| Concept | Rule |
|---------|------|
| Company admin ≠ project manager | Org admin does **not** automatically gain project create/edit/assign/approve authority |
| Project authority | Comes only from **project role / assignment** (and liaison roster scope below) |
| Company admin knowledge | Must see **which of their people** are on which projects — including projects **owned by other companies** (outbound guests). Awareness / audit only — **not** an approve gate and **not** day-to-day project management |
| Host team list | Shows accepted members (host + guests); host does not own guests’ seats unless Path C |

---

## Three join paths (keep all three)

### Path A — Partner liaison (delegation)

1. **Host** appoints a **responsible person at the partner company** as project **liaison** (one active liaison per partner company per project).
2. That liaison manages **who from their company** is included on the project (add/remove same-company members).
3. Host does **not** maintain the partner roster day-to-day; host can replace the liaison.
4. Seats / bill stay on the **partner company**.

Reduces overhead on the project host for multi-person trade/sub crews.

### Path B — Project invite (outsider stays on own company)

1. Host (or liaison, within policy) sends a **project-scoped invite URL** to a named email.
2. Invitee accepts → `user_project_assignments` for **that project only**.
3. Seats / bill stay on the **invitee’s company**.
4. Person never appears from a global directory — only after accept (or as pending invite metadata for the inviter).

Distinct from today’s **company invite** (`inviteCompanyUser`), which adds a seat **inside** the inviting company.

### Path C — Host absorbs outsider headcount

1. Same invite/accept UX as B, with explicit **“bill to host seats”** (or equivalent host-company seat attachment).
2. Person counts against **host company** headcount.
3. Use when the hosting company is willing to pay for that outsider.
4. Still no global browse; still require platform account.

---

## Directory / picker rules (privacy)

- **Add from company:** same-company list only (plus people already assigned to this project).
- **Invite outsider:** email + role → share link (Path B or C).
- **Never:** admin or anyone browsing all users across all companies for team pickers.
- Outsiders appear on the project team **only after accept** (pending invites are inviter-side state, not a directory).

Pre-RC / interim: company-scoping the admin picker (stop `getAllUsers()` for team add) is a **privacy fix**, not delivery of this full model.

---

## Seed arrangement (data layout)

### Tenant seed (fixtures)

- Separate `companies` for host and partners.
- Users belong to their company only.
- Projects owned by host (`projects.company_id`).
- Baseline `user_project_assignments` = host people (and any intentional “already accepted” guests for demos).
- Do **not** seed cross-company people onto a project unless the scenario is explicitly “accepted guest” or “liaison already appointed.”

### Invite seed (pending)

- Pending project invite rows: `project_id`, email, token, intended `project_role`, billing path (B vs C), `invited_by`, expiry, status.
- No active assignment for that email until accept.

### Accept seed (runtime)

1. Auth user exists (create if needed).
2. `users` profile exists under invitee company (B) or host attachment policy (C).
3. One active `user_project_assignments` row for that `project_id`.
4. Invite → accepted; optional audit event.
5. Path A: liaison flag/role on assignment for `(project_id, partner_company_id)` — only that user (within policy) may add/remove **same-company** members on that project.

Assignment rows — not the global `users` table — are the source of truth for “who is on this project.”

---

## Explicit non-goals (this lock)

- Partner company admin as a **required** gate before Path B accept (notify optional later; not blocking).
- Treating company admin visibility as project management rights.
- Silent host absorb of seats.
- Global people directory for any role.

---

## Sequencing

- **Not RC.** Commercial RC = field loop only (`docs/superpowers/plans/2026-08-19-post-rc-boring-loop.md`).
- Ship after **`M-OPS-02`** (and RC). Schema / RLS / invite DDL still require **Human Gate** when implementation starts.
- May idle-parallel with other post-OPS work; must not jump ahead of RC → OPS-01 → OPS-02.
