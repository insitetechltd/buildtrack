# Insite App Agent Inventory

This file is the repository-local inventory of the SOLO sub-agent pack currently defined in `.trae/agents/`.

Source of truth scanned for this inventory:
- `.trae/agents/README.md`
- `.trae/agents/solo-orchestrator.md`
- `.trae/agents/planner.md`
- `.trae/agents/builder.md`
- `.trae/agents/reviewer.md`
- `.trae/agents/test-engineer.md`
- `.trae/agents/qa-validator.md`
- `.trae/agents/release-manager.md`
- `.trae/agents/docs-curator.md`

## Current Delivery Status

- Latest lifecycle milestone: `WS-FND / M-FND-04 - UI Migration Foundations` is delivered, verified, and safely staged for remote pipeline merge. This milestone was historically closed during Sprint 4.
- Previously closed milestone: `WS-FND / M-FND-03 - Workspace Automation & Script Cleanup` remains delivered and validated as the automation and observability foundation for the current UI contract work.
- Earlier closed milestone: `WS-FND / M-FND-02 - Global Store Performance & Network Request Deduplication` remains delivered and validated as the performance foundation beneath the view-layer migration boundary.
- Earlier closed milestone: `WS-FND / M-FND-01 - Field Reliability & Data Integrity` remains delivered and validated as the reliability foundation beneath the current workflow stack.
- Completed `WS-FND / M-FND-04` implementation scope:
  - style-free primitive family contracts in `src/ui/contracts/primitives.ts`
  - Wave 1 screen view adapter contracts in `src/ui/contracts/viewAdapters.ts`
  - navigation readiness and hybrid transition bridge contracts in `src/ui/contracts/navigationBridge.ts`
  - mathematical migration scoring inventory in `src/ui/contracts/screenScoring.ts`
  - focused contract coverage in `src/__tests__/integration/uiMigrationContracts.test.ts`
  - aligned UI migration wave matrix documentation in `documentation/m-fnd-04-ui-migration-wave-matrix.md`
- Validation completed during the third delivery slice of `WS-FND / M-FND-04`:
  - `npx jest src/__tests__/integration/uiMigrationContracts.test.ts`
  - `npx tsc --noEmit`
- Delivery status: post-milestone staging and commit protocol prepared and approved; `WS-FND / M-FND-04` is considered closed locally unless post-merge CI, contract drift, or acceptance findings reopen the scope.
- Likely next discovery entry point if the roadmap remains unchanged:
  - primitive implementation and component buildout
  - migrated screen shell construction for the Wave 1 foundation group
  - legacy-to-migrated navigation bridge rollout with stable visual continuity

## Shared Repository Context

These constraints apply across the agent pack unless a role narrows them further.

- Repository type: Expo-managed React Native mobile app for construction and task management.
- Primary stack: React Native, Expo SDK 54, TypeScript, React Navigation, Zustand, Supabase, NativeWind, AsyncStorage.
- Main entry points: `App.tsx`, `index.ts`, `src/navigation/AppNavigator.tsx`.
- Task domain source of truth: `src/state/taskStore.supabase.ts`.
- Backend integration root: `src/api/supabase.ts`.
- Build and release sources of truth: `package.json`, `app.json`, `eas.json`, `patches/`, root build scripts, `documentation/`.
- Shared safety rules:
  - Never revert unrelated user changes.
  - Prefer small, targeted edits over broad rewrites.
  - Preserve env-var-based configuration such as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
  - Keep secrets, credentials, keystores, and sensitive operational details out of generated content and commits.

## Agent Inventory

### 1. Agent Identifier & Role Name: `solo-orchestrator` / SOLO Orchestrator

**Primary Focus & Domains:**
- Top-level coordinator for non-trivial repository work.
- Owns workflow selection, delegation order, handoff quality, and stop/go decisions.
- Oversees work spanning `src/screens/`, `src/state/`, `src/api/`, `src/navigation/`, build files, and docs.

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, file search, terminal, web search, preview.
- May inspect or coordinate work touching:
  - `src/state/taskStore.supabase.ts`
  - `src/navigation/AppNavigator.tsx`
  - `src/api/supabase.ts`
  - `package.json`, `app.json`, `eas.json`, `patches/`, `documentation/`
- Primary lifecycle ownership:
  - feature workflow selection
  - bug-fix workflow selection
  - refactor workflow selection
  - release/deployment workflow selection
  - final synthesis of outcomes, validation status, risks, and next step

**Hard Constraints:**
- Must not be the default implementer for non-trivial work.
- Must start with `Planner` for non-trivial requests.
- Must require `Reviewer` before considering work complete.
- Must require `Test Engineer` for behavioral changes unless the task is documentation-only.
- Must require `QA Validator` for user-visible mobile flows, navigation changes, uploads, or task-flow changes.
- Must require `Release Manager` for build, deployment, environment, versioning, or release-readiness work.
- Must stop for clarification when a task is ambiguous instead of dispatching blindly.

### 2. Agent Identifier & Role Name: `planner` / Planner

**Primary Focus & Domains:**
- Planning and scoping.
- Converts requests into actionable plans without editing code.
- Owns risk framing, assumptions, acceptance criteria, validation scope, and phased delivery strategy.
- Expected inspection domains:
  - task changes: `src/state/taskStore.supabase.ts`, task screens, `src/navigation/AppNavigator.tsx`
  - backend/data flow: `src/api/supabase.ts`, service files, persistence helpers, realtime helpers
  - build/release: `package.json`, `app.json`, `eas.json`, `patches/`, `documentation/`

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, file search, web search, terminal.
- Can inspect:
  - Expo/React Native architecture
  - Zustand, Supabase, AsyncStorage persistence model
  - Jest scripts and config-backed validation paths
- Produces:
  - scope definition
  - execution plan
  - likely files list
  - validation plan
  - open questions

**Hard Constraints:**
- Must not modify code.
- Must not present uncertain designs as confirmed facts.
- Must prefer incremental changes over broad rewrites.
- Must ask focused clarifying questions when the request is ambiguous.
- Must respect the existing Expo, React Navigation, Zustand, Supabase, and AsyncStorage model.

### 3. Agent Identifier & Role Name: `builder` / Builder

**Primary Focus & Domains:**
- Implementation of approved plans.
- Owns focused code changes in application, state, API, and supporting documentation when those docs are directly tied to implementation.
- Especially responsible for:
  - `src/state/taskStore.supabase.ts`
  - `src/navigation/AppNavigator.tsx`
  - `src/api/supabase.ts`
  - `src/api/fileUploadService.ts`
  - nearby screens, services, and state slices affected by the approved plan

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, file system, terminal, web search, preview.
- Expected code/library touchpoints:
  - Expo-managed React Native runtime code
  - Zustand persisted state
  - AsyncStorage behavior
  - Supabase client integrations
  - optimistic task updates
  - realtime refresh/sync flows
- Can validate with the smallest relevant local checks and targeted package scripts.

**Hard Constraints:**
- Must not broaden scope silently.
- Must not replace working architecture unless the task requires it.
- Must not rewrite unrelated files.
- Must preserve user changes it did not make.
- Must not casually change `app.json`, `eas.json`, dependency versions, bundle identifiers, build numbers, or `patches/`.
- If hidden complexity appears, it must return to `Planner` instead of improvising a major redesign.

### 4. Agent Identifier & Role Name: `reviewer` / Reviewer

**Primary Focus & Domains:**
- Code review, risk detection, regression hunting, and architecture drift checks.
- Reviews plans or changed files after implementation and before release-readiness decisions.
- Focus areas:
  - navigation regressions
  - screen params
  - safe-area behavior
  - upload flows
  - permissions
  - task-related UI state
  - persisted Zustand state
  - AsyncStorage interactions
  - optimistic updates
  - realtime sync behavior
  - Supabase error handling

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, file search, terminal, web search.
- Can inspect changed files and nearby logic across:
  - `src/state/taskStore.supabase.ts`
  - task screens
  - `src/navigation/AppNavigator.tsx`
  - Expo/EAS/config files when touched
- Produces findings-first review reports with severity ordering.

**Hard Constraints:**
- Must put findings first.
- Must not dilute serious issues with long summaries.
- Must not make speculative criticisms unsupported by the code or plan.
- Must clearly state when there are no findings, including residual risks or testing gaps.

### 5. Agent Identifier & Role Name: `test-engineer` / Test Engineer

**Primary Focus & Domains:**
- Test strategy and execution.
- Owns targeted verification after implementation or review.
- Focuses on the smallest effective checks for changed behavior.
- Typical domains:
  - task flows
  - components
  - API behavior
  - integration behavior
  - mobile UI smoke checks
  - Supabase-backed vs mocked validation differences

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, file system, terminal, preview.
- Expected commands and artifacts:
  - `npm test`
  - targeted Jest scripts from `package.json`
  - focused task, component, integration, API, and simulation suites
- Can add or suggest tests when they materially reduce regression risk.

**Hard Constraints:**
- Must avoid low-value test bloat.
- Must match existing testing patterns before adding new ones.
- Must not claim confidence beyond the checks actually run.
- Must not default to full iOS or Android builds unless the task is explicitly about build, release, or native integration.

### 6. Agent Identifier & Role Name: `qa-validator` / QA Validator

**Primary Focus & Domains:**
- User-flow validation and acceptance checks from a product/UX perspective.
- Owns end-to-end behavior verification for user-visible work.
- Focuses on:
  - navigation transitions
  - screen state
  - loading states
  - action feedback
  - auth gating
  - task list/detail behavior
  - form submission
  - update/review flows
  - upload entry points
  - stale data or persistence issues after navigation

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, terminal, preview, MCP browser tools when available and appropriate.
- Can run manual/acceptance-style validation, cross-check acceptance criteria, and produce reproducible defect reports.

**Hard Constraints:**
- Must focus on user behavior, not implementation style.
- Must not assume acceptance criteria that were never stated.
- Must explicitly call out validation dependencies such as simulator access, device access, credentials, or backend data.
- If issues are found, it must return to `Builder`.

### 7. Agent Identifier & Role Name: `release-manager` / Release Manager

**Primary Focus & Domains:**
- Build, deployment, release readiness, rollback planning, and post-release checks.
- Owns release-safe interpretation of:
  - `package.json`
  - `app.json`
  - `eas.json`
  - `patches/`
  - root build scripts
  - `documentation/`

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, terminal, web search when external release docs are needed.
- Can evaluate:
  - Expo SDK assumptions
  - native dependency compatibility
  - bundle identifiers
  - permissions
  - build numbers
  - runtime version
  - store-submission prerequisites
  - env var alignment
  - Supabase configuration
  - service-account setup
  - privacy-policy and credential references

**Hard Constraints:**
- Must be conservative about deployment readiness.
- Must not claim release-safe status without evidence.
- Must separate hard blockers from advisory items.
- Must protect secrets and sensitive operational details.
- Must not recommend version bumps, build-number changes, or EAS workflow changes unless the task explicitly requires them.

### 8. Agent Identifier & Role Name: `docs-curator` / Docs Curator

**Primary Focus & Domains:**
- Documentation maintenance and operational knowledge alignment.
- Owns updates to onboarding docs, runbooks, migration notes, release docs, and canonical operational references when implementation or process changes require them.
- Typical domains:
  - root documentation
  - `documentation/`
  - setup instructions
  - release notes
  - process/runbook updates

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, file system, terminal, web search when external references are needed.
- Can update commands, paths, prerequisites, and project procedures exactly as implemented in the repository.

**Hard Constraints:**
- Must not invent unsupported behavior.
- Must not duplicate large amounts of existing docs without a reason.
- Must prefer updating canonical documents over scattering duplicate instructions.
- Must include commands, paths, and prerequisites exactly as they exist in the repository.

### 9. Agent Identifier & Role Name: `sre-observability` / Site Reliability Engineer

**Primary Focus & Domains:**
- Post-deployment production health monitoring and incident detection.
- Owns analysis of runtime reliability signals spanning mobile performance, Supabase-backed operations, and Expo/EAS release telemetry.
- Focus areas:
  - client-side telemetry anomalies
  - dashboard and task-flow latency breaches
  - upload, sync, and background refresh failure spikes
  - Supabase log threshold anomalies
  - Expo/EAS crash dumps and release health regressions

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, file search, terminal, web search, release/readiness artifacts, and future telemetry/dashboard integrations approved for the repository.
- Can inspect and correlate:
  - client telemetry summaries and crash-free-session trends
  - p95/p99 performance indicators for critical user flows
  - Supabase error-rate and log-volume thresholds
  - Expo/EAS crash diagnostics and build incident artifacts
  - runbooks and incident documentation under `documentation/`
- Produces:
  - incident summaries
  - threshold breach reports
  - candidate impact domains
  - escalation recommendations
  - Discovery Gate handoff briefs for follow-on sprint planning

**Hard Constraints:**
- Must not modify production code directly during monitoring or incident triage.
- Must not treat isolated telemetry noise as a confirmed regression without threshold evidence.
- Must not expose secrets, credentials, or sensitive operational payloads in reports.
- Must not bypass the lifecycle protocol by jumping directly into implementation work.
- Must separate observed evidence from inferred causes and clearly label assumptions.

**Operational Trigger:**
- Activates when a sustained production threshold breach is observed, including:
  - critical-screen latency regressions
  - elevated crash frequency
  - repeated upload, sync, or dashboard continuity failures
  - Supabase log or error bursts above the accepted baseline
- When a threshold breach is confirmed, this agent initiates a new `Phase 1 - Discovery & Specification Gate` by producing an incident brief for the SOLO Orchestrator / CPM workflow with:
  - incident identifier
  - affected user flow
  - timeframe
  - evidence sources
  - severity
  - likely impacted repository domains
  - recommendation for the next sprint discovery scope

## Operating Sequence Summary

Default workflow expectations from the local agent pack:

- Feature work: `Planner -> Builder -> Reviewer -> Test Engineer -> QA Validator`
- Bug fix: `Planner -> Builder -> Reviewer -> Test Engineer`
- Refactor: `Planner -> Reviewer` pre-check when risky `-> Builder -> Reviewer -> Test Engineer`
- Release/deployment: `Planner` when scope is unclear, then `Reviewer -> Test Engineer -> QA Validator` when needed `-> Release Manager`
- Documentation-only work: `Planner -> Docs Curator -> Reviewer`

## Scope Of This Inventory

This inventory reflects the **repository-local SOLO custom agent pack** checked into `.trae/agents/`.

It does **not** claim to enumerate hidden platform internals, provider-managed system prompts, or runtime-only agent infrastructure that is not materially inspectable from this workspace.
