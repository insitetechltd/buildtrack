# Workflow: Bugfix (SOLO-style for Cursor)

Use this rule file when the user request is a bug fix.

## 1. Milestone Gate (MANDATORY first action)
Read AGENTS.md Current Delivery Status + documentation/ROADMAP.md. Cite milestone if relevant.

## 2. Autonomy Policy Assessment
Ask ONLY if: bug repro is missing critical info, fix requires schema change, fix needs auth decisions, scope creep obvious.

## 3. Workflow Order

**Phase A — Plan + Root Cause**
Output: failure mode description, likely root cause, affected files, reproduction steps, proposed fix scope, validation plan.
- Inspect first: taskStore.supabase.ts, supabase.ts, AppNavigator.tsx, affected screen
- If runtime-only evidence needed: add instrumentation, reproduce, THEN fix.
- Prefer smallest safe fix over broad cleanup. Avoid unrelated refactors unless required.

**Phase B — Build Fix**
- Minimal diff. No tangential improvements.
- TDD: add regression test FIRST (red), THEN fix (green), THEN commit.

**Phase C — Review (Self-Review Checklist)**
1. Specific failure mode tested + passes
2. Nearby regression surface covered: run targeted Jest, not full suite
3. No new security issues: no secrets logged, no auth bypass, no injection vectors
4. State persistence integrity: Zustand + AsyncStorage after fix, reload
5. Backwards compat: fix doesn't break existing behavior paths
6. If native/permissions change: explicit check for iOS/Android both

Block if C/H findings. Proceed if 0 C/H.

**Phase D — Commit**
- `fix(<scope>): <description>` conventional commit

**Phase E — Test**
- Run the targeted test that fails without the fix + passes with
- Then run L2 test:regression if touching task/upload/component/integration
- Maestro only if bug affects user-visible flow AND flow exists (preflight gates mandatory)

**Phase F — QA Validate (only if bug touched user-visible flows)**
- Reproduce the bug report scenario end-to-end
- Verify no regressions in adjacent flows
- Checklist: screen state, loading states, action feedback, stale data on navigation

## 4. Bugfix-Specific Patterns

### Supabase-related bugs
- Check for SQLSTATE 42703 (missing col) or PGRST204 (PostgREST) = deferred compat layer → defer to 03b fix, not local hack.

### Maestro E2E flake bugs
- FIRST apply 8 preflight gates + 6 runner layers from maestro-preflight.md before blaming Maestro itself. 80% of flakes come from missing gates, not Maestro core.

### Race conditions (JS bundle reload + XCTest tap / realtime sync)
- Add explicit `waitFor` or timeout guards. Never assume timing.

## 5. Final Output Format
```
=== BUGFIX EXECUTION LEDGER ===
Bug:
Root cause:
Files changed:
Reproduction steps:
Fix validation: (command + result)
Commit: (SHA if committed)
Risks / still-unverified:
Next:
```
