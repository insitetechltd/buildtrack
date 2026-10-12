# STATUS — cursor idea-bank batch 2026-10-12

> **CORRECTION (2026-10-13 HKT — InsiteApp Debug Bot + Dev Bot):**  
> Dig did **NOT** dig this batch. Dig stays **STOP** until Tristan asks Dig **and** tristans-mini is connected.  
> Cloud-agent smoke claims written as Dig PASS/PARTIAL on tip `269af13` are **struck**. They are **not** Dig’s PASS ledger.  
> Local paths under `.cache/insite-perf20/dig-batch-20261012/` are **not** Dig evidence until Dig digs.

Machine-readable pickup for InsiteAppDev / Dig / Research / Marketing.  
No TF / eas submit / ASC Public / PROD migrations / Stripe live unless Tristan GO.

**Batch tip context:** `origin/main` = `82e0b08` at write time.

**Close bar (law):** A task is **not complete** until its PR is **closed** (merged or explicitly superseded/closed). `DRAFT_PR` / tip SHA / STATUS rows ≠ done.

~~**Dig L1 batch (2026-10-12 evening):** … Dig RESULT PASS/PARTIAL …~~ **STRUCK** — not Dig.

| Order | Item | Draft tip (pickup fact only) | Dig RESULT |
|---|---|---|---|
| 1 | D #35 | `5e3d8fc` | **NOT DIGGED** (cloud-agent claim struck — pending Dig) |
| 2 | E #30 / main | `82e0b08` | **NOT DIGGED** (cloud-agent claim struck — pending Dig) |
| 3 | B+C #34 | `b6ab19f` | **NOT DIGGED** (cloud-agent claim struck — pending Dig) |
| 4 | A #23 | `58ef7ea` | **NOT DIGGED** (cloud-agent claim struck — pending Dig) |
| 6 | F | `82e0b08` | WAITING_GO (not Dig; bake GO only) |

---

## Smoke-first priority (when Tristan asks Dig)

Do in this order **after** Tristan asks Dig and tristans-mini is connected. Evidence → `.cache/insite-perf20/` written by Dig. Named TF only when Tristan asks Dig.

| Order | Item | Tip (draft pickup) | PR | Smoke focus | Then close |
|---|---|---|---|---|---|
| 1 | **D** done-tray-thumb | `5e3d8fc` | [#35](https://github.com/insitetechltd/buildtrack/pull/35) | crop→tray; annotate→tray; cancel/discard unchanged | Dig digs first → then Tristan GO → merge |
| 2 | **E** straighten-dial | `82e0b08` (**main**) | [#30](https://github.com/insitetechltd/buildtrack/pull/30) handoff only | 1° / double-tap 0° / bowl / flush rim / ±90 / ~±30 rest / 15% inset / state unmount | Dig digs main first → then close #30 (no merge of stale head) |
| 3 | **B+C** upload-retry + back-off | `b6ab19f` | [#34](https://github.com/insitetechltd/buildtrack/pull/34) | weak Wi-Fi: siblings finish; successes kept; failed tile retry | Dig digs first → then Tristan GO → merge |
| 4 | **A** dead-role-select | `58ef7ea` | [#23](https://github.com/insitetechltd/buildtrack/pull/23) | company projects list; no `users_1.role` | Dig digs first → then Tristan GO → merge |
| 5 | **STATUS** docs | this tip | [#36](https://github.com/insitetechltd/buildtrack/pull/36) | n/a (docs) | merge #36 when useful (docs-only; not Dig-proven product) |
| 6 | **F** note-required-on-TF | `82e0b08` | none | after Tristan bake GO only | WAITING_GO — not Dig; no smoke until IPA exists |

---

## What's next — remaining until CLOSED

Dig is **STOP** until Tristan asks Dig + tristans-mini connected. No Dig-proven merge GOs from cloud-agent smoke.

- [ ] **D** Dig digs #35 @ `5e3d8fc` (when Tristan asks Dig) → then Tristan GO → merge → CLOSED  
  ~~Dig PASS~~ **STRUCK**
- [ ] **E** Dig digs dial on **main** `82e0b08` (when Tristan asks Dig) → then close/supersede #30 → CLOSED  
  ~~Dig PASS / PARTIAL~~ **STRUCK**
- [ ] **B+C** Dig digs #34 @ `b6ab19f` (when Tristan asks Dig) → then Tristan GO → merge → CLOSED  
  ~~Dig PARTIAL~~ **STRUCK**
- [ ] **A** Dig digs #23 @ `58ef7ea` (when Tristan asks Dig) → then Tristan GO → merge → CLOSED  
  ~~Dig PASS~~ **STRUCK**
- [ ] **STATUS** merge #36 when useful → CLOSED
- [ ] **F** Tristan GO for TF bake → Dig/phone prove on that IPA (only after bake GO) → CLOSED (Public stays 292)

**Agent stopping-point rule:** when work pauses mid-batch, rewrite this What's next list (unchecked = still open). Do not mark an ID complete until its PR/issue is closed. Do not write Dig PASS/FAIL/PARTIAL unless Dig digs.

---

## A) dead-role-select

- status: DRAFT_PR
- Dig RESULT: **NOT DIGGED** (cloud-agent claim struck — pending Dig)  
  ~~**PASS** (2026-10-12)~~ **STRUCK**
- branch / tip SHA: `cursor/fix-users-role-column-error-fbdc` @ `58ef7ea` (draft pickup fact only)
- PR number + URL: #23 — https://github.com/insitetechltd/buildtrack/pull/23
- what changed:
  - Rebased onto `main` @ `82e0b08`
  - Kept remove-`users.role` from `fetchProjectsByCompany` selects
  - Confirmed `transformProjectRow` does not need `role`
- smoke checklist (for Dig when asked):
  - Metro→DEV open company projects list; no `users_1.role does not exist`
  - Switch company / pull-to-refresh projects still loads
- Dig pickup:
  - tip SHA: `58ef7ea`
  - suggested Dig ask: L1 Metro→DEV only (when Tristan asks Dig)
  - evidence folder Dig will write: `.cache/insite-perf20/`
  - ready for Dig ask: yes — Dig STOP until Tristan asks Dig + tristans-mini
- open blockers: Dig has not dug; merge must not treat cloud smoke as Dig PASS
- next agent action: wait for Tristan Dig ask → Dig digs → then Tristan GO merge #23

---

## B) upload-retry

- status: DRAFT_PR
- Dig RESULT: **NOT DIGGED** (cloud-agent claim struck — pending Dig)  
  ~~**PARTIAL** (2026-10-12)~~ **STRUCK**
- branch / tip SHA: `cursor/upload-retry-backoff-20261012` @ `b6ab19f` (draft pickup fact only)
- PR number + URL: #34 — https://github.com/insitetechltd/buildtrack/pull/34
- what changed:
  - Added `src/api/uploadRetry.ts` (3 attempts, exponential back-off)
  - Update Progress keeps successful tiles when one photo fails; failed tiles surface with retry
  - Same helper on Task Detail reply dock + Photo Selection accept
- smoke checklist (for Dig when asked):
  - Update Progress multi-photo; disrupt Wi-Fi mid-upload → per-tile fail; successes remain; retry works
  - Reply dock + Photo Selection: one fail does not cancel sibling in-flight uploads
  - Submit still fail-closes until all chosen photos land
- Dig pickup:
  - tip SHA: `b6ab19f`
  - suggested Dig ask: L1 Metro→DEV first; named TF only when Tristan asks Dig
  - evidence folder Dig will write: `.cache/insite-perf20/`
  - ready for Dig ask: yes — Dig STOP until Tristan asks Dig + tristans-mini
- open blockers: same PR as C; Dig has not dug; no Dig-proven merge GO
- next agent action: wait for Tristan Dig ask → Dig digs → then Tristan GO merge #34

---

## C) upload-back-off

- status: DRAFT_PR
- Dig RESULT: **NOT DIGGED** (cloud-agent claim struck — pending Dig; shared with B)  
  ~~**PARTIAL**~~ **STRUCK**
- branch / tip SHA: `cursor/upload-retry-backoff-20261012` @ `b6ab19f` (same PR as B; draft pickup fact only)
- PR number + URL: #34 — https://github.com/insitetechltd/buildtrack/pull/34
- what changed:
  - Storage retry budget (400ms→4s, max 3) around `uploadFileWithVerification`
  - Non-retryable auth/permission errors stop immediately
  - Visible per-tile fail messaging lists filename + error
- smoke checklist (for Dig when asked):
  - weak Wi-Fi / Storage 503 blip recovers within budget
  - Persistent fail after 3 attempts → failed tile + note/photos still present
- Dig pickup:
  - tip SHA: `b6ab19f`
  - suggested Dig ask: L1 Metro→DEV first; named TF only when Tristan asks Dig
  - evidence folder Dig will write: `.cache/insite-perf20/`
  - ready for Dig ask: yes — Dig STOP until Tristan asks Dig + tristans-mini
- open blockers: paired with B in #34; Dig has not dug
- next agent action: wait for Tristan Dig ask → Dig digs (shared with B) → then Tristan GO

---

## D) done-tray-thumb

- status: DRAFT_PR
- Dig RESULT: **NOT DIGGED** (cloud-agent claim struck — pending Dig)  
  ~~**PASS** (2026-10-12)~~ **STRUCK**
- branch / tip SHA: `cursor/done-tray-thumb-20261012` @ `5e3d8fc` (draft pickup fact only; earlier tip `61cdd40`)
- PR number + URL: #35 — https://github.com/insitetechltd/buildtrack/pull/35
- what changed:
  - Capture-session edit bake stores `annotatedUri` + refreshes `previewUri`
  - Accept mapping prefers bake; tray/thumb rebind via `recyclingKey`
  - Tip also includes tray fullscreen open under photokit index session + native thumb hit-through (draft tip fact — not Dig-proven)
- smoke checklist (for Dig when asked):
  - crop → Done → tray thumb matches crop
  - annotate → Done → tray thumb matches bake
  - cancel/discard → tray unchanged
  - deselect/reselect after edit → still bake; Accept → Select Photos matches
- Dig pickup:
  - tip SHA: `5e3d8fc`
  - suggested Dig ask: L1 Metro→DEV first; named TF only when Tristan asks Dig
  - evidence folder Dig will write: `.cache/insite-perf20/`
  - ready for Dig ask: yes — Dig STOP until Tristan asks Dig + tristans-mini
- open blockers: Dig has not dug; Format A / film out of scope; no Dig-proven merge GO
- next agent action: wait for Tristan Dig ask → Dig digs → then Tristan GO merge #35

---

## E) straighten-dial

- status: DRAFT_PR (handoff — close without merge after Dig)
- Dig RESULT: **NOT DIGGED** (cloud-agent claim struck — pending Dig)  
  ~~**PASS** with PARTIAL notes (2026-10-12)~~ **STRUCK**
- branch / tip SHA: product on `origin/main` @ `82e0b08` (draft pickup fact only); stale draft #30 head `cursor/whatsapp-dial-phase-b-58e1` unchanged
- PR number + URL: #30 — https://github.com/insitetechltd/buildtrack/pull/30
- what changed:
  - No new dial code in this batch — already on main
  - #30 is Dig handoff only; cannot retarget base to main (0 unique commits)
- smoke checklist (for Dig when asked):
  - 1° snaps; double-tap → 0°; scale-while-rotating fills crop
  - crop_overlay unmounts via state; bowl/smile; flush rim; ±90 continuous; ~±30 at rest with opaque mask; ~15% enter inset
- Dig pickup:
  - tip SHA: `82e0b08` (prove against main CropOverlay — not the stale PR base)
  - suggested Dig ask: L1 Metro→DEV first; named TF only when Tristan asks Dig
  - evidence folder Dig will write: `.cache/insite-perf20/`
  - ready for Dig ask: yes — Dig STOP until Tristan asks Dig + tristans-mini
- open blockers: Dig has not dug; Format A dial VO out until Dig PASS on named TF + Tristan film GO
- next agent action: wait for Tristan Dig ask → Dig digs main → then close #30

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
  - suggested Dig ask: none for bake; named TF only after Tristan GO bake
  - evidence folder Dig will write: `.cache/insite-perf20/`
  - ready for Dig ask: no — blocker: WAITING_GO for TF bake (store 1.1.4/284 untouched; tip phones recently TF 294; Public aimed at 292 — do not retarget Public)
- open blockers: any CBP / new IPA needs Tristan GO; do not run `build-local.sh` / eas in this batch
- next agent action: Tristan GO (bake note) — suggested next build note: tip `82e0b08` (or later main) for note-required close; keep Public on 292 line

---

## Out of scope (this batch)

- Maestro day suite / UI-08 (Dig STOP until Tristan asks Dig)
- M-AUTHZ-02 / M-OPS-03 / RLS / M-AI-01
- Marketing paste packs / Public / film
- Idea bank PR #33 merge
- Treating cloud-agent smoke (or `.cache/insite-perf20/dig-batch-20261012/`) as Dig PASS ledger
