# Stage E close — Field journeys rollup (2026-09-23)

**Verdict:** CLOSED (prove green). **E3b promote remains OPEN** (not F5-complete). ASC untouched.

**Tip SHA:** `89a9aa3261cd3571a49d341132f37742b03e4a2a` (dirty allowlist + product fix below).

## Tracks

| Track | Result | Evidence |
|---|---|---|
| **E0** | PASS | `docs/superpowers/evidence/2026-09-23-stage-e/e0-e4-sha-inventory.txt` |
| **E1 DU-H01** | PASS (re-run; tip ≠ `81c6b22`) | `e1-h01.log` · title `DU-H01-1790158884` · artifacts `dual-user-20260923_181815` |
| **E2 DU-D01** | PASS (re-run) | `e2-d01.log` · title `DU-D01-1790159577` · artifacts `dual-user-20260923_182954` |
| **E3 Report→resolve** | PASS | Manifest `report-manifest-20260923_181244.json` · task `b09a0c6f-1404-419f-88cd-213afa6f04e3` · title `R01-1790158366` · DB `reported`+`issue_reported` → `resolved`+`issue_resolved` (Carol) |
| **E4 P04–P06+P11** | PASS DEV+PROD | `e4-pmatrix-result.md` · re-seed `e4-reseed.log` password123 |
| **E5 O2 narrative** | Not cited | Tip ≠ Stage D archive SHA; O2 not claimed as tip-matched |

## E3 PNG visual read (required 1 / 4 / 5)

1. **R01-chooser-report** — capture-first Alert shows **↑ Report** / ↔ Update / ↓ Assign (not Assign-as-Report).
4. **R01-carol-resolve-confirm** — Carol (`C`) on `R01-1790158366`, status Reported, confirm **Resolve without reply?**.
5. **R01-carol-resolved-detail** — same title, Progress **Resolved**, dock **Archive**.

## Product fix landed in prove

`resolveReport` (and sibling `triageIssue`) used raw `task_activities` insert with top-level `status`, which **does not exist** on NEW SoT. Insert failed silently → status flipped to `resolved` without `issue_resolved` activity. Fixed via `insertTaskActivityDualPath` + throw on error.

Carol UI assert: status chip text is **not** in the a11y tree (`task-detail__status_chips` text empty). Post-resolve SoT assert = `report-reply-composer__archive`.

## Dirty allowlist (E0)

In scope: `maestro/flows/report/**`, `scripts/maestro/run-report-journey.sh`, `report-db-readback.cjs`, `package.json` wire, plan/NOW, Stage E evidence/report, **`src/state/taskStore.supabase.ts`** (activity dual-path fix required for E3 DB readback).

Out of scope / do not ship with Stage E: iPad analysis PNGs under `docs/superpowers/analysis/2026-09-19-ipad-task-timeline-layout/`, `scripts/supabase/__pycache__/`.

## Residual

- **E3b** Report→promote Maestro OPEN.
- **E3c / M-REPORT-01** Report resolve-**with-reply** audit trail OPEN (ROADMAP Order 15.0577) — close + typed reply (+ photos) must leave `resolved` + `issue_resolved` + timeline-visible reply on same task id; not claimed by E3 without-reply.
- Location on Alice create may show `—` in Carol detail (picker path optional); not a Stage E blocker — status/activity/Archive proven.
- ASC Public / Submit for Review untouched.
