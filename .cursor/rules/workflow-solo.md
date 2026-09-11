# Workflow: SOLO Orchestrator (Default for Non-Trivial Work)

Portable cycle: `~/.cursor/skills/solo-dev-harness/SOP.md` (git-tracked copy: `docs/superpowers/templates/solo-dev-harness/SOP.md`). Dual-write SOP.md + `templates/` + this file. Insite overlays (Maestro, Supabase) stay in `insite-dev`.

Use this rule file for any non-trivial task that doesn't fit feature/bugfix/release/docs-only narrow scopes, or for the default kickoff when the user request is open-ended.

**Cycle shape:** Scout → Spec → Gate A → Test contract → Build → Prove → **Quality Judge**. Below bar → PATCH / REWORK / REDESIGN. Only Judge emits SHIP. Done ≠ last role ran.

## 1. Milestone Gate (MANDATORY first action — BEFORE ANYTHING ELSE)
```
Read documentation/NOW.md
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
3. Refactor → Scout+Plan → Review pre-check if risky → Test contract → Build → Prove → Judge (loop) → SHIP
4. Release/Deploy → follow .cursor/rules/workflow-release.md
5. Docs-only → Plan → Docs → Review → Judge light → SHIP
6. Historical Supabase Ms02/Ms03b path (Closed) → `.cursor/rules/workflow-ms02-unblock.md` for audit only

Then pick **track S / M / U** (Orchestrator proposes; Judge confirms). See SOP §4 / `docs/superpowers/templates/solo-dev-harness/templates/tracks.md`. Diff touching `src/screens/`, navigation, or a store screens read → Track S is illegal.

## 3b. Multi-critique + Judge (Track M/U — not waivable)
Follow `.cursor/rules/multi-critique-validation.mdc` + shared brief in `multi-model-evaluation-prompt.mdc`:
- **Gate A (Plan Critics)** before Builder: ≥2 parallel plan critiques (same brief)
- **Test Designer** before Builder: failing proofs / named commands
- **Adversary (Gate B)** after Prove: independent “assume the author is wrong”; named gaps must be proven or scoped out
- **Gate C** for form/input primitives: headed focus/keyboard/submit smoke
- **Quality Judge** is the only SHIP owner. Track M/U skip of Gate A / Adversary / QA / Judge = FAIL (not “say so”).

## 4. Discipline Rules (every SOLO cycle)
- Intake READY, then Scout + Planner for non-trivial tasks
- Use Build ONLY after plan + (Track M/U) Gate A + Test contract exist
- Prefer **concurrent tracks** when ownership partitions (disjoint files / independent Maestro cases); serialize shared helpers, product SoT, schema/auth/release, same sim UDID
- Cap Maestro ≤2 UDIDs on this host; 1 job per UDID; one-shot case runs while developing; full suite = final gate
- **Sim coordination (SOP §10 overlay):** `npm run maestro:locks` before Maestro; claim if free; release on teardown; never two Maestro jobs on one UDID
- Two-sim SOP: parallel Maestro only on **distinct** UDIDs (`MAESTRO_UDID` per track). Never two jobs on the same simulator.
- Orchestrator + Judge never implement on Track M/U
- Reviewer (independent model) 0 C/H before commit; **Judge SHIP** before Done
- Test Engineer executes the Test Designer contract (not “smallest check that might pass”)
- QA Validator default-on for Track M/U (screens / nav / upload / task-flow / stores screens read). Logic-only = Judge classification with evidence
- Release Manager only for build/store/env decisions
- User-visible or risky diffs: after Reviewer, run Bugbot (`review-bugbot`) unless user declined. Auth/RLS/secrets/payments: Security Review (`review-security`) unless declined. Skip when required = Judge FAIL
- Commit during loops is allowed for recovery (still 0 C/H). **Done is not.** User-requested commit after SHIP: conventional commit → **push by default**
- NEVER commit pre-review. NEVER commit with C/H open. NEVER claim Done with in-scope UNPROVEN claims
- For task-domain work: inspect taskStore.supabase.ts + screens + AppNavigator.tsx
- Prefer taskStore.supabase.ts over legacy taskStore.ts.
- For persistence: inspect supabase.ts + realtime helpers
- For build/release: inspect package.json + app.json + eas.json + patches/ BEFORE changes
- Be careful with: persisted Zustand, AsyncStorage, optimistic updates, realtime sync, Supabase flows
- Do NOT casually change: Expo/RN versions, EAS config, bundle identifiers, build numbers, runtime version, deps strategy

## 5. Validation Baseline (minimum for every non-docs cycle)
1. `npx tsc --noEmit` rc=0
2. Named Jest commands from the Test Designer contract
3. If behavioral change → `npm run test:regression`
4. Track M/U user-visible / screen / nav / upload / store-read → Maestro or headed with preflight gates (maestro-preflight.md) + visual PNG read. QA skip only if Judge classified logic-only

## 6. Final Output Format (MANDATORY end-of-cycle)
```
=== SOLO EXECUTION LEDGER ===
Task:
Track: S | M | U (proposed / Judge-confirmed)
Milestone Gate result: (milestone cited / none)
Autonomy questions asked: (0 / list)
Workflow chosen: (Feature/Bugfix/Refactor/Release/Docs/Ms02)
Claim ledger: PASS/FAIL/UNPROVEN counts
What changed:
Files changed:
Validation run: (commands + results — PASS/FAIL explicitly)
Judge verdict: PATCH | REWORK | REDESIGN | SHIP | ESCALATE
Loop: n / budget
Commit SHA: (if committed — not equivalent to SHIP)
Risks / unverified: (must be empty in-scope UNPROVEN for SHIP)
Next recommended action:
```
