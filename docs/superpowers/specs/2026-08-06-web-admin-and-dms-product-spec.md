# InsiteApp Web Admin & Project Document Management System
## Product Specification (Phase 2: Web Interface)

> Document version: 1.0 — 2026-08-06
> Audience: Product, Engineering, QA, Design
> Status: Draft for review

---

## 1. Executive Summary

This specification defines Phase 2 of the InsiteApp platform: a **web-based administrative control shell** paired with a **project-level Document Management System (DMS)**. It is built for two primary user personas:

1. **Company-wide Administrators** — manage users, companies, system-wide settings, roles and permissions, billing, and cross-project visibility.
2. **Project-level Administrators** (Lead PMs, Project Managers, Contractors with admin scope) — manage a single project's documents, submittals, RFIs, transmittals, team assignments, and project-level configuration.

The web interface shares its **data layer, auth, and Supabase backend** with the existing Expo React Native mobile app. Users with `admin` system permission land in the admin shell; users with `manager` system permission land in a project-scoped workspace; users with `member` permission receive a compact mobile-style web view of their tasks and documents.

### 1.1 Why Now

The current mobile app is strong for field execution but creates an operations gap:

- Admins currently manage users, projects, and roles **on a phone**, which is error-prone and slow for bulk operations.
- Documents exist only as ad-hoc `FileAttachment` rows on tasks (`fileUploadService.ts`). There is no version control, no approval chain, no RFI/submittal log, and no document register — all baseline requirements for ISO 19650-aligned construction delivery.
- Competitors (Procore, Autodesk Construction Cloud, Aconex, Buildertrend, Fieldwire) expose a web-first admin shell and document control as their **defensible moat**; the Insite mobile app cannot credibly compete for mid-market general contractors without parity in these two modules.

### 1.2 Design Principles

| Principle | Meaning for this product |
|---|---|
| **Shared source of truth** | Web and mobile read/write the same Supabase tables. Web screens never outflank the mobile app's permission helpers (`getUserSystemPermission`, `getProjectRole`, `isLeadProjectManager`). |
| **Mobile-complete, web-first for admin** | Every document can be viewed, annotated, and approved on mobile *and* web. But bulk upload, folder structuring, and user admin live on web. |
| **Control over chaos** | Document versioning is **immutable**. Once a revision is superseded, it is never silently overwritten. Approver actions produce a tamper-evident audit log. |
| **Progress over perfection** | This spec ships a **Phase 2 slice** that beats Procore on clarity for mid-market GCs. It does not try to out-Aconex Aconex on transmittal formalisms in v1. |

---

## 2. Competitor Synthesis

### 2.1 Landscape

The following competitor analysis informed the feature matrix in §3. Sources: 2026 roundups from ZipDo, Pelles.ai, Construction Frontier, EngineeringCivil, CMIC Global, and Gitnux (see §9 for references).

| Product | Positioning | Strengths | Weaknesses relative to our opportunity |
|---|---|---|---|
| **Procore** | All-in-one construction PM platform | Document register, submittal/RFI workflows *tied to financials*, 200+ integrations, mobile parity | Expensive ($600–$2,500/yr/user tiering); steep on-ramp; small GCs find it overkill; document UX is cluttered with financial modules |
| **Autodesk Construction Cloud** | Enterprise platform for BIM/drawing heavy teams | Tight Autodesk Docs/BIM 360 integration; strong drawing compare and versioning; PlanGrid lineage | Requires Autodesk license to access full value; not friendly to non-design stakeholders; heavy contract lock-in |
| **Aconex (Oracle)** | Neutral common data environment for large programs | ISO 19650 Kitemark, formal transmittal inbox model, BSI audit trail, cross-org permission model | Mail-style inbox UX is dated; pricing enterprise-only; onboarding 6+ weeks for single owner |
| **Buildertrend** | Residential + light commercial CRM/build PM | Strong client portal, change orders, daily logs, selection sheets tied to documents | Document control is secondary; weaker revision chain; poor at multi-subcontractor RFI routing |
| **Fieldwire** | Field execution + punch | Plan-linked issue tracking, daily reports, good offline mobile | DMS is append-only file storage, no revision approval, no RFI log |
| **InEight Document** | Complex-build control tower | Flexible workflow scripting, version lineage lock, RBAC on folders | Quote-only, steeper learning curve, overkill for <$50M projects |
| **PlanGrid (Autodesk)** | Digital blueprints | Drawing compare, annotation, field reports | Now folded into ACC; standalone roadmap frozen |

### 2.2 Feature Parity Benchmark

| Capability | Procore | ACC | Aconex | Buildertrend | Fieldwire | **InsiteApp Phase 2 target** |
|---|---|---|---|---|---|---|
| Central document repository | ✅ | ✅ | ✅ | ✅ | ✅ | **✅** |
| Version control + revision chain | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **✅** (immutable revisions) |
| Role-based folder permissions | ✅ | ✅ | ✅ | ⚠️ | ❌ | **✅** |
| RFI module (create, route, log) | ✅ | ✅ | ✅ | ⚠️ | ❌ | **✅** |
| Submittal module (packages, reviewers, log) | ✅ | ✅ | ✅ | ⚠️ | ❌ | **✅** |
| Transmittals (formal send/receive) | ✅ | ✅ | ✅ | ❌ | ❌ | **⚠️** (Phase 3 candidate, basic in 2) |
| Drawing compare / overlay | ✅ | ✅ | ⚠️ | ❌ | ✅ | **⚠️** (Phase 3, basic PDF viewer in 2) |
| Mobile document viewer + annotation | ✅ | ✅ | ✅ | ✅ | ✅ | **✅** (leverages existing PhotoAnnotation) |
| AI document extraction / question answering | ✅ | ✅ | ❌ | ❌ | ❌ | **⚠️** (Phase 3, hooks planned) |
| Audit log with user+timestamp | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | **✅** |
| Company-wide user/role admin UI | ✅ | ✅ | ✅ | ✅ | ✅ | **✅** |
| Bulk user invite / CSV import | ✅ | ✅ | ✅ | ✅ | ⚠️ | **✅** |
| Custom roles + permissions | ✅ | ✅ | ✅ | ⚠️ | ❌ | **✅** (extends existing `roles` table) |
| Open API / webhooks | ✅ | ✅ | ✅ | ✅ | ⚠️ | **⚠️** (Phase 3) |

### 2.3 Strategic Gap = Our Opportunity

No competitor combines:
- **construction-grade document control** (revision chain, RFI, submittals, audit)
- with a **simple, flat per-project pricing model**
- and a **single shared codebase (Expo Web + React Native)** that avoids the mobile/web drift that plagues Procore and Buildertrend.

This is our wedge. InsiteApp Phase 2 ships web admin + DMS on the same Expo/React Native/Supabase stack as the existing mobile app, keeping engineering headcount and deployment complexity low while capturing the mid-market segment that finds Procore too expensive and Buildertrend too residential.

---

## 3. Goals, Non-Goals, and Success Metrics

### 3.1 Goals (Phase 2)

**G1 — Company Administration.** Company-wide admins can:
- Invite, deactivate, and reassign system permission (admin/manager/member) for users in their company
- Manage company profile, billing contacts, and logo/branding
- Create, edit, archive, and transfer ownership of projects
- Assign users to projects with a project role
- Bulk-import users and project assignments via CSV
- View cross-project rollups (aggregate task health, overdue count, DMS activity)

**G2 — Project-level Administration.** Project admins (Lead PMs + system admins) can:
- Configure project document folder structure and folder-level permissions
- Manage project team: assign project roles, change Lead PM, remove users from project
- Configure project-level DMS settings (default reviewers, revision naming scheme, notification rules)

**G3 — Project DMS Core.** Every project gets a document register where project members can:
- Upload documents (PDFs, DWGs, XLSX/DOCX, images) with metadata (discipline, trade, document type, revision)
- Browse folder tree with breadcrumb, search by metadata or full-text
- Create new revisions of a document (supersede old — old revision stays accessible with badge)
- Download or preview any revision (PDF/image viewer built-in)
- View full audit trail: who touched what, when (upload, revision, move, rename, approval)

**G4 — RFI Module.** Project members can:
- Raise an RFI from a document, from a task, or from scratch
- Route it to a reviewer with a due date
- Thread responses, attach supporting documents
- Log every RFI in a filterable register (open, closed, overdue) with exportable CSV

**G5 — Submittal Module.** Project admins can:
- Build a submittal package (shop drawings, product data, samples) with line items
- Assign reviewers (architect, engineer, owner rep) per item or package-level
- Route package → review → revisions → resubmittal → closeout
- Maintain a submittal register with status per item, overdue flag, and linked revisions

### 3.2 Non-Goals (Phase 2)

- ❌ Billing/payments processing and invoicing (Phase 4)
- ❌ Drawing overlay compare / DWG revision overlay (Phase 3)
- ❌ Transmittal formal engine with certified delivery (Phase 3)
- ❌ AI document Q&A / requirements extraction (Phase 3)
- ❌ Custom public API + webhooks (Phase 3)
- ❌ BIM 360 / Revit live integration (Phase 4)
- ❌ White-label or multi-tenant SaaS admin portal (Phase 5)

### 3.3 Success Metrics

| Metric | Baseline (Phase 1 mobile) | Phase 2 target | How measured |
|---|---|---|---|
| User admin actions completed via web | N/A (mobile only) | ≥90% of admin actions on web | Supabase audit logs on `users`, `project_invitations`, `user_project_assignments` |
| Documents stored as structured revisions | 0 (all are `FileAttachment` on tasks) | ≥5,000 document rows in `documents` table within 60 days of GA | Row count + last updated date |
| RFIs logged per active project | 0 | Median ≥3 per active project per month | `rfis` table stats |
| Submittal packages routed | 0 | ≥1 package per project per month | `submittal_packages` `status` transitions |
| Time to complete: bulk invite 50 users | 50+ taps (mobile) | ≤2 minutes (CSV upload in web) | Synthetic E2E test run on Maestro Playwright for web |
| tsc-noEmit + typecheck on web build | — | rc=0 on every commit | CI pipeline |

---

## 4. Users, Roles, and Permissions

### 4.1 Personas

| Persona | Typical SystemPermission | Typical ProjectRole | Primary web surface |
|---|---|---|---|
| **Company Admin** (Company Owner, Ops Director) | `admin` | `lead_project_manager` on flagship projects | Full web admin shell: Organization, Users, Projects, DMS, Reports, Settings |
| **Project Admin / Lead PM** | `manager` or `admin` | `lead_project_manager` | Project workspace: Dashboard, Tasks, Documents, Submittals, RFIs, Project Team |
| **General Contractor PM** | `manager` | `contractor` | Project workspace: Tasks, Documents (contributor), RFIs, Submittals (submit only) |
| **Subcontractor Foreman** | `member` | `subcontractor` or `foreman` | Compact workspace: My Tasks, Documents (view assigned), My Submittals |
| **Inspector / Architect** | `member` | `inspector` or `architect` | Compact workspace: Tasks (assigned inspections), Documents (review-only), RFIs, Submittals (reviewer) |
| **Owner / Client Rep** | `member` or `manager` | (custom) owner_rep | Read-only project dashboard + documents + RFI log |

### 4.2 Permission Model

The existing normalized matrix from `role-permission-matrix.md` is **extended, not replaced**. Web surfaces use the same helpers: `getUserSystemPermission(user)` for system scope and `getProjectRole(user, projectId)` for project scope. The new DMS layer adds **folder-level ACLs** that sit *on top* of (i.e., further restrict) the baseline project role permissions.

#### 4.2.1 System-Permission Gate (Web Shell)

| Action | `admin` | `manager` | `member` |
|---|---|---|---|
| Access web admin shell (left nav: Organization) | ✅ | ❌ (menu hidden) | ❌ |
| Invite / edit / deactivate users | ✅ | ❌ (only project-level invites) | ❌ |
| Change system permission | ✅ | ❌ | ❌ |
| Create / archive company project | ✅ | ✅ (create only; no archive) | ❌ |
| Manage custom roles / permission catalog | ✅ | ❌ | ❌ |
| Company reports / cross-project dashboard | ✅ | ✅ (own projects) | ❌ (own tasks only) |
| View own profile, reset password | ✅ | ✅ | ✅ |

#### 4.2.2 Project-Role Gate (Project Workspace)

Baseline project role (defined in `buildtrack.ts` → `ProjectRole`) plus the new Lead PM flag:

| Action | lead_pm | contractor | subcontractor | inspector / architect | worker / foreman | owner_rep |
|---|---|---|---|---|---|---|
| Create/edit project team assignments | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Configure project folders / DMS defaults | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Upload document to any folder | ✅ | ✅ | restricted (assigned folders only) | ❌ (review only) | restricted (submittal-only folders) | ❌ |
| Create new document revision | ✅ | ✅ (own docs) | ✅ (own docs) | ❌ | ❌ | ❌ |
| Approve submittal / review RFI | ✅ | review only | ❌ | ✅ (assigned) | ❌ | ✅ (read) |
| Create RFI | ✅ | ✅ | ✅ (assigned tasks) | ✅ | ❌ | ✅ |
| Create submittal package | ✅ | ✅ (submit-only) | ✅ (submit-only) | ❌ | ❌ | ❌ |
| View project document register | ✅ | ✅ | ✅ (filtered by folder ACL) | ✅ (filtered by folder ACL) | ✅ (filtered by folder ACL) | ✅ (read-only) |

#### 4.2.3 Folder-Level ACL (DMS Layer)

Each folder can specify an **override ACL** list of (user OR project-role, permission_tier) tuples:

- `viewer`: read + preview + download only
- `contributor`: viewer + upload + create revision on own files
- `editor`: contributor + move/rename documents, manage subfolders
- `folder_admin`: editor + set ACL on the folder (lead_pm always inherits this at project root)

A folder with no ACL inherits the nearest ancestor's ACL. Project root defaults to project-role permissions from §4.2.2.

### 4.3 Login and Session

- The web shell reuses Supabase Auth with the existing `authStore.supabase.ts` flow, adapted to `supabase-js` web browser session persistence (localStorage).
- Email + password login (current mobile flow) is the only Phase 2 method; SSO/SAML deferred to Phase 3.
- After login, the router dispatches based on system permission:
  - `admin` → `/a/dashboard` (company dashboard + left nav full)
  - `manager` → `/p/:projectId/workspace` (last-active project, or project picker)
  - `member` → `/u/tasks` (compact my-tasks view)
- A context switcher in the top bar lets admins drop into "project admin mode" for any project they lead.

---

## 5. Information Architecture and Navigation

### 5.1 Web Shell Layout

The approved shell from `2026-07-15-insiteapp-web-desktop-control-shell-design.md` is canonical and **extended with DMS/RFI/submittal sections**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [logo]  Acme Construction Co. ▾  Tower Place Residences ▾   🔍  🔔  👤 me  │ ← Top context bar
├────────┬────────────────────────────────────────────────────────────────────┤
│        │  Breadcrumb: Projects › Tower Place › Documents › Plans › MEP      │
│  Side  │────────────────────────────────────────────────────────────────────│
│  bar   │  Header                                                           │
│  (240) │  ┌─ KPI row ───────────────────────────────────────────────┐     │
│        │  │                                                          │     │
│        │  └──────────────────────────────────────────────────────────┘     │
│ Org    │                                                                   │
│ Users  │  ┌─ Content area, e.g. document register ──────────────────┐    │
│ Prjcts │  │                                                          │    │
│ Docs   │  │                                                          │    │
│ Tasks  │  │                                                          │    │
│ RFIs   │  │                                                          │    │
│ Submtl │  │                                                          │    │
│ Rprts  │  └──────────────────────────────────────────────────────────┘    │
│ Sttngs │                                                                   │
├────────┴────────────────────────────────────────────────────────────────────┤
│ Footer: version, support link, legal                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Full Route Map

| Route | Name | Visible role | Notes |
|---|---|---|---|
| `/login` | Login | All | |
| `/a/dashboard` | Company Admin Dashboard | admin | Cross-project rollups, KPIs, exceptions |
| `/a/organization` | Organization profile | admin | Company info, branding, billing contacts |
| `/a/users` | User management | admin | Table of all users; invite, deactivate, change system role, bulk CSV |
| `/a/roles` | Roles & permissions catalog | admin | Manage custom roles (extends `roles` table) |
| `/a/projects` | All projects (admin) | admin | Filter, create, archive, transfer ownership |
| `/a/projects/new` | New project | admin | Multi-step wizard |
| `/a/reports` | Company reports | admin | Aggregate DMS, task, RFI stats |
| `/a/settings` | System settings | admin | Auth policies, DMS defaults, notifications |
| `/p/:projectId/workspace` | Project dashboard | All project members | Health, activity, open queues |
| `/p/:projectId/team` | Project team | lead_pm, admin | Assign roles, manage invites, remove members |
| `/p/:projectId/settings` | Project settings | lead_pm, admin | DMS defaults, folder roots, reviewer routing |
| `/p/:projectId/tasks` | Tasks (web list) | All project members | Full task list with filter (read/write same data as mobile) |
| `/p/:projectId/documents` | Document register | All project members, filtered by ACL | Main DMS surface |
| `/p/:projectId/documents/f/:folderId` | Folder detail | per ACL | |
| `/p/:projectId/documents/d/:documentId` | Document detail + revisions | per ACL | Version chain, preview, audit |
| `/p/:projectId/documents/upload` | Upload | contributor+ | Single or bulk, with metadata form |
| `/p/:projectId/rfis` | RFI register | All project members | Filterable table, export |
| `/p/:projectId/rfis/new` | New RFI | create RFI permission | With linked doc/task picker |
| `/p/:projectId/rfis/:rfiId` | RFI detail | all | Thread, action buttons, attachments |
| `/p/:projectId/submittals` | Submittal register | All project members | Filterable table |
| `/p/:projectId/submittals/new` | New submittal package | lead_pm + contractor | Line items, reviewers, attachments |
| `/p/:projectId/submittals/:packageId` | Submittal detail | all | Package status, per-item workflow, revision history |
| `/u/tasks` | My tasks (compact web) | member | Simplified mobile-style list, documents read-only, no admin |
| `/u/documents` | My documents | member | Filtered: docs assigned to user via submittal, RFI, or task |
| `/u/settings` | Personal settings | All | Password, notification preferences, profile |

### 5.3 Left Sidebar Sections (admin view)

Groups and ordering:

1. **Work**
   - Dashboard
   - Tasks
   - Documents
   - RFIs
   - Submittals
2. **Organization** (admin-only)
   - Users
   - Projects
   - Roles
   - Reports
3. **Settings**
   - Project Settings (context-scoped)
   - System Settings (admin-only)
   - Personal Settings

---

## 6. Module Specifications

### 6.1 Module A: Company Administration

#### 6.1.1 User Management Screen (`/a/users`)

- **Table columns:** Name, Email, System Permission, Company Type, Last Active, Projects (count), Status (Active / Invited / Deactivated)
- **Filters:** System permission, Status, Project membership, Text search on name/email
- **Top actions:** Invite User, Bulk Invite (CSV), Export CSV
- **Row actions:** Edit, Change System Role, Deactivate / Reactivate, Resend Invitation
- **Invite modal:** Name, email, phone (optional), system permission, default project role for one-or-more selected projects
- **Bulk invite CSV schema:** `name,email,phone,system_permission(admin\|manager\|member),project_id_1:role_1,project_id_2:role_2,...` — pre-validated client-side with line-numbered error reporting; no partial commits (atomic upload or abort)
- **Deactivation rules:** A deactivated user is removed from bottom-tab visibility but stays in audit logs; their tasks are reassigned by lead_pm via a 2-step modal (reassign-then-deactivate)

#### 6.1.2 Projects Admin Screen (`/a/projects`)

- **Table columns:** Name, Status, Company, Lead PM, Budget, Start, End, Active Tasks, Overdue, % Complete
- **Filters:** Status, Date range, Lead PM, Search by name/location/client
- **Top actions:** New Project, Export CSV
- **Row actions:** Open Project, Edit, Archive, Transfer Ownership, Configure Team (shortcut to `/p/:id/team`)
- **New project wizard:**
  1. Basics (name, client, status, dates, budget, location)
  2. Lead PM selection
  3. Initial team (optional — add users now or later)
  4. DMS template: empty structure or template from library

#### 6.1.3 Roles Catalog (`/a/roles`)

Extends existing `roles` table (from `roleStore.ts`) with web-editable surface:

- Predefined system roles: Admin, Manager, Member (marked `isSystemRole=true`, cannot be deleted)
- Custom roles: create new RoleName, display name, description, numeric level, and granular permission map via a 2D matrix (rows = capabilities; columns = allowed/denied)
- Permission categories: User Admin, Project Admin, Task Ops, Document Ops, RFI Ops, Submittal Ops, Reports, Settings
- All custom roles are scoped to the company

#### 6.1.4 Reports (`/a/reports`)

Phase 2 ships 6 canonical tabular + chart reports, all exportable to CSV and PDF:

1. Company Portfolio: project status summary, budgets vs % complete
2. Task Health: overdue counts per project, aging buckets (0–3d, 4–7d, 8–14d, 15+d)
3. DMS Activity: uploads/revisions per project, top uploaders, document types
4. RFI Register: open/closed, average resolution time, per-reviewer backlog
5. Submittal Register: status breakdown, cycle time, per-subcontractor performance
6. User Activity: last login, action counts, DMS/RFI/submittal participation

### 6.2 Module B: Project Workspace Administration

#### 6.2.1 Project Team (`/p/:projectId/team`)

- Two sections: **Active Members** (with project role chips) and **Pending Invitations**
- Controls: Add Member (existing user from company), Invite Person (new email), Change Project Role, Remove Member
- Role change confirmation modal shows impact count ("Changing Sarah to subcontractor revokes 3 folder editor grants — proceed?")
- Lead PM transfer: special flow; must pick exactly one new lead_pm

#### 6.2.2 Project Settings (`/p/:projectId/settings`)

Sections:
1. **General** — name, client, dates, status, location, budget, custom fields (text, number, date, dropdown)
2. **DMS Defaults**
   - Revision naming scheme: `A,B,C…` or `1,2,3…` or `Rev01,Rev02…` or custom
   - Default reviewers for new submittals (by project role, e.g., "architect + owner_rep must review structural packages")
   - Default RFI reviewer (architect or lead_pm)
   - Folder template applied at project create (can be re-run from here for new sub-folders)
3. **Notifications** — per-user overrides: digest cadence, RFI due warnings, submittal status changes
4. **Integrations** — placeholder for Phase 3 (Autodesk, QuickBooks, etc.)

### 6.3 Module C: Project Document Management System (DMS) Core

#### 6.3.1 Data Model

New tables in Supabase. Names below are proposed; engineering review may adjust exact naming during schema plan.

```
Table: documents
  id (uuid pk)
  project_id (uuid fk → projects)
  document_number (text, optional but auto-suggested per project convention)
  title (text)
  current_revision_id (uuid fk → document_revisions) ← pointer to HEAD
  discipline (text enum: architectural, structural, mep, civil, geotechnical, specifications, general, other)
  trade (text, optional, references trades catalog)
  document_type (text enum: drawing, specification, submittal, rfi_doc, report, permit, contract, photo, other)
  folder_id (uuid fk → document_folders, nullable for project root)
  uploaded_by (uuid fk → users)
  status (enum: draft, issued_for_review, approved, superseded, archived)
  tags (text array)
  custom_fields (jsonb)
  created_at, updated_at

Table: document_revisions
  id (uuid pk)
  document_id (uuid fk → documents, index)
  revision_label (text, e.g. "A" or "3")
  revision_index (int, monotonically increasing per document_id)
  storage_path (text → Supabase Storage)
  public_url_signed (text, short-lived via RLS)
  mime_type (text)
  file_name (text)
  file_size_bytes (bigint)
  file_hash_sha256 (text, content hash for dedupe detection)
  change_summary (text, user-entered changelog)
  uploaded_by (uuid fk → users)
  uploaded_at (timestamptz)
  superseded_at (timestamptz, nullable)
  superseded_by_revision_id (uuid fk → document_revisions, nullable, self-referential)
  UNIQUE (document_id, revision_label)
  UNIQUE (document_id, revision_index)

Table: document_folders
  id (uuid pk)
  project_id (uuid fk → projects)
  parent_id (uuid fk → document_folders, nullable)
  name (text)
  created_by (uuid fk → users)
  created_at, updated_at
  UNIQUE (project_id, parent_id, name)

Table: document_folder_acls
  id (uuid pk)
  folder_id (uuid fk → document_folders)
  principal_type (enum: user, project_role, system_role)
  principal_id (uuid or text)
  permission_tier (enum: viewer, contributor, editor, folder_admin)
  created_at
  UNIQUE (folder_id, principal_type, principal_id)

Table: document_audit_log
  id (bigserial pk)
  project_id (uuid fk → projects, index)
  actor_id (uuid fk → users)
  action (enum: create, update, upload_revision, supersede, move, rename, delete, view, download, approve, reject, comment)
  document_id (uuid fk → documents, nullable)
  revision_id (uuid fk → document_revisions, nullable)
  folder_id (uuid fk → document_folders, nullable)
  metadata (jsonb) — e.g., {from_folder:X, to_folder:Y}, {old_title, new_title}
  created_at (timestamptz, index on date range)
```

Migration note: Existing `file_attachments` from `fileUploadService.ts` continue to work for task-level evidence uploads. They are **not auto-migrated** into the new DMS in Phase 2; Phase 3 ships a batch migration tool + "promote attachment to document" action.

#### 6.3.2 Document Register Screen (`/p/:projectId/documents`)

- Default view: **Folder tree (left 280px) + result list (rest)**
- Folder tree: expand/collapse, drag-and-drop move for editors, breadcrumb above list
- List columns: #, Title, Discipline, Type, Current Revision, Status, Updated By, Updated At, Size, Actions
- Default sort: Updated At DESC
- Filter bar: Discipline, Type, Status, Revision, Uploaded By, Tags, Date range, full-text search
- Bulk actions: Move to folder, Download ZIP, Tag, Change Status (editor+)
- View modes toggle: List (default), Grid (thumbnails for drawings/photos)
- Pagination: 50/page, server-side cursor

#### 6.3.3 Document Detail (`/p/:projectId/documents/d/:documentId`)

Layout:

```
Left column (60%):
  Breadcrumb
  Document title + status chip + metadata grid
  Preview / viewer tabset (Preview / Info / Revisions / Audit)
    Preview: iframe PDF.js for PDFs, <img> for images, placeholder+download for others
    Info: discipline, trade, type, tags, custom fields, folder path
    Revisions: chronological reverse list w/ diff summary
    Audit: filterable event stream

Right column (40%):
  Action sidebar
    Upload new revision (contributor+)
    Change status (editor+)
    Link to RFI / Submittal
    Download (any version)
    Share signed URL (viewer+, 24h default)
  Related RFIs (cards)
  Related Submittals (cards)
  Comments / activity feed
```

- **Revision chain display:** Head revision always at top, with "Latest approved" vs "Draft" badges. Older revisions are accessible but visually dimmed with `SUPERSEDED` pill.
- **New revision flow:** Click "Upload new revision" → choose file → user sees a diff-hint: if the new file's hash matches any prior revision, warn "Identical content already uploaded as revision C — are you sure?" → user enters change summary → upload → head pointer updates → old HEAD's `superseded_at` and `superseded_by_revision_id` set atomically.

#### 6.3.4 Upload Flow

- Drag-and-drop zone on document register or upload page
- Multi-file support: 200 files per batch
- Per-file metadata form: discipline, document type, trade, tags, initial status (defaults remembered per-user)
- Project-level metadata enforcement: admins can require discipline + type for every upload

#### 6.3.5 Folder Management

- New folder (+) at any level where user has folder_admin or editor
- Move folder: drag to another folder in tree (editor+) — warning if move changes effective ACL
- Delete folder: soft-delete (mark archived, 30-day retention before hard delete, admin-only restore)
- Rename folder: editor+

#### 6.3.6 Permissions Enforcement (RLS + App Layer)

Supabase RLS policies on `documents` and `document_folders`:

- User must be a member of the project (verified via `user_project_assignments`)
- For read, either (a) no folder ACL blocks them, or (b) their user/project_role has at least `viewer` tier on nearest ancestor folder
- For write, contributor tier or higher + write permission from project role
- Every mutation writes a row to `document_audit_log` via a postgres trigger (not just application code), so **the audit trail is tamper-evident at storage layer**

### 6.4 Module D: RFI (Request for Information)

#### 6.4.1 Data Model

```
Table: rfis
  id (uuid pk)
  project_id (uuid fk → projects)
  rfi_number (text, unique per project — auto-generate "RFI-0042")
  title (text)
  question (text, required)
  proposed_answer (text, optional)
  answer (text, nullable until answered)
  status (enum: draft, submitted, under_review, answered, closed, void)
  priority (enum: low, medium, high, critical)
  due_date (date)
  raised_by_id (uuid fk → users)
  assigned_to_id (uuid fk → users) — primary reviewer, typically architect/engineer
  ball_in_court_id (uuid fk → users) — who needs to act next
  cost_impact (enum: none, tbd, increase, decrease, null)
  cost_impact_amount (numeric, optional)
  schedule_impact_days (int, optional)
  linked_task_id (uuid fk → tasks, nullable)
  closed_at (timestamptz, nullable)
  created_at, updated_at

Table: rfi_documents
  rfi_id (uuid fk → rfis)
  document_id (uuid fk → documents)
  revision_id (uuid fk → document_revisions, nullable for HEAD pointer)
  role_in_rfi (enum: source, supporting, response_attachment)
  pk (rfi_id, document_id, revision_id)

Table: rfi_comments
  id (uuid pk)
  rfi_id (uuid fk → rfis)
  author_id (uuid fk → users)
  body (text)
  created_at

Table: rfi_assignees
  rfi_id (uuid fk → rfis)
  user_id (uuid fk → users)
  role (enum: reviewer, cc)
  pk (rfi_id, user_id)
```

#### 6.4.2 RFI Register

Columns: #, Title, Status, Priority, Raised By, Assigned To, Ball In Court, Due Date, Days Open, Linked Docs, Linked Task

Sort default: Priority DESC + Due ASC. Filters same pattern as documents + Cost Impact / Schedule Impact flags. Export CSV one-click.

#### 6.4.3 New RFI Flow

- From documents screen: user selects a document revision → context menu "Raise RFI" → pre-fills linked document + revision
- From task detail: "Raise RFI" button → linked_task_id filled
- From scratch: `/p/:projectId/rfis/new`
- Form fields: title, question, proposed answer, priority, due date, assigned_to (defaults per project settings), CC list, linked documents, linked task
- Draft autosave every 5s to localStorage

#### 6.4.4 RFI Detail

Tab layout: **Question** (readonly once submitted, editable if draft), **Discussion** (comments), **Attachments**, **Activity** (audit log of status changes). Right rail shows BIC, due countdown, cost/schedule impacts, and action buttons.

Transitions:
- Draft → Submitted: raises notification to assigned_to
- Submitted → Under Review: assigned_to acknowledges
- Under Review → Answered: answer field filled; assigned_to marks answered; ball returns to raised_by
- Answered → Closed: raised_by confirms answer resolves question
- Answered → Under Review (re-open): raised_by requests clarification, BIC returns to assigned_to
- Any → Void: with reason entered

Every transition writes to activity and triggers notifications per user's preferences.

### 6.5 Module E: Submittals

#### 6.5.1 Data Model

```
Table: submittal_packages
  id (uuid pk)
  project_id (uuid fk → projects)
  package_number (text unique per project, auto "SUB-0117")
  title (text)
  spec_section (text, optional, references CSI division — "03 30 00 Cast-in-Place Concrete")
  submittal_type (enum: shop_drawing, product_data, samples, calculations, mockups, test_reports, as_builts, other)
  status (enum: draft, submitted, under_review, revisions_required, resubmitted, approved, rejected, closed)
  submitted_by_id (uuid fk → users, typically subcontractor rep or contractor PM)
  ball_in_court_id (uuid fk → users)
  lead_reviewer_id (uuid fk → users)
  due_to_architect (date, nullable)
  returned_from_architect (date, nullable)
  required_on_site (date, nullable)
  summary_note (text, optional)
  created_at, updated_at

Table: submittal_items
  id (uuid pk)
  package_id (uuid fk → submittal_packages)
  item_number (text, within package, e.g. "01", "02")
  title (text)
  description (text, optional)
  status (enum: pending_submittal, submitted, under_review, approved, approved_as_noted, revise_and_resubmit, rejected, no_exception_taken)
  reviewer_notes (text)
  created_at, updated_at

Table: submittal_item_documents
  item_id (uuid fk → submittal_items)
  document_id (uuid fk → documents)
  revision_id (uuid fk → document_revisions, nullable)
  role (enum: submittal, review_markup, resubmittal, as_built)
  pk (item_id, document_id, revision_id)

Table: submittal_reviewers
  package_id (uuid fk → submittal_packages)
  item_id (uuid fk → submittal_items, nullable = package-level reviewer)
  user_id (uuid fk → users)
  role (enum: primary_reviewer, secondary_reviewer, approver, cc)
  response (enum: pending, approved, approved_as_noted, revise_and_resubmit, rejected)
  responded_at (timestamptz, nullable)
  comment (text, nullable)
  UNIQUE (package_id, item_id, user_id, role)

Table: submittal_transitions
  id (bigserial pk)
  package_id (uuid fk → submittal_packages)
  item_id (uuid fk → submittal_items, nullable)
  actor_id (uuid fk → users)
  from_status, to_status (enums)
  comment (text, nullable)
  created_at
```

#### 6.5.2 Submittal Register

Columns: #, Package, Spec Section, Type, Items (count), Status, Submitted By, Lead Reviewer, Due (to architect), Required On-site, Days Outstanding

Filters same document pattern; saved views (e.g., "Mechanical resubmittals") are stored per-user.

#### 6.5.3 Submittal Package Flow

1. **Contractor creates package:**
   - Enter metadata, add line items
   - Attach documents (already uploaded to DMS, or upload inline which routes to project/Submittals folder)
   - Assign reviewers: per-project default rules apply, then contractor adjusts per package; can also add per-item reviewers for mixed packages
2. **Submit → Under Review:**
   - Ball moves to lead reviewer
   - All reviewers notified
3. **Reviewers respond:**
   - Each reviewer opens the package → per-item approve / approve-as-noted / revise-and-resubmit / reject with comments + markup documents
   - When all reviewers responded, or after architect closes review, aggregate per-item status
4. **Response to contractor:**
   - Package moves to `revisions_required` (any item revise/reject) or `approved` (all approve/approve-as-noted/no-exception)
   - Contractor notified; if revisions required, BIC = submitter
5. **Resubmittal cycle (if needed):**
   - Contractor uploads new document revisions (or same docs with responses noted)
   - Creates a new revision of the submittal. Recommended: keep base package number, add `resubmittal_count` field for display as `SUB-0117.1`; exact naming convention resolved per §10 Q5.
6. **Closeout:**
   - Once all items are resolved status, package moves to closed, timestamp, as-built links exported

Submittals and RFIs are bidirectionally linkable: an RFI can reference a submittal item, and a submittal item can reference an RFI that blocks it.

---

## 7. Architecture & Engineering Approach

### 7.1 Platform Choice: Expo Web (Expo Router or Next.js + Shared UI)

The existing stack ships `react-native-web` (version `^0.20.0`) and a `web` script in `package.json`:
```
"web": "expo start --web"
```

This spec recommends building the web admin on **Expo Web** with the same shared codebase as the mobile app, but with a **desktop-optimized layout shell**. A dedicated Plan Mode workstream will validate whether to structure routes with Expo Router (moving current screens to app/ directory) or keep stack navigation for mobile while adding a separate web router (e.g., React Router) for admin URLs. Either way, the key engineering outcomes are:

| Outcome | How |
|---|---|
| **Shared state layer** | Zustand stores (`authStore.supabase.ts`, `userStore.supabase.ts`, `projectStore.supabase.ts`, `taskStore.supabase.ts`) are consumed identically on web and mobile; RLS ensures same permission contract |
| **Shared API client** | `src/api/supabase.ts` singleton reused; DMS module adds its own service file `src/api/documentService.ts` |
| **Platform-aware UI** | Shared primitives (NativeWind classes, View/Text/Touchable) with platform-specific shells: `src/screens/web/` for desktop-only layouts, mobile screens stay as-is |
| **Responsive breakpoints** | Below 768px → mobile layout (same as current app); above 1200px → 3-column admin shell; between → compact desktop |
| **TypeScript everywhere** | Web screens live under same `tsconfig.json` strict checks as mobile — no separate JS layer |
| **Bundle** | `expo export:web` produces static bundle that deploys to Supabase Storage hosting or Vercel (decision deferred to implementation plan — Vercel recommended for web-first CDN edge + preview deployments) |

### 7.2 Module File Structure (Proposed)

```
src/
  api/
    documentService.ts          ← DMS CRUD + revision + RLS-aware uploads
    rfiService.ts               ← RFI logic, transitions, assignments
    submittalService.ts         ← submittal package flow
  state/
    documentStore.supabase.ts   ← Zustand store for documents (paginated lists)
    rfiStore.supabase.ts        ← RFI register + detail state
    submittalStore.supabase.ts  ← submittal register + detail state
  types/
    dms.ts                      ← Document, DocumentRevision, Folder, ACL, AuditEntry
    rfi.ts                      ← RFI, RFIComment, LinkedRfiDoc, StatusEnums
    submittal.ts                ← Package, Item, Reviewer, Response, Transition
  screens/
    web/                        ← web-only desktop shells, not rendered on mobile
      WebAppShell.tsx           ← Sidebar + top bar scaffold
      admin/                    ← company admin screens (Module A)
      project/                  ← project workspace shell (Module B)
      dms/                      ← Documents, Folder, Upload, Detail (Module C)
      rfi/                      ← RFI register & detail (Module D)
      submittal/                ← Submittal register & detail (Module E)
    shared/                     ← components shared b/t web & mobile: DocumentPreviewCard, RfiBadge, StatusChip
  components/
    web/                        ← desktop-only components (DataTable with column resize, SidebarNav, Breadcrumbs, ACL editor)
  webRouter/                    ← web route definitions, permission guards, 404
```

### 7.3 File Upload and Storage

- Documents uploaded to Supabase Storage bucket `buildtrack-documents` (separate from existing `buildtrack-files` which is for task evidence).
- Storage path convention: `{companyId}/{projectId}/{documentId}/{revisionIndex}-{file_name_sanitized}`
- Upload pipeline: client → chunked upload via `supabase-js` `storage.from().upload` → signed URL for private read → `document_revisions.storage_path` → write `document_audit_log` row via Postgres trigger.
- Max file size: 500 MB per file (enforced at policy). Phase 3 may introduce multipart/chunked via tus.io for larger sets.
- Dedupe: On revision upload, compute sha256 client-side; if existing revision hash matches within same document, warn user with one-click "Bump metadata only without new blob" option.
- Preview rendering: PDFs via `react-pdf` (desktop) / lightweight embedded PDF.js; images via `expo-image` web variant; unsupported MIME types → download-first, no preview.

### 7.4 Notifications

Phase 2 DMS notifications reuse the existing `expo-notifications` infrastructure for mobile. Web adds:

- In-app top-right bell (unread count badge) backed by a `notifications` Supabase table (new).
- Email digest: daily (default) or immediate per-event for admin/manager users (configurable in personal/project settings).
- Email dispatch via Supabase Edge Function `send_digest_email` with SendGrid or Resend (TBD in infra plan — SendGrid preferred if existing integration exists, else Resend).
- Event types: document revision uploaded, document approved, RFI assigned/answered/due, submittal routed/responded, user invited/role changed.

### 7.5 Security & Compliance Notes

- **RLS-first.** Every new table has Row Level Security enabled. Application code treats RLS as the enforcement layer; in-app permission checks are UX-hiding only.
- **Audit log immutability.** `document_audit_log`, `rfi_comments` (after submit), and `submittal_transitions` rows are `INSERT ONLY` via Postgres policy — no UPDATE or DELETE allowed for non-superusers. This makes the tables suitable for dispute evidence.
- **Signed URLs.** Document public URLs are short-lived (default 24h, max 7 days, non-admin capped at 48h). Permanent sharing is forbidden; share links must always be signed.
- **Session handling.** Web session refreshes through Supabase auth standard refresh_token flow in localStorage. Idle timeout: 2 hours (admin-configurable in system settings; min 15m, max 24h).
- **PII boundaries.** When `member` users export a document register CSV, it contains only document metadata — no other users' email addresses or phone numbers are included (scrub at query layer).
- **Phase 2 does NOT include SOC 2 audit preparation checklist.** That will be a cross-cutting workstream in the quarter after GA.

---

## 8. Phased Delivery Sequence

Recommended slicing order (WS-WEB + WS-DMS workstreams):

| Slice | What ships | Milestone status after slice |
|---|---|---|
| **WS-WEB / M-WEB-01** | Web login shell, layout shell, routing, permission guards, `/a/users` (CRUD + CSV) + `/a/projects` list | Company admin skeleton usable |
| **WS-WEB / M-WEB-02** | Project workspace shell, `/p/:id/team`, `/p/:id/settings`, project dashboard KPI widgets | Project admin skeleton usable |
| **WS-DMS / M-DMS-01** | Supabase schema (documents, revisions, folders, ACLs, audit), DMS list + detail, single/bulkupload, preview, revision chain, audit log viewer | DMS core live, usable by teams |
| **WS-DMS / M-DMS-02** | Folder management (CRUD, move, ACL editor), DMS project defaults in project settings, search+filters, full-text (pg_search or Supabase pgvector TBD), CSV export | Production-ready DMS |
| **WS-DMS / M-DMS-03** | RFI module: schema, register, new/draft, detail, transitions, link to docs + tasks | RFI live |
| **WS-DMS / M-DMS-04** | Submittal module: schema, packages, line items, reviewers, transitions, link to RFIs/docs | Submittals live |
| **WS-WEB / M-WEB-03** | Reports (6 canonical), roles catalog web editor, branding/org profile editor, billing contact UI, mobile web compact views for members | Full Phase 2 scope complete |
| **WS-QA / M-QA-04** | Web E2E Playwright + Maestro cross-browser smoke, permission regression matrix for 3 system roles × 6 project roles × 5 modules | Closed = sign-off ready |

This sliced approach means usable value lands after **M-WEB-01 + M-DMS-01** (roughly 40% of effort), and the team can dogfood document register while RFIs and submittals are still in progress.

---

## 9. References and Further Reading

### Competitor sources
- ZipDo — *Top 10 Best Construction Diary Software of 2026* (Jun 2026) — compares Procore, ACC, Aconex, Buildertrend, Fieldwire on document collaboration & diary integration
- Pelles.ai — *Construction Document Control Software: 10 Best Tools (2026)* — document intelligence, DMS vs. document control vs. workflow vs. collaboration breakdown
- Construction Frontier — *20 Best Construction Collaboration Software Reviewed for 2026* — PlanGrid/Bluebeam/Aconex positioning
- EngineeringCivil — *9 Best Software for Construction Document Control and Compliance (2026 Review)* — InEight Document vs. Aconex vs. e-Builder, scoring matrix
- CMIC Global — *Construction Document Management Guide: Solutions and Best Practices* (Apr 2026) — version control, RBAC, folder structures best practices
- Gitnux — *Top 10 Best Project Document Control Software of 2026* — MasterControl/ETQ/ComplianceQuest-style regulated workflows, relevant for audit-trail design
- Procore Library — *Control the Chaos: Standardising Document Workflows in Construction Projects* (Nov 2025) — Order of Precedence, BS ISO 19650 alignment
- Zepth — *Streamlining Submittals and RFIs with Digital Document Management* (Dec 2025) — submittal and RFI workflow automation patterns

### Internal documents
- [ROADMAP.md](file:///Volumes/KooDrive/InsiteApp/documentation/ROADMAP.md) — WS/M/S status ledger
- [AGENTS.md](file:///Volumes/KooDrive/InsiteApp/AGENTS.md) — current closed milestones and agent inventory
- [role-permission-matrix.md](file:///Volumes/KooDrive/InsiteApp/documentation/role-permission-matrix.md) — SystemPermission vs ProjectRole source of truth
- [2026-07-15-insiteapp-web-desktop-control-shell-design.md](file:///Volumes/KooDrive/InsiteApp/docs/superpowers/specs/2026-07-15-insiteapp-web-desktop-control-shell-design.md) — approved web shell layout (sidebar + top bar + canvas)
- [buildtrack.ts](file:///Volumes/KooDrive/InsiteApp/src/types/buildtrack.ts) — types for User, SystemPermission, ProjectRole, Task, Project
- [authStore.supabase.ts](file:///Volumes/KooDrive/InsiteApp/src/state/authStore.supabase.ts) — current auth hydration
- [fileUploadService.ts](file:///Volumes/KooDrive/InsiteApp/src/api/fileUploadService.ts) — existing FileAttachment model (Phase 1 task evidence uploads)
- [UserManagementScreen.tsx](file:///Volumes/KooDrive/InsiteApp/src/screens/UserManagementScreen.tsx) — current mobile user admin UX to match for parity

### Standards
- **BS ISO 19650-1:2018** and **ISO 19650-2:2018** — Organization and digitization of information about buildings and civil engineering works, including Common Data Environment (CDE) workflows for naming, status, approval
- **CSI MasterFormat 2024** — 50-division spec section taxonomy used for Submittal.spec_section dropdown

---

## 10. Open Questions and Assumptions

This section explicitly flags decisions not yet locked. Each should be resolved before slicing WS-WEB/M-WEB-01:

| # | Question / assumption | Risk if wrong | Recommended resolution owner |
|---|---|---|---|
| Q1 | Web bundle **platform**: EAS Hosting vs Vercel (Storage hosting rejected). **URL locked 2026-08-17:** `https://app.insiteworks.co` (CNAME to chosen host; Auth redirect allowlist) | Wrong host = extra DNS/env work; wrong URL = Auth/store mismatch | Platform engineer, before M-WEB-01 |
| Q2 | Email provider for DMS/RFI notifications: SendGrid vs. Resend vs. Supabase in-product | Different pricing, templates, deliverability | Infra/security, before M-DMS-03 |
| Q3 | Full-text search engine for documents: Postgres `tsvector` + pg_trgm (Phase 2) vs. pgvector + embeddings (skip to Phase 3) | Search quality, infra complexity | Engineering lead + product, before M-DMS-02 |
| Q4 | Drawing compare / DWG support: explicitly Phase 3 (as stated) — confirm no client demands pull it forward | Scope creep, 2–4 weeks of unplanned work | Product + sales, before kickoff |
| Q5 | Submittal `resubmittal_count` naming convention (SUB-0117.1 vs. new package SUB-0118) | User confusion on closeout log | PM domain SME, before M-DMS-04 |
| Q6 | Existing `file_attachments` → documents promotion: manual "promote" action (assumed) vs. migration batch tool | Latent file sprawl, discovery burden | Product + migration engineer, before M-DMS-01 GA |
| Q7 | Custom document_number scheme: per-project free-form (assumed) vs. company-wide enforced | Rollout friction when companies have own CAD standards | Product + ops SME, before M-DMS-02 |
| Q8 | Phase 2 scope boundary: confirm **no billing/payments, no SSO, no public API, no transmittal engine** | Scope growth could double Phase 2 budget | Product + executive sponsor, before kickoff |
| A9 | Assumption: Expo Web + react-native-web + shared Zustand stores is viable at admin scale; no separate Next.js rewrite needed | If performance stalls on list views, may need to split web router or migrate to Next.js | Engineering architect, spike in M-WEB-01 week 0 |
| A10 | Assumption: Supabase Storage `buildtrack-documents` bucket can be created with company-scoped RLS policies matching user's company_id | If policies cannot be nested to that depth, need middleware uploader | DBA + security, before M-DMS-01 |

---

End of specification v1.0.
