# STATUS — cursor idea-bank batch 2026-10-12

Machine-readable pickup for InsiteAppDev / Dig / Research / Marketing.  
No TF / eas submit / ASC Public / PROD migrations / Stripe live unless Tristan GO.

**Batch tip context:** `origin/main` = `82e0b08` at write time.

**Close bar (law):** A task is **not complete** until its PR is **closed** (merged or explicitly superseded/closed). `DRAFT_PR` / tip SHA / STATUS rows ≠ done.

**Dig L1 batch (2026-10-12 evening):** evidence `.cache/insite-perf20/dig-batch-20261012/` · index `RESULT.md` · sim `B7B2640C` · Metro `:8082`.

| Order | Item | Tip Digged | Dig RESULT |
|---|---|---|---|
| 1 | D #35 | `5e3d8fc` | **PASS** |
| 2 | E #30 / main | `82e0b08` | **PASS** (PARTIAL +90 end; double-tap N/A — Reset SoT) |
| 3 | B+C #34 | `b6ab19f` | **PARTIAL** (2-photo Update happy path; weak Wi-Fi not Digged) |
| 4 | A #23 | `58ef7ea` | **PASS** |
| 6 | F | — | WAITING_GO (not Dig) |

---

## Smoke-first priority (Dig L1 Metro→DEV)

Do in this order. Evidence → `.cache/insite-perf20/`. Named TF only when Tristan asks Dig.

| Order | Item | Tip | PR | Smoke focus | Then close |
|---|---|---|---|---|---|
| 1 | **D** done-tray-thumb | `5e3d8fc` | [#35](https://github.com/insitetechltd/buildtrack/pull/35) | crop→tray; annotate→tray; cancel/discard unchanged | Tristan GO → merge #35 |
| 2 | **E** straighten-dial | `82e0b08` (**main**) | [#30](https://github.com/insitetechltd/buildtrack/pull/30) handoff only | bowl / flush / ±90 scrub / ~±30 rest / 15% inset / unmount | Dig PASS → **close #30** (no merge stale head) |
| 3 | **B+C** upload-retry + back-off | `b6ab19f` | [#34](https://github.com/insitetechltd/buildtrack/pull/34) | weak Wi-Fi still open; happy path Digged | Tristan GO → merge #34 (or Dig weak-Wi-Fi first) |
| 4 | **A** dead-role-select | `58ef7ea` | [#23](https://github.com/insitetechltd/buildtrack/pull/23) | company projects list; no `users_1.role` | Tristan GO → merge #23 |
| 5 | **STATUS** docs | this tip | [#36](https://github.com/insitetechltd/buildtrack/pull/36) | n/a (docs) | merge #36 when useful |
| 6 | **F** note-required-on-TF | `82e0b08` | none | after Tristan bake GO only | WAITING_GO |

---

## What's next — remaining until CLOSED

- [ ] **D** Dig PASS @ `5e3d8fc` — Tristan GO → merge #35 → CLOSED
- [ ] **E** Dig PASS on main — Tristan ack PARTIAL notes → **close #30** → CLOSED
- [ ] **B+C** Dig PARTIAL (happy path only) — optional weak-Wi-Fi Dig or Tristan GO → merge #34 → CLOSED
- [ ] **A** Dig PASS @ `58ef7ea` — Tristan GO → merge #23 → CLOSED
- [ ] **STATUS** merge #36 → CLOSED
- [ ] **F** Tristan GO for TF bake → Dig/phone on IPA → CLOSED (Public stays 292)

**Agent stopping-point rule:** when work pauses mid-batch, rewrite this What's next list (unchecked = still open). Do not mark an ID complete until its PR/issue is closed.

---

## A) dead-role-select

- status: DRAFT_PR
- Dig RESULT: **PASS** (2026-10-12) — `.cache/insite-perf20/dig-batch-20261012/A-role/`
- branch / tip SHA: `cursor/fix-users-role-column-error-fbdc` @ `58ef7ea`
- PR number + URL: #23 — https://github.com/insitetechltd/buildtrack/pull/23
- what changed:
  - Rebased onto `main` @ `82e0b08`
  - Kept remove-`users.role` from `fetchProjectsByCompany` selects
  - Confirmed `transformProjectRow` does not need `role`
- smoke checklist:
  - Dig: Metro→DEV dashboard Project A loads; pull refresh OK; no `users_1.role` LogBox
- Dig pickup:
  - tip SHA: `58ef7ea`
  - evidence: `A-role/RESULT.md` + `DIG-A-projects-ok.png`
- open blockers: merge needs Tristan GO
- next agent action: Tristan GO → merge #23

---

## B) upload-retry

- status: DRAFT_PR
- Dig RESULT: **PARTIAL** (2026-10-12) — `.cache/insite-perf20/dig-batch-20261012/BC-upload/`
- branch / tip SHA: `cursor/upload-retry-backoff-20261012` @ `b6ab19f`
- PR number + URL: #34 — https://github.com/insitetechltd/buildtrack/pull/34
- what changed:
  - Added `src/api/uploadRetry.ts` (3 attempts, exponential back-off)
  - Update Progress keeps successful tiles when one photo fails; failed tiles surface with retry
  - Same helper on Task Detail reply dock + Photo Selection accept
- smoke checklist:
  - Dig: Update Progress 2 photos happy path PASS (activity shows note + both photos)
  - Dig: weak Wi-Fi mid-upload / per-tile fail / retry — **NOT DIGGED**
- Dig pickup:
  - tip SHA: `b6ab19f`
  - evidence: `BC-upload/RESULT.md` + `DIG-BC-*.png`
- open blockers: same PR as C; weak-Wi-Fi Dig optional; merge needs Tristan GO
- next agent action: Tristan GO merge #34 (or Dig weak-Wi-Fi first)

---

## C) upload-back-off

- status: DRAFT_PR
- Dig RESULT: **PARTIAL** (shared with B)
- branch / tip SHA: `cursor/upload-retry-backoff-20261012` @ `b6ab19f` (same PR as B)
- PR number + URL: #34 — https://github.com/insitetechltd/buildtrack/pull/34
- what changed:
  - Storage retry budget (400ms→4s, max 3) around `uploadFileWithVerification`
  - Non-retryable auth/permission errors stop immediately
  - Visible per-tile fail messaging lists filename + error
- smoke checklist:
  - Dig: Storage 503 blip / 3-attempt fail tile — **NOT DIGGED** (Jest covers helper)
- Dig pickup:
  - tip SHA: `b6ab19f`
  - evidence: shared `BC-upload/`
- open blockers: paired with B in #34
- next agent action: Tristan GO (shared with B)

---

## D) done-tray-thumb

- status: DRAFT_PR
- Dig RESULT: **PASS** (2026-10-12) — `.cache/insite-perf20/dig-batch-20261012/D-done-tray/`
- branch / tip SHA: `cursor/done-tray-thumb-20261012` @ `5e3d8fc` (was `61cdd40`; Dig found tray-open blocker)
- PR number + URL: #35 — https://github.com/insitetechltd/buildtrack/pull/35
- what changed:
  - Capture-session edit bake stores `annotatedUri` + refreshes `previewUri`
  - Accept mapping prefers bake; tray/thumb rebind via `recyclingKey`
  - **Dig fix:** tray thumb opens fullscreen under photokit index session (`assetsByIdRef` empty); native thumb `pointerEvents="none"` for center-open
- smoke checklist:
  - Dig: crop → tray updates PASS
  - Dig: annotate → tray shows red stroke PASS
  - Dig: cancel second crop keeps prior bake PASS
- Dig pickup:
  - tip SHA: `5e3d8fc`
  - evidence: `D-done-tray/RESULT.md` + `artifacts/` + `artifacts/thumb/`
- open blockers: merge needs Tristan GO
- next agent action: Tristan GO → merge #35

---

## E) straighten-dial

- status: DRAFT_PR (handoff — close without merge)
- Dig RESULT: **PASS** with PARTIAL notes (2026-10-12) — `.cache/insite-perf20/dig-batch-20261012/E-dial/`
- branch / tip SHA: product on `origin/main` @ `82e0b08`; stale draft #30 head unchanged
- PR number + URL: #30 — https://github.com/insitetechltd/buildtrack/pull/30
- what changed:
  - No new dial code in this batch — already on main
- smoke checklist:
  - Dig: bowl + fixed △ PASS; ~±30 rest PASS (prior clip FAIL cleared); −90 scrub PASS; +90 end PARTIAL; Reset→0 PASS; double-tap N/A; unmount reopen PASS; 15% inset PASS
- Dig pickup:
  - tip SHA: `82e0b08`
  - evidence: `E-dial/RESULT.md` + `artifacts/dialcrop2/`
  - note: Maestro `swipe from id: rotation_dial` is false scrub (hits stage); use point swipes ~82% Y
- open blockers: Tristan ack PARTIAL → close #30
- next agent action: close #30 after Tristan ack

---

## F) note-required-on-TF

- status: WAITING_GO
- branch / tip SHA: `origin/main` @ `82e0b08` (product: `c264ba2` note-required + `33b6685` resolve-with-reply + hygiene `b4c8bd1`)
- PR number + URL: none (no code gap; no draft PR)
- what changed:
  - Confirmed on main: PM empty Resolve → Comment required; typed note → Resolve with reply; worker acknowledgement sentence; store `resolveReportWithReply` requires text
- smoke checklist:
  - Tristan: after a future TF bake, empty dock cannot close; typed note closes with manager/worker close lines
  - Dig does **not** bake
- Dig pickup:
  - tip SHA: `82e0b08` (bake-ready tip when Tristan GO)
  - ready for Dig ask: no — WAITING_GO for TF bake
- open blockers: any CBP / new IPA needs Tristan GO
- next agent action: Tristan GO (bake note)

---

## Out of scope (this batch)

- Maestro day suite / UI-08 (Dig STOP until Tristan asks Dig)
- M-AUTHZ-02 / M-OPS-03 / RLS / M-AI-01
- Marketing paste packs / Public / film
- Idea bank PR #33 merge
