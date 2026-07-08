# Insite App Coding Automation: Reducing User Round-Trips

## Executive Summary

The current setup is strong on safety, review discipline, and role separation. The main bottleneck is that the workflow is implicitly **approval-driven** instead of **exception-driven**:

- `SOLO Orchestrator` is told to stop early when work is ambiguous.
- `Planner` is told to ask clarifying questions when requests are ambiguous and always emits `Open questions`.
- `Builder` must hand hidden complexity back to `Planner` instead of proposing a bounded fallback and continuing.
- `Reviewer`, `Test Engineer`, and `QA Validator` are mandatory in many paths, which is good, but their handoffs can still produce extra conversational loops if findings are surfaced to the user too early instead of being resolved internally first.
- `QA Validator` currently requires native iOS simulator validation for any UI or user-visible change, which creates friction and slows throughput.

The result is a workflow that is reliable but tends to ask for confirmation too often. The best improvement is to move to a **default autonomous execution policy** with a narrow blocker list.

## Current Bottlenecks

### 1. Clarification Is Treated As The Default Safety Mechanism

Across `AGENTS.md`, `solo-orchestrator.md`, and `planner.md`, ambiguity leads to user clarification. That is safe, but too broad.

This means many requests that could be completed using existing repository conventions still risk becoming:

`user request -> planner questions -> user reply -> builder -> reviewer -> more clarification`

### 2. Planner Output Encourages A User Checkpoint

The Planner always emits:

- current understanding
- constraints
- risks
- proposed plan
- open questions

That structure is good for traceability, but `Open questions` tends to become a conversational invitation even when the questions are not blocking.

### 3. Hidden Complexity Automatically Bounces Work Backward

The Builder is instructed to hand work back to Planner if hidden complexity appears. That prevents reckless redesign, but it also causes preventable back-and-forth when the complexity can be contained with a small fallback option.

### 4. QA Cost Is High For Every UI Change

`qa-validator.md` says to always compile and run natively on iOS simulator for any UI or user-visible change. That creates latency and often encourages the agent to pause and narrate rather than complete a fast closed loop.

### 5. Internal Stage Completion Is Not Clearly Separated From User Escalation

The current pack is good at role handoff, but not explicit enough about this rule:

> Internal uncertainty should be resolved internally first. The user should only be interrupted for true business, product, or risk-acceptance decisions.

## Recommended Operating Model

Shift the repository from **approval-driven execution** to **autonomous-by-default execution**:

- Proceed without asking the user when the request can be satisfied using repository conventions, roadmap priorities, and existing architecture.
- Ask the user only when a decision changes product behavior, data semantics, release risk, or scope in a meaningful way.
- Route review findings back into implementation internally before surfacing to the user unless the finding requires a product decision.
- Deliver completed work plus assumptions and residual risks instead of plan-first discussion for most low and medium risk tasks.

## Specific Recommendations

## 1. Add An Autonomy Policy To `AGENTS.md`

Add a new section such as:

### Default Autonomy Policy

- Default execution mode is `autonomous`.
- Do not ask the user for confirmation if the task is:
  - a bug fix
  - a focused refactor
  - a small feature aligned with existing patterns
  - documentation that follows an implemented change
- Ask the user only for:
  - product behavior choices with multiple valid outcomes
  - schema or persistence model changes with user-facing consequences
  - auth, permissions, or security-sensitive changes
  - release, deployment, or environment decisions
  - changes that exceed the requested scope by more than one bounded extension
- If uncertainty is non-blocking, record an assumption and continue.
- If several clarifications are needed, batch them into a single user message.

This one change creates a top-level policy that the role prompts can align to.

## 2. Tighten `SOLO Orchestrator` To Use A Blocker Threshold

Current behavior is effectively "ask on ambiguity." Change that to:

- Do not stop for clarification unless the ambiguity is **blocking**.
- Treat the following as non-blocking by default:
  - file selection when a dominant likely file exists
  - validation method when a smallest useful check exists
  - UI details that can follow current app patterns
  - naming choices, documentation wording, and local refactor shape
- When the request is under-specified but still solvable, choose the smallest safe interpretation and continue.
- Surface assumptions in the final synthesis rather than pausing the workflow.

Recommended prompt wording:

> If a task is ambiguous, ask the user only when the ambiguity would materially change product behavior, architecture boundaries, data semantics, or release risk. Otherwise choose the smallest safe interpretation, record assumptions, and continue autonomously.

## 3. Change Planner From `Open Questions` To `Blockers`

Replace the tail of the planner output:

- `Open questions`

with:

- `Blocking decisions`
- `Assumptions made`

Planner rule update:

> Ask clarifying questions only when a missing decision prevents safe execution. If a reasonable repository-aligned default exists, document the assumption and proceed.

This single wording shift matters a lot. `Open questions` invites discussion. `Blocking decisions` suppresses unnecessary discussion.

## 4. Allow Builder To Use Bounded Fallbacks Before Escalation

Current Builder behavior sends hidden complexity back to Planner quickly. Update it so the Builder can continue when complexity can be contained.

Suggested Builder rule:

> If hidden complexity appears, do not broaden scope silently. First attempt one bounded fallback that preserves the current architecture and solves the requested problem with a smaller change. Return to Planner only if the fallback would materially reduce correctness, coverage, or maintainability.

This reduces loops caused by minor surprises.

## 5. Keep Review Internal Unless A Real Decision Is Needed

For `Reviewer`, `Test Engineer`, and `QA Validator`, add a coordination rule:

> Findings that can be fixed without changing product intent should be returned internally to Builder rather than surfaced to the user as a decision point.

This means the user sees:

- completed work
- what was validated
- any residual risk

instead of:

- provisional work
- a list of review comments
- a request for direction

unless a real product choice is involved.

## 6. Relax `QA Validator` From Always-Native To Risk-Based Native Validation

This is one of the biggest throughput wins.

Current rule:

> ALWAYS compile and run the app natively on the iOS simulator for any UI or user-visible changes.

Recommended replacement:

> Run native iOS simulator validation for user-visible changes when the affected flow is high-risk, navigation-heavy, stateful, animation-sensitive, or known to regress. For low-risk presentational changes, use the smallest evidence set that provides confidence, including targeted tests, static inspection, screenshots, or automated UI smoke flows when available.

Then explicitly align this with `WS-QA / M-QA-02`:

- use Maestro smoke coverage as the default first-line UI regression gate
- reserve full native manual validation for high-risk flows and milestone-closing slices

This keeps quality discipline but reduces unnecessary heavy validation.

## 7. Promote `WS-QA / M-QA-02` As A Core Autonomy Enabler

Your roadmap already has the right idea:

- `WS-QA / M-QA-02` UI automation foundation

If your goal is fewer user responses, this milestone should be treated as a force multiplier, not a side effort.

Specific suggestion:

- move Maestro smoke coverage ahead of additional feature automation work whenever a repeated flow still requires manual QA narration
- prioritize flows that currently trigger discussion or manual confirmation:
  - app launch
  - auth entry
  - navigation shell
  - task list
  - task detail
  - task update / submit / review path
  - photo update flow

The more repeatable evidence the system can gather itself, the less it needs to ask the user.

## 8. Define A 3-Tier User Interruption Policy

Add a lightweight policy to the operating procedure:

### Tier 1: No Interruption

- focused bug fixes
- local refactors
- docs aligned to implementation
- selector/test additions
- low-risk UI polish

Expected behavior:

- execute end to end
- return final result only

### Tier 2: Single Batched Interruption At Most

- medium feature work
- navigation updates with clear intent
- task-flow improvements within existing semantics

Expected behavior:

- ask once only if needed
- batch all blocking decisions together
- otherwise continue autonomously

### Tier 3: Explicit Approval Required

- schema changes
- auth or permission model changes
- destructive migrations
- release/deployment
- scope changes with product implications

Expected behavior:

- stop only for the decision that truly changes risk ownership

This gives the whole agent pack a shared threshold.

## 9. Make Roadmap And Existing Source-Of-Truth Docs Count As Consent

Right now, the system has strong documents:

- `documentation/ROADMAP.md`
- `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- `AGENTS.md`
- `.trae/rules/`

Treat these as **pre-approved decision sources**. In practice:

- if the roadmap order is clear, do not ask what should be prioritized
- if the UI/UX source of truth defines target behavior, do not ask for stylistic confirmation
- if task-domain rules define workflow semantics, do not ask to reconfirm them

This reduces redundant confirmation.

## 10. Add A `Silent Delivery` Default

Add a final-facing workflow rule:

> Unless the user asks for plan-first collaboration, default to silent end-to-end delivery for low and medium risk tasks. Provide the completed output, validations performed, assumptions made, and any residual risks in the final response.

This directly addresses the bottleneck you described.

## Recommended Prompt Changes By File

## `AGENTS.md`

Add:

- Default Autonomy Policy
- 3-tier interruption model
- "non-blocking uncertainty should be handled by assumption, not user escalation"

## `.trae/agents/solo-orchestrator.md`

Change:

- "if a task is ambiguous, stop early and ask focused questions"

To:

- "if a task is blocking-ambiguous, ask focused questions; otherwise choose the smallest safe interpretation and continue"

## `.trae/agents/planner.md`

Change:

- `Open questions`

To:

- `Blocking decisions`
- `Assumptions made`

And update the rule so non-blocking ambiguity does not trigger user interaction.

## `.trae/agents/builder.md`

Add:

- bounded fallback authority before returning to Planner
- explicit instruction to prefer finishing with a narrower safe implementation over reopening discussion

## `.trae/agents/reviewer.md`

Add:

- fix-forward internal loop preference
- escalate to the user only for intent-changing findings

## `.trae/agents/test-engineer.md`

Add:

- prefer existing targeted tests and smoke flows without narrating intermediate status unless the test result changes scope or risk

## `.trae/agents/qa-validator.md`

Replace:

- universal native simulator mandate

With:

- risk-based native validation + Maestro-first smoke coverage where available

## `SOLO_OPERATING_PROCEDURE.md`

Add:

- interruption tier policy
- silent delivery default
- blockers-not-questions terminology
- internal resolution before user escalation

## Best Immediate Changes

If you only make three changes, make these:

1. Change Planner from `Open questions` to `Blocking decisions` plus `Assumptions made`.
2. Change Orchestrator from "ask on ambiguity" to "ask only on blocking ambiguity."
3. Change QA Validator from "always run natively for every UI change" to "run natively based on risk; otherwise rely on targeted evidence and automation."

Those three changes alone should noticeably reduce conversational drag.

## Suggested Success Metrics

To know whether the new policy is working, track:

- average user interruptions per task
- percent of tasks completed in one end-to-end pass
- percent of interruptions that were truly blocker-class
- review findings resolved internally without user involvement
- UI changes validated by automated smoke flows versus manual simulator runs

## Final Recommendation

The right direction is not removing safety stages. It is changing **where the friction lands**:

- keep planning, review, testing, and QA
- remove routine user confirmations
- use assumptions, repo conventions, and roadmap documents as default authority
- interrupt the user only for decisions that truly transfer product or risk ownership

That gives you more autonomy without giving up discipline.
