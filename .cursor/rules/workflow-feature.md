# Workflow: Feature (SOLO-style for Cursor)

Portable cycle: `~/.cursor/skills/solo-dev-harness/SOP.md` (git-tracked copy: `docs/superpowers/templates/solo-dev-harness/SOP.md`). Dual-write process changes to SOP.md + `templates/` + this file.

Use this rule file when the user request is a new feature.

Features are **Track M** unless they are shared primitives / auth / payments / camera / multi-user (**Track U**). Track S is illegal if screens, navigation, or a store screens read will change.

**Loop:** Scout → Spec → Gate A → Test contract → Build → Prove → Quality Judge. Only Judge emits SHIP.

## 1. Milestone Gate (MANDATORY first action)
Read:
- documentation/NOW.md
- AGENTS.md § Current Delivery Status
- documentation/ROADMAP.md milestone ledger

Cite milestone in plan scope if feature touches active/pipeline milestones. Route Maestro flows correctly.

## 2. Autonomy Policy Assessment
Batch any needed questions into 1 compact message (max 4 at a time). Questions ONLY for:
- product behavior ≥2 irresolvable outcomes
- schema/persistence changes with user consequences
- auth/security no precedent
- release/deploy decisions
- scope >1 bounded extension

Else: proceed autonomous.

## 3. Workflow Order (quality loop — not a one-pass waterfall)

**Phase 0 — Scout**
Context pack (NOW/ROADMAP/SoT/similar code). Propose track M or U. Do not plan here.

**Phase A — Spec (`@planner`)**
Output: falsifiable claims (each with a named proof), affected files, assumptions.
- Inspect: taskStore.supabase.ts, relevant screens in src/screens/, AppNavigator.tsx, supabase.ts, package.json scripts
- Do NOT edit product code here.
- Classify tests per TESTING_STRATEGY.md: L1 unit / L2 regression / L3 journeys-simulation / L4 Maestro which flows.
- Prose goals without proofs are an invalid plan.

**Phase A2 — Gate A (Plan Critics)**
- Before Builder, run ≥2 parallel plan/validation critiques (prefer different models, **identical brief**). See `.cursor/rules/multi-critique-validation.mdc`.
- Fold Critical/High into the spec. Self-review is not Gate A. Skip = Judge FAIL on Track M/U.

**Phase A3 — Test contract (`@test-designer`)**
- Write or specify failing proofs **before** Builder: Jest cases, Maestro case IDs, headed smoke steps, visual assertions.
- This is the contract the Judge will score.

**Phase B — Build (`@builder`)**
- Smallest change that greens the proof contract.
- Follow existing patterns. No new architecture without Planner-approved justification.
- Shared form primitives: include Gate C interaction acceptance from `multi-critique-validation.mdc`.
- No self-SHIP. Hidden complexity → return to Planner.

**Phase C — Prove (parallel)**
1. **Reviewer** (independent model): navigation, optimistic/persisted state, permissions, errors, FlatList keys, stale data, testIDs, form hit-targets / keyboard / stale chrome. 0 C/H required. Does not rewrite.
2. **Test Engineer:** execute the Test Designer contract (`tsc` + named Jest; L2 regression when tasks/uploads/components/integration touched). Not “smallest check that might pass.” Does not claim QA signoff.
3. **QA Validator (default-on):** end-to-end user behavior; Form/TextField headed smoke (tap chrome, type, submit with keyboard open); visual artifacts + delta notes. Fail → Builder.
4. **Adversary:** sees only diff summary, acceptance, commands, artifacts. “Assume the author is wrong.” Named gaps must be proven now or explicitly scoped out.

**Phase D — Quality Judge**
Scorecard (`docs/superpowers/templates/solo-dev-harness/templates/scorecard.md`). Verdict:
- PATCH → Builder, same spec
- REWORK → Planner delta
- REDESIGN → Scout
- SHIP → close (Docs if canonical docs changed)
- ESCALATE → user + scorecard (loop budget M=3 / U=4)

Two PATCHes still below bar → Shadow Builder / Best-of-N.

**Phase E — Commit (recovery anytime; Done only after SHIP)**
- Conventional commit: `feat(<scope>): <description>`
- Atomic, single-scoped.
- Reviewer 0 C/H still required before commit. Commit ≠ SHIP.

## 4. Feature-Specific Patterns

### Task features
- ALWAYS inspect src/state/taskStore.supabase.ts lines ~58 DEFERRED_TASK_CREATE_SCHEMA_FIELDS (6 cols). If writing to any of those 6 → feature is BLOCKED until 03b closes. See §7.0c ROLLOUT WARNING in .cursorrules.

### Navigation
- Screen additions/param changes: edit AppNavigator.tsx param types explicit.

### Supabase data writes
- Follow supabase.ts error conventions. Handle PostgREST PGRST204 / SQLSTATE 42703 per taskStore pattern (deferred compat layer awareness).

## 5. Final Output Format
```
=== FEATURE EXECUTION LEDGER ===
Goal:
Track: M | U (Judge-confirmed)
Claim ledger: PASS/FAIL/UNPROVEN counts
Files changed:
Validation run: (command + result)
Judge verdict: PATCH | REWORK | REDESIGN | SHIP | ESCALATE
Loop: n / budget
Commit: (SHA if committed — not equivalent to SHIP)
Risks/unverified: (empty in-scope UNPROVEN required for SHIP)
Next agent: (Builder/Planner/Scout/Judge/Docs/Done)
```
