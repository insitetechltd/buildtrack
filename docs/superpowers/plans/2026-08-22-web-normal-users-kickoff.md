# Web frontend — normal users kickoff plan (M-WEB-01 + M-WEB-02)

**Date:** 2026-08-22  
**URL:** `https://app.insiteworks.co`  
**Status:** Planning complete — parallel kickoff with Owner Console  
**Spec SoT:** `docs/superpowers/specs/2026-08-06-web-admin-and-dms-product-spec.md`  
**Implementation SoT:** `docs/superpowers/plans/2026-08-06-ws-web-01-and-02-web-admin-shell-and-project-workspace.md`

---

## Who this is for (not Owner Console)

| Persona | System scope | Project scope | Primary routes |
|---|---|---|---|
| **Company admin** | `admin` / company_admin | optional lead PM | `/a/*` |
| **Project admin / Lead PM** | manager+ | `lead_project_manager` | `/p/:id/*` |
| **GC PM, foreman, inspector** | member/manager | contractor, foreman, etc. | `/p/:id/*` (narrower) |
| **Field worker** | member | worker | Mobile-first; web compact **later** (M-WEB-03) |

**Login dispatch (spec §4):**
- `admin` → `/a/dashboard`
- `manager` → `/p/:lastProjectId/workspace` (or project picker)
- `member` → `/p/:id/tasks` or compact home (M-WEB-03)

---

## Kickoff wave 1 scope (build now)

Ship **shell + admin skeleton + project workspace skeleton** together (existing M-WEB-01/02 plan).

### Track W — Web platform

| # | Deliverable | Acceptance |
|---|---|---|
| W0 | `Platform.OS === 'web'` gate in `App.tsx`; `WebApp` + React Router v6 | `expo start --web` loads login |
| W1 | Shell: 240px sidebar + top bar + breadcrumbs | Admin + project layouts share chrome |
| W2 | Auth: same Supabase session as mobile; login → role dispatch | admin vs manager landing correct |
| W3 | Permission route guards (`getUserSystemPermission`, `getProjectRole`) | member blocked from `/a/users` |

### Track A — Company admin (`/a/*`)

| Route | v1 scope | Parity target |
|---|---|---|
| `/a/dashboard` | Stub KPI cards + nav | Full reports → M-WEB-03 |
| `/a/users` | Table, invite, deactivate, role edit, CSV bulk invite | Mobile `UserManagementScreen` |
| `/a/projects` | List, create, archive, open project | Mobile admin projects |
| `/a/organization` | Stub | Branding/billing → M-WEB-03 |
| `/a/roles` | Stub nav only | M-WEB-03 |
| `/a/reports` | Stub | M-WEB-03 |
| `/a/settings` | Stub | M-WEB-03 |

**Company admin rules:**
- Manages users **within their company only** (RLS)
- **No** cross-company user list
- **No** change `company_id` on users (same law as owner module — enforce in UI + API)

### Track P — Project workspace (`/p/:id/*`)

| Route | v1 scope | Audience |
|---|---|---|
| `/p/:id/workspace` | KPI widgets: open tasks, recent activity | All members |
| `/p/:id/team` | Roster, project role assign, remove from project | lead_pm, admin |
| `/p/:id/settings` | General + placeholder DMS defaults tab | lead_pm, admin |
| `/p/:id/tasks` | Read/write task list (shared store) | All members |
| `/p/:id/documents` | **Stub** “DMS coming” | M-DMS-01 |

**Project admin ≠ company admin:** team/settings without `/a/users` company-wide powers.

---

## Explicitly out of kickoff wave 1

| Item | Milestone |
|---|---|
| DMS register, upload, revisions | M-DMS-01 |
| RFIs / submittals | M-DMS-03/04 |
| Stripe billing portal / tier enforcement UI | Owner 2a + M-WEB-03 |
| Full reports / roles catalog editor | M-WEB-03 |
| Member compact web | M-WEB-03 |
| Playwright matrix | M-QA-04 |

DMS routes may exist as **stubs** in the router for IA clarity.

---

## Engineering layout (from existing plan)

```
src/webRouter/          — routes + guards
src/screens/web/admin/  — /a/*
src/screens/web/project/— /p/*
src/components/web/     — DataTable, Sidebar, TopBar
App.tsx                 — web vs mobile gate
```

**Stack:** Expo SDK 54, react-native-web, React Router DOM v6, shared Zustand + Supabase (no second DB).

**New deps (kickoff):** `react-router-dom`, `papaparse` (CSV invite).

---

## Shared foundation with Owner Console (parallel)

Both tracks consume the same backend truth:

| Concern | Owner Console | Web (normal users) |
|---|---|---|
| Auth | Supabase session | Same |
| Permissions | `isPlatformSuperuser` (client hide) | `getUserSystemPermission` / `getProjectRole` |
| Users | Cross-tenant create (owner) | Company-scoped CRUD (admin) |
| Plans/seats | Configure + override (owner) | Enforced gates (both); admin sees read-only plan summary later |
| Company binding | Set at create only | Invite creates user under **admin’s company** |

**Single-writer rule for kickoff:** entitlements **schema + Stripe webhook** = one track (Owner B2) before either surface claims “seat limit enforced.”

---

## Validation (kickoff wave 1)

| Layer | Check |
|---|---|
| L1 | Jest: route guards, CSV parse, web gate |
| L2 | `tsc --noEmit` |
| L3 | Manual: admin → `/a/users` CRUD; lead PM → `/p/:id/team` |
| L4 | Playwright deferred to M-QA-04 |

---

## Open decisions (resolve before or during week 0)

| # | Question | Default if silent |
|---|---|---|
| Q1 | Web host for product app | **Vercel** previews (`*.vercel.app`) for dev/away testing; **`app.insiteworks.co`** prod CNAME when stable. Marketing stays **GitHub Pages**. See `2026-08-22-web-hosting-remote-test.md`. |
| Q8 | Billing in Phase 2 kickoff | **No** — stubs only |

---

## Acceptance (web planning complete)

- [x] Personas and routes mapped (admin + project admin)
- [x] Wave 1 scope bounded vs M-WEB-03 / DMS
- [x] Company-scoped user mgmt; no company switch
- [x] Parallel dependency on shared entitlements schema noted
- [ ] User sign-off → kickoff coding
