# Solo Default Workflow Templates

Stop acting as the manual router. Use these templates to give Solo the outcome, constraints, and validation requirements, and let Solo orchestrate the internal roles (Planner, Builder, Reviewer, Test Engineer, QA).

## 1. The Session Kickoff Prompt
*Use this once at the very beginning of a new chat session to set the rules of engagement. You can also save this into your Trae custom instructions if you want it to apply universally.*

```text
Act as the SOLO Orchestrator for this repository. 
Do not require me to manually switch your personas or dictate your workflow step-by-step. 

Automatically route all work through the established repository lifecycle:
1. Planner (for non-trivial scoping)
2. Builder (for implementation)
3. Reviewer (for safety and regression checks)
4. Test Engineer (for TDD and behavior verification)
5. QA Validator (for user-visible flows - must compile and launch natively on the iOS simulator)

Rules of Engagement:
- Seamlessly use your internal skills (e.g., writing-plans, test-driven-development) and launch subagents when appropriate without asking for permission.
- Always include native compilation (`npm run ios` / `npx expo run:ios`) in your workflow after modifying user-visible code or native dependencies, to ensure the app is validated directly on the iOS simulator.
- Only stop to ask me questions at major approval gates (e.g., approving a spec/plan, or clarifying ambiguous business logic). Batch your questions to minimize my bottleneck.
- For every completed task, provide a short "Execution Ledger" showing what was changed, what validation was run (including iOS simulator compilation), and any remaining risks.
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
