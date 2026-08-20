# Post-RC sequence (locked 2026-08-19)

**Discussion capture (revisit this conversation here):** `docs/superpowers/analysis/2026-08-19-roadmap-clarification.md`

**Product target:** a similar-scale app that wins the next year by being boring on purpose — **one field loop, tight states, an owner who can see production.**

**Do not** schedule Wave 2 (web / DMS / tenant wipe), IAP, or Save Draft as unassigned `in_progress` ahead of this sequence.

## Order (non-negotiable)

1. **Ship RC** — field loop you can defend: photo → task → accept/decline → update → review. No new product surfaces this week except what RC already requires.
2. **`WS-OPS / M-OPS-01`** — in-app owner console + workflow-gaps bin (illegal states visible to Tristan only).
3. **`WS-OPS / M-OPS-02`** — shrink `taskStore.supabase.ts` / `CreateTaskScreen` / `AppNavigator`; enforce the intended status machine (stars match validation; no fake WIP; Assign To required for Create if that is the product).
4. **`WS-AUTHZ / M-AUTHZ-02`** — multi-company project membership (partner **liaison** + project invite + optional **host-absorb** seats). Pricing/privacy law: `documentation/multi-company-project-membership.md`. Not RC; Human Gate before invite/RLS DDL. May idle-parallel with early M-AI-01 prep after OPS-02.
5. **`WS-AI / M-AI-01`** — field Q&A over the **project dataset** (tasks, photos, activity, later documents). Worker asks on site; answer cites records. Existing Create Task LLM is only a thin on-ramp, not the product.
6. **`WS-AI / M-AI-02`** — **drawing intelligence** (the real roadblock). PDF sheets first, then CAD. **Blocked on document control** (`M-DMS-01`): current revision must be known or the answer is a safety defect. Do not custom-parse DWG in year one — convert/register sheets, retrieve current rev, vision-QA with citations + abstain. CAD/BIM likely a specialist API (Autodesk/ODA), not a second LLM SDK.
7. **Wave 2 OS phase** — document control first (`M-DMS-01` …), then **jobsite cost** (`M-COST-01`). DMS is load-bearing for M-AI-02. Submittals (`M-DMS-04`) are load-bearing for M-AI-03.
8. **`WS-AI / M-AI-03`** — photo a package/fastener → **is this approved for this location and sequence?** Pass only via barcode/label lookup against **approved submittals** (`M-DMS-04`). Unlabeled hardware is assist-only, never auto-pass. Not RAG over a spec PDF.

## AI policy (locked 2026-08-19)

**Only high-certainty areas.** If the model cannot cite a record (task row, current sheet+rev, approved SKU), it must abstain. No “infer the drawing then ship the answer.”

**In scope (high certainty)**

- Project dataset Q&A: tasks, photos, assignees, overdue — this project only (`M-AI-01`)
- Create Task on-ramp: voice/text → suggested fields, human confirms
- Material spec-check: barcode/QR/label → approved submittal for this location/sequence (`M-AI-03`). Unlabeled hardware = assist, never auto-pass
- Drawing **assist**: title block / current-rev lookup; quote a **cropped** note with sheet+rev (`M-AI-02` thin slice)

**Out of scope until proven**

- Infer dimensions, grid hits, fit checks, design intent from 2D/CAD
- Visualize a sheet as 3D and treat that as truth
- “This unlabeled screw is up to spec”
- Generic RAG over spec PDFs or whole drawing sets

`M-SUPABASE-04b` (~2026-09-07 cool-down) stays calendar-gated hygiene. It must not jump this queue.

## Post-RC idle-parallel (does not change locked order above)

May run alongside M-OPS prep without reordering Wave 2:

- **M-DATA-03** — pull/sync resilience
- **M-PERF-01** — evidence photo perf
- **S-UX-01R** — retire Add Comment dead path (Update Description is SoT; plan `2026-08-19-s-ux-01r-retire-add-comment-dead-path.md`)

## This week

RC only. See `documentation/NOW.md`.
