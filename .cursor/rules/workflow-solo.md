# Workflow: SOLO Orchestrator (Default for Non-Trivial Work)

Use this rule file for any non-trivial task that doesn't fit feature/bugfix/release/docs-only narrow scopes, or for the default kickoff when the user request is open-ended.

## 1. Milestone Gate (MANDATORY first action — BEFORE ANYTHING ELSE)
```
Read AGENTS.md § Current Delivery Status
Read documentation/ROADMAP.md milestone ledger
```

If task touches any active/pipeline milestone (WS-UX/M-UX-01, WS-QA/M-QA-01/02/03, WS-SUPABASE/M-SUPABASE-01/02a/02b/03a-03e/04a-04d):
- @planner cites milestone in scope
- @test-engineer classifies Jest layers per TESTING_STRATEGY.md
- @qa-validator routes Maestro to correct sprint-specific flow
- @release-manager cross-checks gate status before release-ready claim

## 2. Autonomy Policy (ratified 5-item gate)
Default = autonomous. Do NOT ask user for: bug fixes, focused refactors, small pattern-following features, docs after implementation, plan/spec writing.

Ask user ONLY for:
1. Product behavior choices ≥2 valid irresolvable outcomes
2. Schema/persistence changes with user-facing consequences
3. Auth/security changes with no precedent
4. Release/deploy/environment decisions
5. Scope expansion >1 bounded extension

If uncertainty non-blocking → smallest repo-aligned default, log as assumption, CONTINUE. Surface assumptions in FINAL LEDGER only, never mid-workflow pauses.

## 3. Workflow Choice (dispatch first)
Pick exactly ONE route from:
1. Feature → follow .cursor/rules/workflow-feature.md
2. Bug Fix → follow .cursor/rules/workflow-bugfix.md
3. Refactor → Plan (writing-plans) → Review pre-check risk → Build → Review → COMMIT → Test
4. Release/Deploy → follow .cursor/rules/workflow-release.md
5. Docs-only → Plan → Docs → Review → COMMIT
6. Supabase Ms02/Ms03b combined → follow .cursor/rules/workflow-ms02-unblock.md

## 4. Discipline Rules (every SOLO cycle)
- Start with Planner for non-trivial tasks
- Use Build ONLY after plan exists
- Review ALWAYS before commit. 0 Critical / 0 High findings mandatory.
- Commit gate ordering: Build → Review 0 C/H → Conventional commit → Test → QA (if user-visible)
- NEVER commit pre-review. NEVER commit with C/H open.
- For task-domain work: inspect taskStore.supabase.ts + screens + AppNavigator.tsx
- Prefer taskStore.supabase.ts over legacy taskStore.ts.
- For persistence: inspect supabase.ts + realtime helpers
- For build/release: inspect package.json + app.json + eas.json + patches/ BEFORE changes
- Be careful with: persisted Zustand, AsyncStorage, optimistic updates, realtime sync, Supabase flows
- Do NOT casually change: Expo/RN versions, EAS config, bundle identifiers, build numbers, runtime version, deps strategy

## 5. Validation Baseline (minimum for every non-docs cycle)
1. `npx tsc --noEmit` rc=0
2. Smallest relevant targeted Jest command
3. If behavioral change → `npm run test:regression`
4. If user-visible mobile flow → Maestro with preflight gates (maestro-preflight.md)

## 6. Final Output Format (MANDATORY end-of-cycle)
```
=== SOLO EXECUTION LEDGER ===
Task:
Milestone Gate result: (milestone cited / none)
Autonomy questions asked: (0 / list)
Workflow chosen: (Feature/Bugfix/Refactor/Release/Docs/Ms02)
What changed:
Files changed:
Validation run: (commands + results — PASS/FAIL explicitly)
Commit SHA: (if committed)
Risks / unverified:
Next recommended action:
```
