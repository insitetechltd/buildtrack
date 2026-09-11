# Workflow: Bugfix (SOLO-style for Cursor)

Portable cycle: `~/.cursor/skills/solo-dev-harness/SOP.md` (git-tracked copy: `docs/superpowers/templates/solo-dev-harness/SOP.md`). Dual-write process changes to SOP.md + `templates/` + this file.

Use this rule file when the user request is a bug fix.

Default **Track M** when the bug has user impact, touches a store screens read, nav, or uploads. Tiny isolated logic with no screen/store may be Track S (Judge confirms). Shared primitives / auth / camera-class bugs are Track U.

**Loop:** Scout → Spec+delta → (Gate A on M/U) → Test contract → Build → Prove → Quality Judge. Only Judge emits SHIP.

## 1. Milestone Gate (MANDATORY first action)
Read documentation/NOW.md, then AGENTS.md Current Delivery Status + documentation/ROADMAP.md. Cite milestone if relevant.

## 2. Autonomy Policy Assessment
Ask ONLY if: bug repro is missing critical info, fix requires schema change, fix needs auth decisions, scope creep obvious.

## 3. Workflow Order (quality loop)

**Phase A — Plan + Root Cause (`@planner`, Scout may merge on Track S)**
Output: failure mode, likely root cause, affected files, reproduction steps, proposed fix scope, **falsifiable claims + named proofs**.

**Delta elimination (mandatory before broad hypotheses):**
1. Identify **last known success** (commit, Maestro log, green suite run) and **first ongoing failure**.
2. List the **diff between those two points only** (commits + uncommitted work that touches the failing surface).
3. **Eliminate from that set** — prefer A/B (revert one delta, re-run the same repro) over inventing new causes outside the window.
4. Do **not** treat YAML/boot tweaks as the primary suspect when the failure is a **runtime** crash/hang after a product UI/state change in the same window.
5. Broad stacks (OOM, remount loops) are **symptoms** until the delta that introduced them is isolated.

- Inspect first: the changed files in the success→failure window, then taskStore.supabase.ts / supabase.ts / AppNavigator only if the delta points there.
- If runtime-only evidence needed: add instrumentation, reproduce, THEN fix.
- Prefer smallest safe fix over broad cleanup. Avoid unrelated refactors unless required.

**Phase A2 — Gate A + Test contract (Track M/U required)**
- Track M/U: ≥2 plan critics (identical brief) before Builder. Skip = Judge FAIL.
- Test Designer: regression proof first (failing Jest and/or named headed/Maestro repro). TDD: red before green.

**Phase B — Build Fix (`@builder`)**
- Minimal diff. No tangential improvements.
- TDD: add regression test FIRST (red), THEN fix (green).
- No self-SHIP.

**Phase C — Prove (parallel)**
1. Reviewer (independent model): failure mode covered; nearby regression; no new secrets/auth bypass; Zustand+AsyncStorage; backwards compat; iOS/Android if native. Block if C/H open.
2. Test Engineer: run the targeted test that fails without the fix + passes with; L2 `test:regression` if touching task/upload/component/integration; execute the full Test Designer contract.
3. QA Validator: **default-on** unless Judge classified logic-only (no screen/nav/store-read). Reproduce the bug report end-to-end; adjacent flows; screen/loading/feedback/stale data. Fail → Builder.
4. Adversary (Track M/U): unproven user-visible gaps must be proven now. Skip = Judge FAIL.

**Phase D — Quality Judge**
Scorecard. PATCH / REWORK / REDESIGN / SHIP / ESCALATE. Loop budget M=3 / U=4. Commit during loops for recovery; **Done only after SHIP**.

**Phase E — Commit (after Reviewer 0 C/H; not equivalent to SHIP)**
- `fix(<scope>): <description>` conventional commit

## 4. Bugfix-Specific Patterns

### Supabase-related bugs
- Check for SQLSTATE 42703 (missing col) or PGRST204 (PostgREST) = deferred compat layer → defer to 03b fix, not local hack.

### Maestro E2E flake bugs
- FIRST apply Gate **0–8** + 6 runner layers from maestro-preflight.md before blaming Maestro itself. 80% of flakes come from missing gates, not Maestro core. Prefer `npm run maestro:locks` before device assignment.

### Race conditions (JS bundle reload + XCTest tap / realtime sync)
- Add explicit `waitFor` or timeout guards. Never assume timing.

## 5. Final Output Format
```
=== BUGFIX EXECUTION LEDGER ===
Bug:
Root cause:
Track: S | M | U (Judge-confirmed)
Files changed:
Reproduction steps:
Fix validation: (command + result)
Judge verdict: PATCH | REWORK | REDESIGN | SHIP | ESCALATE
Commit SHA: (if committed — not equivalent to SHIP)
Risks / still-unverified: (empty in-scope UNPROVEN required for SHIP)
Next:
```
