# Daily report — Phases 1–3 kickoff (build later)

**Date:** 2026-08-27  
**Status:** Spec locked; **no build GO** until gates below  
**Vision SoT:** [`../analysis/2026-08-27-daily-capture-memo-vision.md`](../analysis/2026-08-27-daily-capture-memo-vision.md)  
**Milestone (parked):** `WS-FIELD / M-DAILY-01` (see ROADMAP)

---

## Gates before code

| Gate | Rule |
|------|------|
| Commercial spine | Do not jump `M-OPS-ENV-01` / finish `M-BILL-01` / App Store |
| Authz | Prefer **`M-AUTHZ-02`** before Phase 2 multi-company PM routing |
| Schema | Live `daily_report*` DDL = **Human Gate** |
| AI | Phase 3 follows **M-AI-01** planning checklist complete + build GO |

---

## Phase 1 — Capture + voice memo → draft

### Acceptance

1. Camera (production path via `captureSession`) offers destination **Daily report** (alongside Create Task / Update).
2. User can take 1..N photos; after each shot or at end-of-burst, **voice → text** memo (reuse `transcribe-audio.ts`); memo is editable.
3. Draft holds ordered items (photo URI/path + `memo_text`) for **current project + report_date**.
4. Author can review the package before leave; discard clears local draft.
5. Offline: draft survives app background; upload/persist when online (once DDL exists) or stay local-only until Human Gate DDL.

### Likely files

- `src/modules/captureSession/*` — destination enum + host callbacks
- `src/navigation/captureFirstCameraFlow.ts` / `AppNavigator.tsx` — entry
- `src/components/VoiceTaskInput.tsx` + `src/api/transcribe-audio.ts` — re-enable for memo
- New: `src/state/dailyReportDraftStore.ts` (local) → later Supabase sync module
- Screens: draft review (new) or extend Select Photos with daily-report accept path

### Validation

- Jest: draft store order/memo; destination routing unit tests
- Headed smoke: Camera → 2 shots → voice memo → review draft
- No live DDL without GO

---

## Phase 2 — Send to PM

### Acceptance

1. **Submit** transitions draft → `submitted` (server); items uploaded under project-scoped storage.
2. PM and CA with project access see the report in an in-app list (not the task-stats Reports tab).
3. Push (or in-app badge minimum) on submit: “Daily report from {author} — {project}”.
4. PM can open read-only detail; optional jump to `linked_task_id` if set.
5. Author cannot silently overwrite a submitted report (amend = explicit follow-up; out of scope v1 → new draft same day OK).

### Likely files

- Migration (Human Gate): `daily_report`, `daily_report_item` + RLS
- Edge or client API: `submitDailyReport`
- UI: Daily report list + detail under Admin or Activity
- Push: existing notification channel if any; else in-app-only v1 with push parked

### Validation

- Integration: worker submit → PM fetch same `project_id` only
- Negative: other project / other company denied
- Maestro or headed: submit → PM open

---

## Phase 3 — AI contextualize (+ Phase 4 query hook)

### Acceptance

1. On submit or PM open: server job suggests `suggested_task_id` per item and optional one-paragraph summary from **this project’s tasks only**.
2. High certainty only: cite task id or leave null; never auto-change task status.
3. Human can accept suggestion → writes `linked_task_id`.
4. Corpus registration: submitted reports readable by **M-AI-01** `ai-query` gateway RPCs (same JWT + `project_id` wall).
5. Phase 4 (query UX): “What did the crew report about X yesterday?” answered with citations to report items + tasks — ships with M-AI-01 client, not a second chatbot.

### Likely files

- Edge: extend planned `ai-query` / new `daily-report-contextualize`
- RPCs: project-scoped report + item reads
- Mobile: show suggestions; confirm link
- Update M-AI-01 brief corpus list when build starts

### Validation

- Fixture project: suggestion cites real task or abstains
- Cross-project prompt returns abstain / empty (safety)
- Fair-use metering aligns with M-AI-01 pricing lean

---

## Out of scope for Phases 1–3

- Drawing / DMS / material barcode (M-AI-02/03)
- Web admin daily report editor (Wave 2)
- Auto-complete tasks from voice
