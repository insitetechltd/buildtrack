# Roadmap clarification — 2026-08-19

**Status:** Locked product sequence + AI policy. Revisit from time to time; do not silently replace.

**When to reopen this file:** any discussion of ROADMAP, Wave 2, AI, DMS, drawings, cost, owner console, Save Draft, multi-company / project invite / partner liaison / seat billing, customer-managed / BYO storage, or “what we build after RC.”

**How to reopen:** read this file **before** proposing new milestones or pulling Wave 2 / generic LLM work forward. Then update this file if the user changes the lock (date the addendum). Chat is scratch; this file + `documentation/ROADMAP.md` + `documentation/NOW.md` are the pick-up.

**Execution SoT (order):** `docs/superpowers/plans/2026-08-19-post-rc-boring-loop.md`  
**Gaps / owner console plan:** `docs/superpowers/plans/2026-08-19-workflow-gaps-bin.md`  
**Cursor canvases (local, not git):** `task-lifecycle`, `app-honest-assessment`, `field-ai-drawings` under the workspace `canvases/` folder.

---

## Product we are targeting

A similar-scale construction **field** app that wins the next year by being boring on purpose:

1. One loop you can defend: **photo → task → accept/decline → update → review**
2. Tight status machine (stars match validation; no fake WIP)
3. An **owner** who can see production (illegal states), not a chatbot that sounds sure

Not Procore. Not a construction OS in RC week. OS layers (documents, then cost) come after the loop is tight.

Honest assessment vs 1–2 person Expo+Supabase peers (judgment, 2026-08-19): discipline/tests high; implementation tightness medium (god files); ops visibility low. Verdict: ready to **sell the field loop**, not the OS.

---

## Sequence (do not jump)

| Order | ID | What |
|---|---|---|
| Now | Commercial RC | Ship the field loop. No new product surfaces. |
| 15.05 | `M-OPS-01` | In-app **owner command console** (allowlisted Tristan). Workflow-gaps bin. Not Activity, not Henry Admin, no extra web host. |
| 15.06 | `M-OPS-02` | Shrink `taskStore.supabase.ts` / `CreateTaskScreen` / `AppNavigator`. Enforce intended states. |
| 15.065 | `M-AUTHZ-02` | Multi-company membership: partner **liaison** + project invite + optional host-absorb seats. SoT: `documentation/multi-company-project-membership.md`. Not RC. |
| 15.07 | `M-AI-01` | Field Q&A over **this project’s dataset** (tasks/photos/activity). Cite or abstain. Create Task LLM is on-ramp only. |
| Wave 2 | `M-DMS-01` … | **Document control** (current revision). Unblocks drawing assist. Opens window for **`WS-STORAGE`** (customer-managed storage) — Deferred until then. |
| After DMS start | `M-STORAGE-01`… | Enterprise privacy storage discovery → abstraction → pilot → export → DMS converge. Must not jump OPS/AI. |
| 15.08 | `M-AI-02` | Drawing **assist** only: title block, current rev, quote a **crop**. Not infer geometry / 3D-as-truth. CAD = convert or specialist API. |
| 15.6 → 15.11 | `M-DMS-04` → `M-AI-03` | Approved submittals, then **barcode** material spec-check for this location/sequence. Unlabeled hardware never auto-pass. |
| 15.10 | `M-COST-01` | Jobsite cost after DMS. Not R6 SKUs, not storage-GB metering. |
| 15.1 | `M-WEB-01` | Company web admin (`app.insiteworks.co`). After OPS-02. Not a laptop host. |

`M-SUPABASE-04b` (~2026-09-07) is calendar hygiene; it must not jump this queue.

---

## AI policy (high certainty only)

Apply AI only where we can **cite a record**. Otherwise abstain.

**In:** dataset Q&A; voice/text → fields with human confirm; barcode/label → approved submittal; drawing crop quote with sheet+rev.

**Out:** infer dimensions/grids/fit/design intent; treat Sonnet 2D→3D viz as truth; “this unlabeled screw is up to spec”; RAG over spec PDFs or whole drawing sets.

**Why RAG failed before / why drawing inference is hard:** drawings are spatial and revisioned. Generic chunk-embed-retrieve drops coordinates and current-rev. Vision demos look like understanding; they are spatial storytelling. Independent AEC benches still fail symbol counts. Wrong-project or superseded-rev answers are **safety defects**.

Claude/Sonnet: reasonable **document assistant** (describe, quote, abstain). Not a CAD engine. App today uses `claude-3-5-sonnet-20240620` for **text → task fields**, not sheet vision.

---

## Explicit rejects (do not revive without a new lock)

- Save Draft as unassigned `in_progress` (illegal WIP, not a draft product). Cancel/back = no trace.
- Workflow-gaps on Activity / Tasks / company Admin (confuses workers). Owner-only.
- Hosting the owner console on a new web box **this week**; laptop `localhost` is not a product host.
- Jumping Wave 2 / DMS / IAP / email-invite ahead of RC → OPS-01 → OPS-02.
- Customer-managed / BYO storage ahead of RC → OPS-01 → OPS-02 → `M-AI-01` → Wave 2 / `M-DMS-01` (parked as `WS-STORAGE`; see 2026-08-21 addendum).
- Building an in-app DWG parser in year one.
- Global user directory for project team pickers (any role). Multi-company join is liaison + project invite + optional host-absorb only (`M-AUTHZ-02`).

---

## Intended task states (for M-OPS-02 / gaps)

`new` (assigned, waiting accept) → Accept writes **`in_progress`** (runtime skips `accepted`) → submit at 100% → Approve / Reject. Decline and Cancel are off-ramps. Unassigned + `in_progress` is **garbage**, not a flow. Create **validates** title, description, project; Assign To is starred but not required (UI lie).

Activity **My Queue** = assigned to you; **Team Queue** = you sent it and you are not an assignee. **Drafts In Progress** today = originator `in_progress` (mixes real self-assign WIP with illegal rows).

---

## Addenda

### 2026-08-19 — Photo perf + pull/sync resilience (tabled)

Device + sim investigation: slow evidence thumbnails (private bucket, in-memory signed URLs, RN `Image` on lists); intermittent empty Tasks after pull (session race, no task persist, heavy `task_activities` fetch + 10s timeout). **Not RC blockers.** ROADMAP **M-PERF-01** + **M-DATA-03** Pipeline idle-parallel after RC. Evidence: `docs/superpowers/analysis/2026-08-19-photo-sync-resilience-investigation.md`. Maestro headed work **parked** to focus RC ship.

### 2026-08-21 — Multi-company project membership (locked product; post-RC)

**Not RC.** New product surfaces after **M-OPS-02**. Canonical: `documentation/multi-company-project-membership.md`. ROADMAP: **`WS-AUTHZ / M-AUTHZ-02`** (Order 15.065).

Locks:

- **Pricing:** each company owns its employees by default; hosting a project does not auto-consume host headcount for partners; company admin is not field headcount.
- **Authority vs knowledge:** company admin ≠ project manager; admin must **know** which of their people are on which projects (including outbound to other companies’ projects); knowledge ≠ manage rights.
- **Path A — Partner liaison:** host appoints a responsible person at the partner company; that liaison manages who from their company is on the project (reduces host overhead).
- **Path B — Project invite:** named outsider via project-scoped URL; seats stay on invitee’s company; no global directory.
- **Path C — Host absorb:** host explicitly bills outsider to **host** seats when willing to pay.
- Keep A+B+C. Distinct from company seat invite. Platform accounts required. Schema/RLS = Human Gate at build time.
- Explicit reject still stands for jumping email-invite ahead of RC → OPS-01 → OPS-02; this addendum **schedules** invite/liaison **after** OPS-02, not during RC.

### 2026-08-21 — Customer-managed storage (parked; enterprise track)

**Not RC. Not immediate post-RC.** Slotting plan: `docs/superpowers/plans/2026-08-21-customer-managed-storage-slotting.md`. ROADMAP: **`WS-STORAGE / M-STORAGE-01`…`05`** (Deferred, Order 15.31–15.35).

Locks:

- Do **not** open BYO / customer-managed storage during RC, Tier 1 pre-RC, or `M-OPS-01` / `M-OPS-02` / `M-AI-01`.
- Attach the track **after Wave 2 / `M-DMS-01` begins** so evidence + documents share one portability model.
- Standard product path stays **Insite-managed** Supabase Storage. BYO is a **premium Enterprise Privacy** solution (pilot → productize), not the default SKU.
- Jumping storage portability ahead of OPS or DMS requires an intentional lock change in this file.

### 2026-08-24 — Owner Admin = dedicated app (locked)

**Not in Taskr field app long-term.** Platform owner/operator work (monitoring, economics, tenant ops, workflow gaps at platform scope) belongs in a **separate Owner Admin app** — own bundle ID and TestFlight track — so app-level admin is never mixed with jobsite capture/review flows.

Locks:

- **M-OPS-01 v1** (Profile → Owner Console inside Taskr) = **bootstrap only**; closed 2026-08-22. **No new owner modules** in Taskr after RC.
- **M-OPS-03** = dedicated Owner Admin app; carries Monitoring / Economics / Tenant ops IA; Edge/RPC backend access only.
- **Retire or hide** Taskr Profile → Owner Console once M-OPS-03 ships.
- **M-WEB-01** remains company admin for normal users (Henry) at `app.insiteworks.co` — not the owner operator shell.
- Does **not** block RC, M-AUTHZ-02, or M-AI-01; idle-parallel after **M-BILL-01 MVP** is ok.

ROADMAP: **`WS-OPS / M-OPS-03`** (Order 15.059).

### 2026-08-24 — Billing display-only FX tabled (M-BILL-01G)

Locks:

- Charge currency stays **HKD** (HK company; no per-country VAT/GST in product scope for now).
- **Display-only FX** (approx. USD/EUR under HKD list price) is **tabled** as **M-BILL-01G** — next billing slice after HKD MVP, not this TF.
- No Stripe Tax / tax-inclusive local Prices until accountant GO.

ROADMAP: **`WS-BILL / M-BILL-01G`** (Order 15.049). Pricing lock: `docs/superpowers/plans/2026-08-24-billing-hkd-pricing-lock.md`.

*(Append dated bullets here when this discussion is revisited. Do not rewrite the locks above unless the user explicitly changes them.)*
