# Investigation & Multi-Model Evaluation: Worker "Report Issue" vs. PM "Task Triage" Workflow

**Date:** 2026-09-02  
**Status:** COMPLETE (Analysis & Architectural Evaluation)  
**Evaluators / Models:** [Grok (cursor-grok-4.6-xhigh)](caf645ae-fad2-4e27-86db-439786b432f7), [Gemini (gemini-3.7-flash-high)](59c1d65d-8dac-4f33-bb83-4b981a6bd110), [GPT (gpt-5.3-codex)](0cb9eeb9-762e-4d23-b889-e1a04601c7e5)  
**Related Documents:**
- `documentation/role-permission-matrix.md` (Role & Privilege Inventory)
- `docs/superpowers/plans/2026-08-24-company-user-project-model.md` (Locked M-AUTHZ-RC Model)
- `documentation/multi-company-project-membership.md` (M-AUTHZ-02 Law)
- `src/ui/contracts/taskDelegationPermissions.ts` (Who-to-Whom Privilege Ranks)

---

## 1. Executive Summary & Verdict

### Multi-Model Consensus Verdict: **AGREE WITH CAVEATS**

| Evaluator | Model | Verdict | Core Finding |
|---|---|---|---|
| **Evaluator 1** | Grok 4.6 xhigh | **AGREE WITH CAVEATS** | Right for cross-trade discoveries (the WhatsApp photo observation). Wrong as a blanket replacement for worker create, because trades and foremen must still log their own work without PM delay. |
| **Evaluator 2** | Gemini 3.7 Flash | **AGREE WITH CAVEATS** | Highly aligned with construction contractual boundaries and strips field cognitive load. Requires a self-assigned direct bypass to avoid severe PM bottlenecks. |
| **Evaluator 3** | GPT 5.3 Codex | **AGREE WITH CAVEATS** | Matches field deficiency logging reality. Recommends zero-DDL UI framing on existing tasks first before attempting database status expansion. |

### Core Synthesis
Field workers capturing site conditions are fundamentally performing one of two distinct actions:
1. **Reporting a Discovery / Cross-Trade Defect ("Report Issue"):** The worker spotted a site deficiency (e.g., pipe clash, water ingress, missing scaffolding) outside their direct scope. They should not set cross-trade assignees, due dates, or billing status. This must route to the PM for validation and assignment.
2. **Logging Own-Scope Execution ("My Task / Self-Assign"):** A trade worker or foreman logging remaining punch items or internal crew to-dos. Forcing this through PM triage creates a massive jobsite bottleneck and causes workers to abandon the app.

**Conclusion:** The app should implement a **Dual-Intent Capture Model** on a single unified entity, rather than forcing 100% of worker actions through a mandatory triage gate or splitting the database into separate tables.

---

## 2. Construction Domain & Real-World Industry Analysis

### 2.1 Jobsite Hierarchy & Trade Boundaries
In commercial and residential construction, trade boundaries are legally and contractually enforced:
- **Contractual Scope Enforcement:** A drywall subcontractor cannot assign work to an MEP subcontractor. Direct cross-trade task creation creates immediate contractual friction ("Who authorized you to direct my subcontractors?").
- **Field Cognitive Burden:** Field workers wear gloves, operate in dust and glare, and lack commercial context regarding project billing phases or master milestone schedules. Requiring workers to pick assignees, set priorities, and choose billing statuses results in dummy/fallback data.
- **Foremen vs. Laborers in Seat Model:** Taskr's locked commercial model (`M-AUTHZ-RC`) provides two deployable seat types: **PM** (`manager`) and **Worker** (`member`). Subcontractor foremen hold Worker seats. If all Worker creates require GC PM triage, trade foremen cannot run daily site tasks for their crews.

### 2.2 Benchmark Against Major Industry Platforms

| Platform | Field Capture Model | Management Triage & Conversion Model | Insite/Taskr Takeaways |
|---|---|---|---|
| **Procore** | **Observations Tool:** Field workers log observations with photo + location without setting formal trade work orders. | **Observation $\to$ Punch/RFI:** PM verifies validity and promotes to Punch Item or Work Order. | Confirms observation capture value; however, Procore users widely cite two-tool conversion friction. |
| **Autodesk Construction Cloud (ACC / PlanGrid)** | **Issues (Single Entity):** Field users log issues with limited fields (photo, pin, category). Can be left **Unassigned**. | **Issue Assignment & Routing:** PM assigns responsible company/trade, sets root cause and due date. | **Exact match for recommended Path B+ / A:** Single entity with unassigned triage state. |
| **Fieldwire** | **Fast Task Capture:** Photo-first task creation with hashtags and location stamps. | **Category Routing:** Tasks sit in category inbox or route to designated trade lead. | Demonstrates sub-10-second mobile capture loop. |
| **PlanRadar / Novade** | **Defect Pinning:** Workers drop a pin on a drawing, attach photos, and submit. | **QA/QC Manager Review:** QA manager validates and batches into contractor work packages. | Confirms field speed priority over upfront metadata. |

### 2.3 Jobsite Edge Cases & Bypass Requirements
1. **Self-Logging Remaining Work:** Electrician punching out the last 5 boxes before inspection. Must start immediately in `in_progress`.
2. **Trade Foreman Direct Delegation:** Trade foreman assigning 3 tasks to their own crew members.
3. **Safety / Urgent Hazard:** Stop-work hazards need instant push notification to PM, not quiet placement in a batch queue.
4. **SME / Lean Jobsites (5–15 people):** PM is actively on tools; mandatory multi-step triage halts day-to-day work.

---

## 3. Product & UX Trade-off Analysis

```
                                  [ User Initiates Create ]
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
          [ Intent A: Report Issue ]                       [ Intent B: My Task ]
          (Default for Workers)                            (Self-Assigned / Crew)
                     │                                                 │
          • Photos (Required)                              • Photos (Optional)
          • Title (Required)                               • Title (Required)
          • Location (Required)                            • Location (Optional)
          • Omit: Assignee, Due Date, Billing              • Assignee: Self (Locked)
                     │                                                 │
                     ▼                                                 ▼
           status: 'new'                                    status: 'in_progress'
           needs_triage: true                               needs_triage: false
           assigned_to: []                                  assigned_to: [user.id]
                     │                                                 │
                     ▼                                                 ▼
             [ PM Triage Inbox ]                              [ Active Work Loop ]
```

### Worker UX Delta
- **Before:** Mandatory Assignee picker (blocked from picking supervisors by who→whom rank $\to$ forced awkward self-assign), Priority picker, Billing Status radio, Due Date calendar.
- **After (Report Issue):** Camera $\to$ Title $\to$ Location $\to$ Submit. Total time: **$<10$ seconds**.
- **Transparency Safeguard:** "My Reported Issues" filter so workers see when their issue is accepted, assigned, or dismissed.

### PM UX Delta
- **Before:** PM receives tasks already marked `in_progress` by workers (false self-assignment) or missing proper trade allocation.
- **After:** Clean **Triage Queue** on Activity home:
  - 1-tap **Assign Trade & Due Date** $\to$ Promotes to formal task (`status: 'new'`).
  - 1-tap **Self-Assign (Take)** $\to$ Promotes to `status: 'in_progress'`.
  - 1-tap **Dismiss** $\to$ Moves to `status: 'cancelled'` with a reason chip visible to reporter.

---

## 4. Architectural Comparison: Path A vs. Path B vs. Path C

| Evaluation Dimension | **Path A: Unified Table + New Status** (`reported`) | **Path B: Unified Table + Triage Flag** (`needs_triage`) | **Path C: Separate `issues` Table** |
|---|---|---|---|
| **Postgres DDL / Schema Impact** | **Medium:** Updates `TaskStatus` enum / DB check constraint. Requires migration. | **Minimal / Zero:** Reuses existing schema or adds 1 boolean column (`needs_triage`). | **High:** New tables (`issues`, `issue_attachments`, `issue_activities`), FKs, RLS policies. |
| **State Store (`taskStore.supabase.ts`)** | **Medium:** Status machine changes, filter updates across store selectors. | **Low:** Extends existing store, relaxes `NO_ASSIGNEES` only when `needs_triage = true`. | **High:** Duplicate stores, duplicate Realtime channels, complex conversion transactions. |
| **Realtime & Offline Sync** | Inherits existing `task_activities` publication (`M-SUPABASE-04a`) and draft cache. | Inherits existing Realtime publication and offline queue. | Major duplication; risks sync split-brain during issue $\to$ task conversion. |
| **Data Integrity & Reconciliation** | Clean status machine; avoids overloading `new`. | Requires `reconcileUnrecoverableWipTasks` to spare unassigned triage items. | Clean separation on paper; high operational conversion friction. |
| **Solo Dev Effort & Risk** | **Medium (1–2 Sprints)** | **Low (0.5–1 Sprint)** — Ideal Phase 1 | **Very High (3–4 Sprints)** — High regression risk |

---

## 5. Decision & Phased Implementation Strategy

### Phase 1: Dual-Intent UI Framing & Unassigned Triage (Zero-DDL)
1. **CreateTaskScreen:** Render simplified "Report Issue" form for Workers (hiding Assignee, Billing, Due Date) with a toggle to switch to "My Task" (self-assign).
2. **Validation Rule:** Relax `NO_ASSIGNEES` validation in `taskCreateValidation.ts` when `needs_triage` is set.
3. **Reconciler Guard:** Ensure `reconcileUnrecoverableWipTasks` only auto-cancels unassigned tasks in `in_progress` state, preserving unassigned triage `new` tasks.
4. **PM Triage UI:** Add "Needs Triage" queue section on Dashboard/Activity with one-tap "Assign" and "Dismiss" actions.

---

## 6. Multi-Company (`M-AUTHZ-02`) Synergy & Bundling Decision

### 6.1 Multi-Model Evaluation on Bundling
Evaluated across three independent models ([Grok](873f2c5e-9cf0-4e66-82ca-9ccb41cd3e89), [Gemini](ef19666b-4fdf-43be-b63a-c9c24dc5f9a8), [GPT](485f8ca9-2122-43d3-8b25-6f6ab07567e5)) on whether to build Worker Issue Reporting together with Multi-Company Project Membership (`M-AUTHZ-02`) "in one go":

**Consensus Verdict: STAGED IMPLEMENTATION (Do NOT bundle in one go right now).**

### 6.2 Multi-Company Synergy Analysis
The **Report Issue $\to$ PM Triage** mechanism is the **canonical architectural interface** for cross-company collaboration on a multi-trade jobsite:
1. **Contractual Scope Enforcement:** Subcontractor guest workers cannot direct other trade contractors (e.g., Drywaller cannot assign a task to a Plumber). "Report Issue" provides the legal/contractual boundary: guest workers report site observations to the Host General Contractor PM/Project Admin (PA).
2. **Preserves Anti-Directory Isolation Wall:** Under `M-AUTHZ-02`, there is **no global user directory** and no cross-company browsing. Stripping the assignee requirement from "Report Issue" means guest workers need zero visibility into other companies' rosters.
3. **Subcontractor Dual-Mode Need:** Subcontractor crews on site need both:
   - *Report Issue (Cross-Trade):* Report defects/blockers to the Host GC PM.
   - *My Task (Internal Scope):* Self-assign remaining punch items without waiting for GC triage.

### 6.3 "In One Go" vs. "Staged" Risk & Complexity Matrix

| Dimension | Option A: Bundle in One Go Now | Option B: Staged (Phase 1 Zero-DDL $\to$ Post-RC `M-AUTHZ-02`) |
|---|---|---|
| **Delivery Risk & Bandwidth** | **Critical:** Concurrently building new membership models, invite URLs, host absorb, and triage forms. | **Low:** Single-threaded validation; immediate single-company UX gains. |
| **Schema & DDL Blast Radius** | **High:** Multiple new tables (`project_invites`, partner liaison roles, cross-tenant RLS). | **Zero DDL:** Phase 1 uses existing `tasks` table (`status: 'new'`, `assigned_to: []`). |
| **Release Spine Alignment** | **Fatal:** Violates locked commercial spine (`docs/superpowers/analysis/2026-08-19-roadmap-clarification.md`), delaying App Store and Stripe launch. | **Preserved:** Respects spine; Phase 1 operates as an idle-parallel UX enhancement. |
| **Throwaway Risk** | N/A | **Zero:** Phase 1 data contract is 100% forward-compatible with `M-AUTHZ-02`. |

### 6.4 Forward-Compatibility Architectural Rules (Zero Throwaway)
1. **Single Entity Contract:** Store reports in `tasks` with `status: 'new'` and `assigned_to: []`. In `M-AUTHZ-02`, cross-company project tasks query identically by `project_id`.
2. **Attribution via `assigned_by`:** Reporter is stored in `assigned_by`. When `M-AUTHZ-02` lands, joins to `users.company_id` automatically display the reporter's subcontractor company name.
3. **Strict Assignee Privacy:** Keep assignee pickers hidden on worker create. Never allow guest workers to browse host rosters.
4. **Reconciler Guard:** Preserve unassigned `new` tasks while continuing to auto-cancel illegal unassigned `in_progress` WIP.

