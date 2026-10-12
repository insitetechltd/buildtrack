# STATUS — cursor idea-bank batch 2026-10-12

Machine-readable pickup for InsiteAppDev / Dig / Research / Marketing.  
Draft PRs only — do not merge. No TF / eas submit / ASC Public / PROD migrations / Stripe live.

**Batch tip context:** `origin/main` = `82e0b08` at write time.

---

## A) dead-role-select

- status: DRAFT_PR
- branch / tip SHA: `cursor/fix-users-role-column-error-fbdc` @ `58ef7ea`
- PR number + URL: #23 — https://github.com/insitetechltd/buildtrack/pull/23
- what changed:
  - Rebased onto `main` @ `82e0b08`
  - Kept remove-`users.role` from `fetchProjectsByCompany` selects
  - Confirmed `transformProjectRow` does not need `role`
- smoke checklist:
  - Tristan / Dig: Metro→DEV open company projects list; no `users_1.role does not exist`
  - Switch company / pull-to-refresh projects still loads
- Dig pickup:
  - tip SHA: `58ef7ea`
  - suggested Dig ask: L1 Metro→DEV only
  - evidence folder Dig will write: `.cache/insite-perf20/`
  - ready for Dig ask: yes
- open blockers: merge needs Tristan GO
- next agent action: Tristan GO → merge #23 (or Dig L1 smoke first)

---

## B) upload-retry

- status: DRAFT_PR
- branch / tip SHA: `cursor/upload-retry-backoff-20261012` @ `b6ab19f`
- PR number + URL: #34 — https://github.com/insitetechltd/buildtrack/pull/34
- what changed:
  - Added `src/api/uploadRetry.ts` (3 attempts, exponential back-off)
  - Update Progress keeps successful tiles when one photo fails; failed tiles surface with retry
  - Same helper on Task Detail reply dock + Photo Selection accept
- smoke checklist:
  - Tristan / Dig: Update Progress 3 photos, disrupt Wi-Fi mid-upload → per-tile fail; successes remain; retry works
  - Reply dock + Photo Selection: one fail does not cancel sibling in-flight uploads
  - Submit still fail-closes until all chosen photos land
- Dig pickup:
  - tip SHA: `b6ab19f`
  - suggested Dig ask: L1 Metro→DEV first; named TF only when Tristan asks Dig
  - evidence folder Dig will write: `.cache/insite-perf20/`
  - ready for Dig ask: yes
- open blockers: same PR as C; merge needs Tristan GO; no TF bake in this batch
- next agent action: Dig L1 smoke (optional) → Tristan GO merge #34

---

## C) upload-back-off

- status: DRAFT_PR
- branch / tip SHA: `cursor/upload-retry-backoff-20261012` @ `b6ab19f` (same PR as B)
- PR number + URL: #34 — https://github.com/insitetechltd/buildtrack/pull/34
- what changed:
  - Storage retry budget (400ms→4s, max 3) around `uploadFileWithVerification`
  - Non-retryable auth/permission errors stop immediately
  - Visible per-tile fail messaging lists filename + error
- smoke checklist:
  - Tristan / Dig: weak Wi-Fi / Storage 503 blip recovers within budget
  - Persistent fail after 3 attempts → failed tile + note/photos still present
- Dig pickup:
  - tip SHA: `b6ab19f`
  - suggested Dig ask: L1 Metro→DEV first; named TF only when Tristan asks Dig
  - evidence folder Dig will write: `.cache/insite-perf20/`
  - ready for Dig ask: yes
- open blockers: paired with B in #34; no TF bake
- next agent action: Dig L1 (shared with B) → Tristan GO

---

## D) done-tray-thumb

- status: DRAFT_PR
- branch / tip SHA: `cursor/done-tray-thumb-20261012` @ `61cdd40`
- PR number + URL: #35 — https://github.com/insitetechltd/buildtrack/pull/35
- what changed:
  - Capture-session edit bake stores `annotatedUri` + refreshes `previewUri`
  - Accept mapping prefers bake; tray/thumb rebind via `recyclingKey`
- smoke checklist:
  - Dig: crop → Done → tray thumb matches crop
  - Dig: annotate → Done → tray thumb matches bake
  - Dig: cancel/discard → tray unchanged
  - Dig: deselect/reselect after edit → still bake; Accept → Select Photos matches
- Dig pickup:
  - tip SHA: `61cdd40`
  - suggested Dig ask: L1 Metro→DEV first; named TF only when Tristan asks Dig
  - evidence folder Dig will write: `.cache/insite-perf20/`
  - ready for Dig ask: yes
- open blockers: Dig owns PASS/FAIL; Format A / film out of scope
- next agent action: Dig L1 ask

---

## E) straighten-dial

- status: DRAFT_PR
- branch / tip SHA: product on `origin/main` @ `82e0b08` (dial tip `a23bb2b` already ancestor via `c1a9288` / `7cf77e1`); stale draft #30 head `cursor/whatsapp-dial-phase-b-58e1` @ `a23bb2b`
- PR number + URL: #30 — https://github.com/insitetechltd/buildtrack/pull/30
- what changed:
  - No new dial code in this batch — already on main
  - Updated #30 title/body + comment for Dig handoff; cannot retarget base to main (0 unique commits)
- smoke checklist:
  - Dig: 1° snaps; double-tap → 0°; scale-while-rotating fills crop
  - Dig: crop_overlay unmounts via state; bowl/smile; flush rim; ±90 continuous; ~±30 at rest with opaque mask; ~15% enter inset
- Dig pickup:
  - tip SHA: `82e0b08` (prove against main CropOverlay — not the stale PR base)
  - suggested Dig ask: L1 Metro→DEV first; named TF only when Tristan asks Dig
  - evidence folder Dig will write: `.cache/insite-perf20/`
  - ready for Dig ask: yes
- open blockers: Format A dial VO out until Dig PASS on named TF + Tristan film GO; #30 base still old Maestro branch
- next agent action: Dig L1 against main; Research/Marketing hold film/VO

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
  - suggested Dig ask: none for bake; L1 Metro already proves product; named TF only after Tristan GO bake
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
