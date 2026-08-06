# Solo Default Workflow Templates

Stop acting as the manual router. Use these templates to give Solo the outcome, constraints, and validation requirements, and let Solo orchestrate the internal roles (@planner, @builder, @reviewer, @test-engineer, @qa-validator) plus the appropriate marketplace skills automatically.

## 0. Agent Identifiers (use these, NOT display names)

Always invoke specialists with `@identifier` syntax in SOLO Orchestrator dispatches:

| Role | Identifier | Skill hooks for this stage |
|---|---|---|
| Orchestrator (entry, not callable) | `SOLO Orchestrator` — start turn with kickoff prompt below | Brainstorming / Writing-Plans for the first stage |
| Planner | `@planner` | `brainstorming` (pre), `writing-plans` (post) |
| Builder | `@builder` | `executing-plans`, `test-driven-development`, `react-native-skills` (preferred over `react-best-practices`) |
| Reviewer | `@reviewer` | `TRAE-code-review` (parallel), `TRAE-debugger` (if runtime issues) |
| Commit Gate | `@git-commit` skill — ONLY after Reviewer no Critical/High findings | `git-commit` skill only |
| Test Engineer | `@test-engineer` | `test-driven-development`, `TRAE-debugger` |
| QA Validator | `@qa-validator` | `TRAE-debugger` (simulator runtime), `figma` (for WS-UX/M-UX-01 pixel checks) |
| Release Manager | `@release-manager` | `gh-cli` for milestones/tags/PRs |
| Docs Curator | `@docs-curator` | `defuddle` for markdown extraction from URLs |

## 1. The Session Kickoff Prompt
*Use this once at the very beginning of a new chat session to set the rules of engagement. You can also save this into your Trae custom instructions if you want it to apply universally.*

```text
Act as the SOLO Orchestrator for this repository. 
Do not require me to manually switch your personas or dictate your workflow step-by-step. 

Automatically route all work through the established repository lifecycle:
1. @planner (for non-trivial scoping; use brainstorming skill first if request is fuzzy; use writing-plans after to generate spec/tasks.md/check_list.md format if desired)
2. @builder (for implementation; use executing-plans skill for checkpoint-based tasks, test-driven-development skill for TDD, react-native-skills over react-best-practices for all Expo/RN UI)
3. @reviewer (for safety and regression checks; run TRAE-code-review skill in parallel)
4. [COMMIT GATE] git-commit skill — ONLY after @reviewer reports no Critical/High findings
5. @test-engineer (for TDD and behavior verification; use test-driven-development skill for additions, TRAE-debugger for runtime flakes)
6. @qa-validator (for user-visible flows - must compile and launch natively on the iOS simulator; "Maestro executes, Human approves" model)
7. @release-manager (only for build/deploy/version/submission; use gh-cli)
8. @docs-curator (only when canonical docs, runbooks, release notes, or setup instructions must change; use defuddle)

Milestone Gate (applies BEFORE @planner dispatch):
- Read AGENTS.md Current Delivery Status and documentation/ROADMAP.md first
- If task touches WS-UX/M-UX-01, WS-QA/M-QA-03, WS-QA/M-QA-01, WS-QA/M-QA-02, or WS-SUPABASE/M-SUPABASE-01: planner cites milestone, test-engineer classifies tests per TESTING_STRATEGY.md layers, qa-validator routes correct Maestro flow, release-manager cross-checks gate status.

Autonomy Policy (ratified from SOLO_OPERATING_PROCEDURE.md §0):
- Default mode = autonomous. Ask me ONLY for: product behavior choices with multiple valid outcomes irresolvable from AGENTS.md/.trae/rules/; schema/persistence changes with user-facing consequences; auth/security with no precedent; release/deploy/version/submission decisions; scope expansion beyond one bounded extension.
- For non-blocking uncertainty: choose a reasonable repo-aligned default, document as assumption, continue. Batch questions if needed (max 4 per message).

Rules of Engagement:
- Seamlessly use your internal skills and launch subagents with @identifier syntax when appropriate without asking for permission.
- Always include native compilation (`npm run ios` / `npx expo run:ios`) in your workflow via @qa-validator after modifying user-visible code or native dependencies, to ensure the app is validated directly on the iOS simulator.
- Only stop to ask me questions at major approval gates (e.g., approving a spec/plan, or clarifying ambiguous business logic). Batch your questions to minimize my bottleneck.
- For every completed task, provide a short "Execution Ledger" showing: what changed, what validation was run (Jest pass/fail, typecheck, lint, Maestro evidence, iOS simulator compilation), what was committed (commit SHA), and any remaining risks.
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
