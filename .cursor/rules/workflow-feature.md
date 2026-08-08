# Workflow: Feature (SOLO-style for Cursor)

Use this rule file when the user request is a new feature.

## 1. Milestone Gate (MANDATORY first action)
Read:
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

## 3. Workflow Order

**Phase A — Plan**
Output: Scope, acceptance criteria, affected files list, validation plan, assumptions.
- Inspect: taskStore.supabase.ts, relevant screens in src/screens/, AppNavigator.tsx, supabase.ts, package.json scripts
- Do NOT edit code here.
- Classify tests per TESTING_STRATEGY.md: L1 unit / L2 regression / L3 journeys-simulation / L4 Maestro which flows.

**Phase B — Build**
- Smallest change that meets acceptance criteria.
- Follow existing patterns. No new architecture without Planner-approved justification.
- Add tests for new branches if they materially reduce regression risk.

**Phase C — Review (Self-Review Checklist)**
1. Navigation transitions: any new screen params safe? safe-area applied?
2. Task UI state: optimistic updates, persisted Zustand, AsyncStorage handled?
3. Permissions: any new camera/photo/file permission? Correctly gated?
4. Error handling: Supabase errors, network failures, loading states
5. Performance: FlatLists have keyExtractor, no unnecessary re-renders
6. Stale data: after navigation back/forth, state refetch correct?
7. Accessibility: testIDs added for new interactive elements (MAESTRO requirement)

Mark findings C/H/M/L. Block if C/H open. Proceed only if 0 C/H.

**Phase D — Commit**
- Conventional commit: `feat(<scope>): <description>`
- Atomic, single-scoped.

**Phase E — Test**
- Smallest relevant Jest first.
- Then test:regression if touching tasks/uploads/components/integration.
- Maestro: ONLY if user-visible flows changed AND flow exists; preflight gates ON (see maestro-preflight.md).

**Phase F — QA Validate (user-visible flows required)**
- End-to-end user behavior check: transitions, loading, feedback, gating, form submit, update/review, upload, stale persistence.
- Output: pass / issues list (return to Builder).

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
Files changed:
Validation run: (command + result)
Commit: (SHA if committed)
Risks/unverified:
Next agent: (Builder/Reviewer/Test/QA/Done)
```
