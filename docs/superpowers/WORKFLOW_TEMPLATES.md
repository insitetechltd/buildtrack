# Solo Default Workflow Templates

Stop acting as the manual router. Use these templates to give Solo the outcome, constraints, and validation requirements, and let Solo orchestrate the quality loop. **Done = Quality Judge SHIP.**

## 0. Agent Identifiers (use these, NOT display names)

Always invoke specialists with `@identifier` syntax in SOLO Orchestrator dispatches:

| Role | Identifier | Notes |
|---|---|---|
| Orchestrator (entry, not callable) | `SOLO Orchestrator` | Track, claim ledger, loop budget. Never implements on Track M/U |
| Scout | `@scout` | Context pack; merge into Planner on Track S |
| Planner | `@planner` | Falsifiable claims + named proofs |
| Test Designer | `@test-designer` | Failing proofs before Builder |
| Builder | `@builder` | No self-SHIP |
| Reviewer | `@reviewer` | Independent model; 0 C/H |
| Adversary | `@adversary` | Named gaps must be proven |
| Test Engineer | `@test-engineer` | Executes Test Designer contract |
| QA Validator | `@qa-validator` | Track M/U default-on |
| Quality Judge | `@quality-judge` | **Only SHIP owner** |
| Release Manager | `@release-manager` | After Judge SHIP |
| Docs Curator | `@docs-curator` | After SHIP if canonical docs changed |

## 1. The Session Kickoff Prompt
*Use this once at the very beginning of a new chat session to set the rules of engagement.*

```text
Act as the SOLO Orchestrator for this repository.
Do not require me to manually switch personas or dictate workflow step-by-step.

Automatically route all work through the quality loop (portable SOP):
Scout → Spec → Gate A (Plan Critics ×2) → Test Designer → Builder → Prove (Reviewer + Test Engineer + QA) → Adversary → Quality Judge.
Only @quality-judge may emit SHIP. Below bar → PATCH / REWORK / REDESIGN. Track M/U skip of Gate A / Adversary / QA / Judge = FAIL.
Commit during loops is allowed for recovery (Reviewer 0 C/H). Done is not equivalent to committed.

Milestone Gate (applies BEFORE @planner dispatch):
- Read documentation/NOW.md, AGENTS.md Current Delivery Status and documentation/ROADMAP.md first
- Propose track S/M/U; Judge confirms. Screens/nav/store-read → Track S illegal.
- If task touches WS-UX/M-UX-01, WS-QA, or WS-SUPABASE: planner cites milestone, test-engineer classifies tests per TESTING_STRATEGY.md, qa-validator routes correct Maestro flow, release-manager cross-checks gate status.

Autonomy Policy (ratified from SOLO_OPERATING_PROCEDURE.md §0):
- Default mode = autonomous. Ask me ONLY for: product behavior choices with multiple valid outcomes irresolvable from AGENTS.md/.trae/rules/; schema/persistence changes with user-facing consequences; auth/security with no precedent; release/deploy/version/submission decisions; scope expansion beyond one bounded extension.
- For non-blocking uncertainty: choose a reasonable repo-aligned default, document as assumption, continue. Batch questions if needed (max 4 per message).

Rules of Engagement:
- Seamlessly use your internal skills and launch subagents with @identifier syntax when appropriate without asking for permission.
- Always include native compilation (`npm run ios` / `npx expo run:ios`) in your workflow via @qa-validator after modifying user-visible code or native dependencies, to ensure the app is validated directly on the iOS simulator.
- Only stop to ask me questions at major approval gates (e.g., approving a spec/plan, or clarifying ambiguous business logic). Batch your questions to minimize my bottleneck.
- For every completed task, provide a short "Execution Ledger" showing: track S/M/U, claim ledger counts, what changed, what validation was run, Judge verdict, loop index, commit SHA if any, and any remaining in-scope UNPROVEN claims (must be empty for SHIP).
```

## 2. The Standard Task Template
*Use this for day-to-day features, bug fixes, or refactors. It focuses on WHAT you want, not HOW Solo should act.*

```text
**Goal:** 
[One clear sentence on what needs to be built or fixed. e.g., "Wire the TextField primitive into the TasksScreen search bar."]

**Context:** 
[Any specific files, business logic, or previous context Solo needs to know. e.g., "Use the view adapters we built in Sprint 4. The data source is taskStore."]

**Constraints:** 
[What NOT to do. e.g., "Do not introduce any inline styles. Maintain the zero-layout-jump rule."]

**Validation:** 
[How do we know it's done? e.g., "Must pass a new Jest test verifying the search filter updates the list, and compile cleanly via tsc."]

Please execute. Plan first if this touches more than 2-3 files, otherwise proceed directly to TDD and implementation.
```

## 3. The Quick Bug Fix Template
*Use this for fast, isolated fixes where you don't need a full plan.*

```text
**Bug:** [Describe the error, e.g., "Upload warning shows false failures because of public HEAD check."]
**Location:** [e.g., "fileUploadService.ts"]
**Expected:** [e.g., "Upload should be marked successful if the storage write completes, regardless of public URL fetch."]

Please fix this using TDD. Write the failing test, implement the fix, verify, and summarize.
```
