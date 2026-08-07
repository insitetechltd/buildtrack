# Cursor Handoff From TRAE (2026-08-06)

> **For Cursor / any agentic IDE after TRAE credit exhaustion:** Read this document from top to bottom in a fresh chat. It contains the exact state, all deliverables completed this session, the 8 SOLO specialist agent workflow (MIGRATED for Cursor — see §6), the Sprint 7 testing environment, hard safety rules, running processes, open questions, and the immediate to-do list. Do NOT start fresh from the README or AGENTS.md alone. TRAE-specific work not yet committed to a branch needs your attention first.

**Goal:** Enable Cursor to pick up this repository exactly where TRAE left off on 2026-08-06, with zero lost context and zero drift between TRAE-specific optimizations (installed SOLO skill, enriched YAML agents, ratified workflow OP, commit gates, milestone gates) and Cursor's own @-agent / custom-instructions / rules system.

**Architecture:** Two deliverables this session: (A) SOLO agent pack installed + enriched on disk at `~/.trae/skills/solo-agents/` + workflow ratified into 8 doc sources, (B) Sprint 7 testing environment fully explained and its release-safety profile + Supabase-safety profile classified. Cursor must reproduce the agent workflow using Cursor Rules + custom instructions, since Cursor does not have TRAE's `@planner` / `@builder` Trae-skill-based agent picker system.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, React Navigation, Zustand, Supabase, NativeWind, AsyncStorage, Maestro (iOS simulator e2e), Jest (unit/integration/parity/simulation/journeys), EAS local builds + App Store Connect submit.

---

## Table of Contents

1. [Session State At Handoff (MANDATORY READ FIRST)](#1-session-state-at-handoff-mandatory-read-first)
2. [Delivered This Session — File Map](#2-delivered-this-session--file-map)
3. [Environment & Running Processes — DO NOT KILL UNINTENTIONALLY](#3-environment--running-processes--do-not-kill-unintentionally)
4. [Milestone / Roadmap Status](#4-milestone--roadmap-status)
5. [Sprint 7 Sandbox — The 10-second Mental Model](#5-sprint-7-sandbox--the-10-second-mental-model)
6. [SOLO Agent Workflow — Cursor Migration (CRITICAL)](#6-solo-agent-workflow--cursor-migration-critical)
7. [Hard Safety Rules (do not violate)](#7-hard-safety-rules-do-not-violate)
8. [Immediate To-Do List (first 10 minutes in Cursor)](#8-immediate-to-do-list-first-10-minutes-in-cursor)
9. [Sprint 7 Maestro — 295-Minute False-Success Lessons (copy to QA rules)](#9-sprint-7-maestro--295-minute-false-success-lessons-copy-to-qa-rules)
10. [Validation Commands Cheat Sheet](#10-validation-commands-cheat-sheet)
11. [TRAE-Specific Artifacts That Need Migration Into Cursor](#11-trae-specific-artifacts-that-need-migration-into-cursor)
12. [Open Questions / Assumptions Log](#12-open-questions--assumptions-log)

---

## 1. Session State At Handoff (MANDATORY READ FIRST)

Three things are true right now:

1. **There are uncommitted changes from this session on disk.**
   - User-level skill directory `/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/` was modified (new icons, new 8 YAML interface keys, new SKILL.md 2-field front-matter, new metadata.json, new skill-config.json entry). These live OUTSIDE the git repo (`~/.trae/` is NOT in `/Volumes/KooDrive/InsiteApp/`). They will survive TRAE close but they are NOT in git.
   - Project-level files inside the repo ARE tracked by git but LIKELY UNCOMMITTED: `SOLO_OPERATING_PROCEDURE.md`, `AGENTS.md Operating Sequence Summary`, `WORKFLOW_TEMPLATES.md`, `FEATURE_KICKOFF_PROMPT.md`, `BUGFIX_KICKOFF_PROMPT.md`, `RELEASE_KICKOFF_PROMPT.md`, `SOLO_KICKOFF_PROMPT.md`, `.trae/agents/README.md Method 1/Method 2`.
   - **Action item in §8:** Run `git status` inside `/Volumes/KooDrive/InsiteApp` first thing. Commit the SOLO workflow doc updates as a single conventional commit.

2. **Metro (Expo dev server) is running on port 8081.**
   - It's running in Terminal 1. See §3.
   - If you re-run Maestro in Cursor it needs this process alive.
   - If you `git stash` or change branches while Metro is running, you'll get stale bundle. Use `curl -X POST http://127.0.0.1:8081/_expo/reload` between scenario runs.

3. **TRAE's @-menu agent registration was attempted but never visually confirmed by the user.**
   - 4 blockers were found and fixed (SKILL.md front-matter, skill-config.json local entry, 9 SVGs created including 8 role icons + root icon avatar, orchestrator icon filename).
   - The user was going to reload TRAE and test @planner appearing in the menu when they reported running out of TRAE credit.
   - **Open assumption**: The 8 SOLO agents are NOT confirmed visible in TRAE's @ menu at time of handoff. In Cursor, you should assume they are NOT registered and reproduce the workflow via Cursor Rules + @-docs pattern instead.

---

## 2. Delivered This Session — File Map

Grouped by where they live. `TRAE-USER` = outside repo, at `~/.trae/`. `REPO-LOCAL` = inside `/Volumes/KooDrive/InsiteApp/` git tree.

### TRAE-USER (not in git — copy to backup or migrate immediately to Cursor rules)

| Path | What it is | Status at handoff |
|---|---|---|
| `/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/SKILL.md` | SOLO skill manifest. v1.1.0 (2-field front-matter spec-compliant: `name:"solo-agents"` + description under 200 chars). Body contains skill roster, workflow synergy table, 13 marketplace-skill to SOLO-agent mapping. | ✅ Final. Front-matter per skill-creator builtin spec. |
| `/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/metadata.json` | Soft manifest matching react-best-practices pattern. Version 1.1.0. Lists 13 related marketplace skills + 8 agents with identifier + callable_by_other_agents + entry_point relative paths. All 8 entry points resolve to real YAML files. | ✅ Validated 100%. |
| `/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/agents/solo-orchestrator.yaml` | Coordinator agent. Autonomy policy ratified (default autonomous, 5-item blocking-questions list only). Feature workflow expanded to 10-step @identifier + per-step skill hooks. Milestone Gate. Release workflow inlines hard safety rules (bundle-id mismatch hard blocker, App Store public checkbox manual). 5 Marketplace skill synergy rules. | ✅ Enriched, v1.1. |
| `/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/agents/planner.yaml` | Adds: Milestone Gate awareness (WS-UX / M-UX-01 active; WS-QA/M-QA-03 active hybrid; WS-QA/M-QA-01/02 + WS-SUPABASE/M-SUPABASE-01 pipeline). Jest vs Maestro layer BOUNDARY routing per TESTING_STRATEGY. | ✅ Enriched, v1.1. |
| `/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/agents/builder.yaml` | Adds: Maestro UI/automation compatibility block (9 rules: accessible=false on modals, keyboardShouldPersistTaps=always, descriptive testIDs, iOS-safe scrolling, 2-line dashboard titles, MAESTRO_TASK_TITLE uniqueness, non-standard .env out of root, rerun-safe bootstrap/idempotent callbacks, dedicated UpdateProgress routes, react-native-skills > react-best-practices priority). | ✅ Enriched, v1.1. |
| `/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/agents/reviewer.yaml` | Adds: Maestro accessibility AUDIT (6 checks: High/Medium/Info/Low severity). Supabase task-title collision audit. Env-file placement audit. | ✅ Enriched, v1.1. |
| `/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/agents/test-engineer.yaml` | Adds: Jest vs Maestro BOUNDARY enforcement ("Maestro executes, Human approves"). Exact run-qa01-suite.sh / run-local.sh commands. MAESTRO_TASK_TITLE handling. Maestro pre-req checks (screenAutomation deep-link, useTaskDetailViewAdapter focus-refetch). | ✅ Enriched, v1.1. |
| `/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/agents/qa-validator.yaml` | Adds: Full Maestro execution model (run-local.sh commands, unique title mandate, post-login project select rule, focus-refetch verification, 4 Maestro KEYBOARD RULES incl. deterministic keyboard dismiss before CTA + dedicated UpdateProgress callback, iOS ACCESSIBILITY CHECKLIST 7 items, rerun-safe worker bootstrap verification). | ✅ Enriched, v1.1. |
| `/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/agents/release-manager.yaml` | Adds: BUILD ID + SUBMISSION SAFETY 5 rules (bundle-id mismatch hard blocker, rerun-safe bootstrap, native routing callback double-init check, App Store public checkbox = MANUAL, M-QA-02 re-verification gate). CURRENT MILESTONE alignment 5 gates. | ✅ Enriched, v1.1. |
| `/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/agents/docs-curator.yaml` | Adds: AGENTS.md CURRENT DELIVERY STATUS maintenance rules (milestone closures, M-QA-02 status gating, source-of-truth list update). | ✅ Enriched, v1.1. |
| `/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/assets/*.svg` (9 files) | 8 unique role-color SVGs + icon.svg (skill avatar). Filenames match YAML `icon_small/large` references exactly. Root-relative to SKILL dir (Trae convention). | ✅ Created this session. Paths validated. |
| `/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/icon.svg` | Gradient SOLO hub skill avatar. Scanned by TRAE "digital avatar discovery" for root skill icon. Redundant copy at assets/icon.svg. | ✅ Created this session. |
| `/Volumes/KooDrive/Users/tristan/.trae/skill-config.json` | **MODIFIED THIS SESSION.** Added `"solo-agents": "local"` to `managedSkills`. Added new `localSkills: { "solo-agents": "/Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents" }` block. Kept 12 existing marketplace entries untouched. | ✅ JSON valid, entries present. |

### REPO-LOCAL (in git tree — CHECK GIT STATUS FIRST)

| Path | What changed | Status |
|---|---|---|
| `SOLO_OPERATING_PROCEDURE.md` lines 11–371 | Major full rewrite of Standard Workflows: added §0 Default Autonomy Policy (ratified 5-item blocking list, batch max 4 questions), display name ↔ @identifier callable table, Milestone Gate before every workflow, COMMIT GATE ordering rule between Reviewer → git-commit skill → Test Engineer, 6 workflow steps with `@identifier [Skill: ...]` syntax, Skill Synergy Hooks Quick Reference 13-row table, Test Engineer exit criteria expanded to explicit 3-layer Jest/Maestro-evidence/QA Validator boundary, QA Validator exit criteria + Maestro keyboard rules + UpdateProgress dedicated callback checklist. | ✅ Must commit. |
| `AGENTS.md § Operating Sequence Summary` lines 293–308 | All 5 workflows + Docs-only rewritten with `@identifier` syntax + marketplace skill hooks + COMMIT GATE notation + Milestone Gate mandatory pre-planner + Autonomy Policy ratified. | ✅ Must commit. |
| `AGENTS.md § Source of truth scanned + Dual-source convention` lines 1–28 | Source-of-truth list now includes the 8 YAML skill files + metadata.json + SKILL.md alongside the 9 .md blueprints. Added Dual-source convention: YAML = operational (authoritative, enriched), .md = minimal (portable blueprint). Update order = YAMLs first, then .md and this inventory only on core role changes. | ✅ Must commit. |
| `docs/superpowers/WORKFLOW_TEMPLATES.md § 0 + § 1` lines 7–51 | Added §0 Agent Identifiers table (role ↔ @identifier ↔ skill hooks). Rewrote Session Kickoff to explicitly route 8 lifecycle steps, Milestone Gate, Autonomy Policy block, Execution Ledger output format (changes + validation + commit SHA + risks). | ✅ Must commit. |
| `docs/superpowers/prompts/SOLO_KICKOFF_PROMPT.md` lines 22–84 | Rewrote Agent workflow policy with @identifier + skill hooks + COMMIT GATE rule. Added MILESTONE GATE section (milestone routing, AGENTS.md + ROADMAP.md read). Added AUTONOMY POLICY section (ratified). Rewrote "When you respond" 7-step output to route skill hooks per stage, ending in Execution Ledger (changes + validation + commit SHA + risks). | ✅ Must commit. |
| `docs/superpowers/prompts/FEATURE_KICKOFF_PROMPT.md` lines 12–16 | Default workflow line now: `@planner [Skill: brainstorming; Skill: writing-plans] → @builder [Skill: executing-plans; Skill: test-driven-development; react-native-skills > react-best-practices] → @reviewer [+ TRAE-code-review parallel] → [COMMIT GATE: git-commit skill ONLY after Reviewer no C/H findings] → @test-engineer → @qa-validator → @docs-curator → @release-manager`. Milestone Gate instruction added. | ✅ Must commit. |
| `docs/superpowers/prompts/BUGFIX_KICKOFF_PROMPT.md` lines 12–17 | Rewritten with bug-specific skill hooks (brainstorming/TRAE-debugger on Planner, TDD+debugger on Builder), COMMIT GATE, Milestone Gate. QA Validator conditional based on user-visible mobile flow class. | ✅ Must commit. |
| `docs/superpowers/prompts/RELEASE_KICKOFF_PROMPT.md` lines 12–20 | Rewritten with Release Manager hard safety rules (bundle-id mismatch Hard Blocker + rerun-safe + App Store public release = MANUAL). COMMIT GATE. MILESTONE GATE: WS-QA/M-QA-02 warning (never close solely on local build passes — master-side re-verification required). | ✅ Must commit. |
| `.trae/agents/README.md` § Registration Methods lines 29–93 | Method 1 now = Canonical user-level skill install at `~/.trae/skills/solo-agents/`. Method 2 = legacy manual UI. Verification steps. Dual-source convention reiterated. | ✅ Must commit. |

### Sprint 7 Deep Dive (doc-only, no code changes this session)

| Item | State |
|---|---|
| Sprint 7 defined as WS-QA M-QA-01 (4 scenarios + 18 screenshots, CLOSED 2026-08-06 18/18) | Confirmed from artifacts, ROADMAP, rubric |
| Sprint 7 sandbox = virtual dataset only (no VM/container) → pure Zustand 6-store injection | Confirmed from source walk sprint7RuntimeSandbox.ts lines 159–216 |
| Sprint 7 initial load NEVER touches Supabase (direct Zustand setState only) | Confirmed |
| Post-load user CTAs (progress update, photo upload) still hit live Supabase → NOT isolated → risk documented | Confirmed |
| Auto-bootstrap DEV-only (App.tsx line 49) → not in release | Confirmed |
| Sprint7 deep-link routes + Dev Settings button → NOT gated on __DEV__ → present in release bundle → release-safety spoofing risk documented + 3 recommended hardening edits proposed | Confirmed, no code edits applied yet |

---

## 3. Environment & Running Processes — DO NOT KILL UNINTENTIONALLY

On the TRAE session side these 3 terminals existed:

| Terminal ID | Shell | CWD | Command | Why it's running | Action in Cursor |
|---|---|---|---|---|---|
| 1 (BUSY) | zsh | `/Volumes/KooDrive/InsiteApp` | `mkdir -p .cache/expo-home; export HOME=.cache/expo-home; export EXPO_USE_METRO_WORKSPACE_ROOT=1; npx expo start --port 8081 2>&1` | **Metro dev server** required for Maestro iOS simulator runs. Running non-interactive with `--non-interactive 2>&1 | tail` wrapper — output is the log. | Keep if you plan to run Maestro in Cursor. Otherwise safe to kill and restart fresh via `scripts/maestro/run-local.sh` (it checks Metro health first anyway). Health URL: `http://127.0.0.1:8081/status` → should return HTTP 200. |
| 13 (BUSY/IDLE — check before killing) | zsh | `/Volumes/KooDrive/InsiteApp` | Earlier this session: `sleep 2; chmod +x /tmp/d7_qav.sh; bash /tmp/d7_qav.sh` — now showing idle. | Unknown — d7_qav.sh was 1-line bash placeholder created by user; looks like user-initiated diagnostic or artifact script. | If still showing idle by the time Cursor opens: first run `cat /tmp/d7_qav.sh` to understand, then decide to kill/keep. |
| 15 (IDLE) | zsh | `/Volumes/KooDrive/InsiteApp` | idle | The "main" free interactive shell for the session. | Use as your primary Cursor terminal for first commands. |

First command to run on Cursor terminal 15:
```bash
cd /Volumes/KooDrive/InsiteApp && echo "=== Metro health (should be 200) ===" && (curl -sS -o /dev/null -w 'HTTP=%{http_code}\n' --connect-timeout 3 http://127.0.0.1:8081/status || echo "Metro NOT reachable") && echo "=== Git status (SHOULD show the 8 SOLO workflow doc files as Modified / Untracked) ===" && git status --short --branch && echo "=== Uncommitted TRAE-user skill (outside repo) snapshot ===" && ls -la /Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents/ && echo "=== skill-config.json solo-agents entry ===" && python3 -c "import json;c=json.load(open('/Volumes/KooDrive/Users/tristan/.trae/skill-config.json'));print('managed[solo-agents]=',c['managedSkills'].get('solo-agents'));print('local[solo-agents]=',c['localSkills'].get('solo-agents'))"
```

---

## 4. Milestone / Roadmap Status

From ROADMAP.md + AGENTS.md Current Delivery Status (cross-checked with Maestro artifacts):

| Milestone | Status | Notes |
|---|---|---|
| WS-UX / M-UX-01 redesign slices S-UX-01A through S-UX-01E2 | **Closed** | Later slices still Pipeline per ROADMAP.md. Mention figma skill for any redesign work. |
| WS-UX / M-UX-01 (overall) | **Active** | Next redesign pipeline after E2 is complete. |
| WS-QA / M-QA-01 Sprint7 User Testing Rubric | **Closed 2026-08-06** | Suite rc=0, 18/18 PNGs captured. Evidence under .cache/maestro-artifacts/qa01-20260806_214425/. |
| WS-QA / M-QA-02 UI Automation Foundation (Maestro) | **Pipeline — DO NOT MARK CLOSED** | Has shipped root Maestro foundation surface + 3 Sprint 7 bootstrap flows + 2 journey flows + run-local.sh wrapper + README. GOVERNANCE RULE from AGENTS.md line 81: stays Pipeline until master-side smoke/bootstrap wrap-up is explicitly re-verified by human. |
| WS-QA / M-QA-03 Automated Confidence & E2E Coverage | **Active Hybrid expansion** | 5 live Supabase Task Core flows shipped (create/assign/progress/completion/photo-upload). Journey harness, fast-regression-vs-confidence docs still Pipeline. |
| WS-SUPABASE / M-SUPABASE-01 | **Pipeline** | Primary focus: schema redesign + metadata migration for primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags. |

### Milestone Gate rule for Cursor

Copy this to Cursor Rules:

> "On EVERY workflow kickoff (feature/bug/refactor/release/docs), before you write the first plan, read AGENTS.md § Current Delivery Status + documentation/ROADMAP.md latest sections. If task touches M-UX-01, M-QA-01/02/03, or M-SUPABASE-01: (1) cite the milestone in scope, (2) route tests correctly per TESTING_STRATEGY.md Jest/Maestro layer rules, (3) on M-QA-02 never mark closed based solely on local passes."

---

## 5. Sprint 7 Sandbox — The 10-second Mental Model

Write this down as your first Cursor scratch-pad note:

### What Sprint 7 IS
- **Pure virtual Zustand dataset.** No VM, no containers, no Supabase schema branch.
- Lives in two files: `src/test-utils/sprint7Seeds.ts` (seed builder + 3 scenario mutators + isolation view) + `src/test-utils/sprint7RuntimeSandbox.ts` (6 store reset + inject + preset loaders + auto-bootstrap).
- Bootstrap options:
  1. **Dev Settings button** → Profile → Developer Settings → Initialize Sprint 7 Staging Sandbox + Tristan/Herman confirm sheet.
  2. **App start auto-bootstrap** → App.tsx line 49, called from auth init finally-block, gated on `__DEV__ && iOS/Android && auth init && sandbox not loaded && user = sprint7 user or unauthenticated`.
  3. **Deep links (AppNavigator.tsx lines 75–200)**: `insite://sprint7-sandbox/:actor` (tristan/herman) + `insite://sprint7-scenario/:preset` (A/B/C). These are NOT gated on `__DEV__` right now → reachable in release builds.
- Dataset: 2 users / 2 cos / 2 projects / 3 assignments / 5 seed tasks.
- Scenarios: A=Rejection Loop (4 shots), B=Overdue Crunch (3 shots), C=Isolation Wall (3 shots), D=iPhone 17 Viewport Audit (8 shots).
- Suite runner: `scripts/maestro/run-qa01-suite.sh` → 4 scenarios sequentially, 6 hardening layers (metro health check / flow rebuild+syntax / 5999 transport retry / semantic shot count / stop-on-fail / inter-scenario cool-down).

### What Sprint 7 is NOT
- **Not a Supabase database.** Initial load NEVER writes or reads Supabase.
- **Not isolated after load for user-initiated CTAs.** The production UpdateProgress route and file upload service still call live Supabase post-init. If you want 100% isolation you need to add `if (isSprint7RuntimeSandboxLoaded()) return noop` guards to supabase.ts + fileUploadService.ts.

### Release-safety profile (current state)
- `__DEV__` auto-bootstrap: auto-stripped in release ✅
- Jest test suites under `__tests__/`: auto-stripped in release ✅
- Maestro flows/scripts/docs: not bundled ✅
- sprint7Seeds.ts + sprint7RuntimeSandbox.ts source: **NOT stripped** — included via `@/test-utils/` imports (not a `__tests__/` exclusion pattern) ⚠️ dead bytes, not dangerous by itself
- **DANGER — Release reachable surface**: (a) AppNavigator.tsx deep-links to sprint7-sandbox and sprint7-scenario → when opened from URL in a signed IPA, calls initializeSprint7RuntimeSandbox → fake dataset visible in a real user app (spoofing risk); (b) DeveloperSettingsScreen Initialize button → if reachable, same spoofing.

### Proposed 3 hardening edits (NOT applied yet — apply before next release if this risk is unacceptable)
```
# 1. Wrap AppNavigator.tsx deep-link imports + dispatch in:
if (__DEV__) { import(...).then(...) } else { linkNames filter removes them }

# 2. Wrap DeveloperSettingsScreen Initialize action onPress in:
if (__DEV__) { handleInitializeSprint7Sandbox() } else { Alert.alert('Unavailable') }

# 3. (most robust) Add resolver blocklist in metro.config.js for NODE_ENV=production:
blockList: [/src\/test-utils\/sprint7(Sandbox|Runtime)\.ts$/]
```

---

## 6. SOLO Agent Workflow — Cursor Migration (CRITICAL)

TRAE exposed SOLO Orchestrator / @planner / @builder etc. as Trae agents via an installed Skill. **Cursor doesn't have that system.** Cursor's equivalents are:
  - **Cursor Rules** (`.cursorrules` file at repo root) → analogous to `SOLO_OPERATING_PROCEDURE.md` + Autonomy Policy + Milestone Gate + Commit Gate + Role Boundaries.
  - **`@`-mention docs feature in Cursor** — any markdown file you drop into `.cursor/rules/` or reference in `.cursorrules` with `@docs/superpowers/prompts/FEATURE_KICKOFF_PROMPT.md` syntax.
  - **Custom Instructions (Cursor Settings → Model → Custom Instructions)** → analogous to WORKFLOW_TEMPLATES §1 Session Kickoff + the SOLO_KICKOFF_PROMPT.
  - **Cursor Composer / Inline Edit** → used per-file the way Builder would.

### Cursor Migration Step 1: Drop a `.cursorrules` file

**Create `/Volumes/KooDrive/InsiteApp/.cursorrules`** with this exact content (copy verbatim; it's the ratified OP condensed):

```rules
# Insite App — Cursor Rules (sourced from SOLO_OPERATING_PROCEDURE.md §0 + AGENTS.md Operating Sequence + TRAE user preferences)
# v1 handoff 2026-08-06

## Stack
- Expo SDK 54 managed React Native, TypeScript first.
- React Navigation (AppNavigator.tsx = main nav point), Zustand for state, Supabase for backend persistence, NativeWind for styling when already in use.
- Jest = unit/integration/parity/simulation/journeys. Maestro = iOS simulator user-flow layer ("Maestro executes, Human approves").
- Build/release: EAS CLI local builds via `build-local.sh` (repo root) + App Store Connect via `build-and-submit.sh` (repo root). Public release checkbox = MANUAL human step.

## Architecture
- Screens in src/screens/, state in src/state/, API integration in src/api/.
- Task feature source of truth: src/state/taskStore.supabase.ts.
- Backend root: src/api/supabase.ts.
- Prefer extending current modules over new architecture layers.

## Mandatory Pre-kickoff gates (run these BEFORE writing plan code on EVERY non-trivial request)
1. Milestone Gate: Read AGENTS.md § Current Delivery Status + documentation/ROADMAP.md. If task touches M-UX-01, M-QA-01/02/03, M-SUPABASE-01: cite milestone in scope; classify tests per TESTING_STRATEGY.md layers; on M-QA-02 never mark closed from local passes alone.
2. Autonomy Policy (ratified): Default = autonomous. Ask user ONLY on: (a) product behavior choices with ≥2 valid outcomes irresolvable from AGENTS.md/.trae/rules/; (b) schema/persistence changes with user-facing consequences; (c) auth/security changes with zero codebase precedent; (d) release/deploy/version/submission/env var decisions; (e) scope expansion > 1 bounded extension beyond original ask. Non-blocking uncertainty → choose repo-aligned default, log as assumption, CONTINUE. If you DO ask, batch max 4 questions per message.
3. Validation Plan: State up front which Jest tests (layered per TESTING_STRATEGY), which Maestro flows (if any), which manual iOS steps, typecheck, lint, build smoke you will run. Do not proceed without this written.

## Workflow selection (choose smallest risk-managed one)
- Feature: Plan [brainstorm first if fuzzy → writing-plans for spec/tasks format] → Build [executing-plans checkpoints, TDD, react-native-skills > react-best-practices for Expo/RN] → Review [+ TRAE-code-review parallel if available] → [COMMIT GATE: only after Reviewer finds zero C/H findings, run conventional commit via git-commit pattern] → Test Engineer [TDD additions, debugger for flakes] → QA Validator [only if user-visible mobile flows changed, iOS simulator] → Docs Curator → Release Manager [only if build/deploy/version touched].
- Bug Fix: Plan [root-cause hypotheses + repro + Jest vs Maestro layer] → Build [smallest fix, TDD, use debugger if runtime reproduction] → Review [+ TRAE-code-review] → [COMMIT GATE] → Test Engineer → QA Validator [only if user-visible mobile flow, nav, upload, auth, task behavior].
- Refactor: Plan [backward compat + verification harness, phased via writing-plans, brainstorm approach] → Reviewer pre-check if risky [+ TRAE-code-review parallel] → Build [phase-by-phase checkpoints, executing-plans] → Review [+ TRAE-code-review] → [COMMIT GATE] → Test Engineer → QA Validator [only if user-visible behavior changed].
- Release: Plan if scope unclear → Review drift+security+bundle-id+runtimVersion audit → [COMMIT GATE if files changed] → Test Engineer Jest smoke + Maestro bootstrap evidence → QA Validator only if user-visible → Docs Curator release notes/runbooks → Release Manager [gh-cli for milestones/tags; ALWAYS: verify app.json/eas.json/App Store Connect bundle-id match (mismatch = HARD BLOCKER); rerun-safe bootstrap check; App Store PUBLIC release checkbox = MANUAL]. Cross-check Milestone Gate status BEFORE marking release-ready.
- Hotfix: Plan fast-scope + rollback included → Build smallest → Review → [COMMIT GATE] → Jest smoke → Release Manager fast deploy + rollback triggers.
- Docs-only: Plan scope of canonical doc updates → Docs Curator [use defuddle pattern from URLs] → Review [technical accuracy check].

## COMMIT GATE (non-negotiable, copied from solo-orchestrator.yaml § Operating rules)
Order: Builder changes → Reviewer findings (no C/H) → git commit (conventional: feat|fix|chore|docs|refactor|test|ci|revert + scope optional + desc) → Test Engineer runs → QA Validator runs.
Never commit pre-Review. Never commit under TODO / partially applied state.
If Reviewer finds 1+ C/H → send back to Builder, NO commit, re-Review.

## Role boundaries (self-impose these even though Cursor has no @-agents)
- Planner plans, does not implement.
- Builder implements approved plans, never self-approves design drift → if design change needed, re-plan step explicitly.
- Reviewer: findings-first report. Check: Maestro UI rules (accessible=false on iOS modals, keyboardShouldPersistTaps=always, descriptive testIDs, 2-line dashboard title cap, dedicated UpdateProgress callback route, rerun-safe bootstrap/idempotent callbacks, MAESTRO_TASK_TITLE uniqueness, non-standard .env outside root). Check navigation regressions, screen params, safe-area, upload flows, permissions, optimistic updates, realtime sync, Supabase error handling, AsyncStorage race windows.
- Test Engineer: smallest relevant checks. NEVER claim Maestro-layer QA signoff. Maestro runs you produce = EVIDENCE ONLY. Signoff block left for human on QA Validator layer.
- QA Validator: runs Maestro scripts on iOS simulator. Cites the 8 Maestro Mobile Preflight from .trae/agents/solo-orchestrator.md lines 71–79 BEFORE first flow.
- Release Manager: ALWAYS checks 5 safety rules before any release-readiness call (see §7 Hard Safety Rules below).
- Docs Curator: updates canonical docs/runbooks/release notes ONLY when implementation changes them. Rejects doc claims unsupported by current code.

## Edit discipline
- Small focused edits. Match local style. No broad refactors unless explicitly requested. Don't revert unrelated user changes.
- Change Discipline from project-context.md is LAW.
- Preserve env var names EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY.
- Don't change build identifiers, Expo SDK, RN versions, dependency strategy, eas.json profiles, app.json bundleIds, build numbers, Runtime Version without explicit ask.
- UI/Maestro rules from builder.yaml § Maestro compatibility are LAW for any UI change that passes through Maestro reachable screens.
- For Maestro flows: cite "Maestro Mobile Preflight 8 gates" before running.

## Output format for completed work (Execution Ledger, non-negotiable)
For every completed task produce:
1. What changed (files, high-level intent)
2. Validation performed (command + pass/fail, layer per TESTING_STRATEGY)
3. Git SHA if committed
4. Risks / unverified areas + assumptions log
```

### Cursor Migration Step 2: Custom Instructions (Settings → Model → Custom Instructions)

Paste the following EXACTLY into Cursor's "Custom Instructions → How would you like the AI to respond?" box:

```text
You are my autonomous senior software engineer inside Cursor. Your job: complete software tasks with minimal input and maximum safe automation, matching the Insite App SOLO Agent workflow specified in .cursorrules exactly.

Ground rules (mirrors TRAE Autonomous Delivery Mode + SOLO_KICKOFF_PROMPT.md):
- Be proactive. Prefer action over discussion. Infer sensible defaults from the codebase, the stack, .cursorrules, SOLO_OPERATING_PROCEDURE.md, AGENTS.md milestone status, TESTING_STRATEGY.md.
- Do NOT stop at planning if the task can be completed safely. Continue until a real done state or a true blocker.
- Perform the Pre-kickoff Milestone Gate + Autonomy Policy check FIRST on every non-trivial request as defined in .cursorrules.
- Write the plan FIRST (via writing-plans pattern spec/tasks/checklist format if multi-step).
- COMMIT GATE is mandatory (reviewer-role pass first → conventional commit → test run). Do not commit pre-review.
- For UI code: prefer react-native-skills patterns over generic React. Use safe-area handling + keyboardShouldPersistTaps=always + descriptive testIDs + accessible=false on iOS modals per Maestro rules.
- For e2e: always cite the 8 Maestro preflight gates before any Maestro run. Use scripts/maestro/run-local.sh as wrapper. Use run-qa01-suite.sh for full Sprint 7 rubric (rebuild flows on by default).
- For release: NEVER report "released to public users" after submit-only runs. App Store Public checkbox = manual human step.
- Always end with Execution Ledger: changes, validation pass/fail, git SHA if committed, remaining risks.
```

### Cursor Migration Step 3: Drop the 4 workflow prompts into `.cursor/rules/`

Cursor allows rule files placed under `.cursor/rules/` to be auto-loaded by the agent. Create 5 files (copies of the canonical docs so updates stay synced):

```
/Volumes/KooDrive/InsiteApp/.cursor/rules/workflow-feature.md   → copy content of docs/superpowers/prompts/FEATURE_KICKOFF_PROMPT.md
/Volumes/KooDrive/InsiteApp/.cursor/rules/workflow-bugfix.md    → copy content of docs/superpowers/prompts/BUGFIX_KICKOFF_PROMPT.md
/Volumes/KooDrive/InsiteApp/.cursor/rules/workflow-release.md   → copy content of docs/superpowers/prompts/RELEASE_KICKOFF_PROMPT.md
/Volumes/KooDrive/InsiteApp/.cursor/rules/workflow-solo.md      → copy content of docs/superpowers/prompts/SOLO_KICKOFF_PROMPT.md
/Volumes/KooDrive/InsiteApp/.cursor/rules/maestro-preflight.md  → copy §9 Sprint 7 Maestro 295-minute lessons (below), verbatim
```

Then reference them in the last line of `.cursorrules`:

```rules
## Cursor rules auto-load
# Workflow-specific rule files under .cursor/rules/ are contextual guidance:
# @.cursor/rules/workflow-feature.md → feature kickoff
# @.cursor/rules/workflow-bugfix.md → bug kickoff
# @.cursor/rules/workflow-release.md → release kickoff
# @.cursor/rules/workflow-solo.md → all-purpose SOLO kickoff
# @.cursor/rules/maestro-preflight.md → 8 Maestro mobile preflight gates + 6 runner hardening layers (Sprint7 M-QA-01 295-min lessons)
```

### Cursor Migration Step 4: Sprint7-specific Cursor Context Snippet

If Cursor has a `Quick Context` / `Project Context` UI, paste this verbatim:

> Sprint7 sandbox = Zustand virtual dataset. Not Supabase. Initial load = safe. Post-load CTAs = still hit live Supabase. Release-spoofing risk from deep links + Dev Settings button currently not `__DEV__` gated. Preferred hardening edits documented in handoff §5 Proposed 3 edits.

---

## 7. Hard Safety Rules (do not violate)

1. **Release Manager bundle-id rule**: Before ANY release-ready status → verify match between app.json `expo.ios.bundleIdentifier` / eas.json build profile `ios.bundleIdentifier` override + the App Store Connect app record you're submitting under. `com.buildtrack.app.local` is the known mismatch risk with App Store Connect public record. Any mismatch = HARD BLOCKER → do not proceed to build/submit.

2. **Public release checkbox**: App Store Connect's "Release this version" / "Public" checkbox is a manual human step. After running `./build-and-submit.sh` → report status as "Submitted to ASC, awaiting manual public release". NEVER say "released to users" or "public" after a submit-only run.

3. **Rerun-safe idempotency gate on bootstrap/native callbacks**: On any new worker bootstrap script, native routing callback, login init, deeplink handler, auth finally-block → must be safe to re-run twice with same state. If on second run it creates duplicate records / double-inits stores / crashes → block before deployment.

4. **Commit Gate ordering**: Builder → Reviewer → git commit → Test Engineer → QA Validator. NEVER commit pre-Review. NEVER reorder these.

5. **M-QA-02 closure rule**: WS-QA/M-QA-02 Maestro foundation status stays Pipeline in ROADMAP.md + AGENTS.md Current Delivery Status UNLESS the master-side smoke/bootstrap wrap-up is explicitly human-verified. Local build passes on any developer machine are NOT sufficient evidence to close this milestone.

6. **Secrets / credentials**: NEVER place EXPO_PUBLIC_SUPABASE_ANON_KEY (anon key is fine and public by design), private Supabase service_role keys, ASC API keys, EAS tokens, .env.secret files, keystore material into docs / repo / chat output. Use env-var patterns only.

7. **Sprint7 deep-link spoofing gate**: Before the next public release ship, apply the 3 hardening edits from §5 unless product owner explicitly decides the risk is low.

8. **Maestro rc=0 is meaningless without evidence**: §9 rule. Enforce on every Maestro run.

---

## 8. Immediate To-Do List (first 10 minutes in Cursor)

Ordered by risk of data loss:

- [ ] **Step 1 — Backup TRAE user skill outside repo.** Run:
  ```bash
  mkdir -p /Volumes/KooDrive/InsiteApp/.trae-backups/2026-08-06-handoff
  cp -R /Volumes/KooDrive/Users/tristan/.trae/skills/solo-agents /Volumes/KooDrive/InsiteApp/.trae-backups/2026-08-06-handoff/
  cp /Volumes/KooDrive/Users/tristan/.trae/skill-config.json /Volumes/KooDrive/InsiteApp/.trae-backups/2026-08-06-handoff/
  echo "Snapshot created at $(date)"
  ls -la /Volumes/KooDrive/InsiteApp/.trae-backups/2026-08-06-handoff/
  ```
  Why? If TRAE is reinstalled later or the user-level `~/.trae/skills/solo-agents` gets wiped, the 8 enriched YAMLs + 9 SVGs + metadata.json + SKILL.md v1.1 are saved in the repo backup folder.

- [ ] **Step 2 — Git status + commit the 8 workflow docs changes.**
  ```bash
  cd /Volumes/KooDrive/InsiteApp
  git status --short --branch
  git add SOLO_OPERATING_PROCEDURE.md AGENTS.md docs/superpowers/WORKFLOW_TEMPLATES.md docs/superpowers/prompts/SOLO_KICKOFF_PROMPT.md docs/superpowers/prompts/FEATURE_KICKOFF_PROMPT.md docs/superpowers/prompts/BUGFIX_KICKOFF_PROMPT.md docs/superpowers/prompts/RELEASE_KICKOFF_PROMPT.md .trae/agents/README.md
  git diff --cached --stat
  git commit -m "docs(solo): ratify v1.1 workflow OP + agent call syntax

  - SOLO_OPERATING_PROCEDURE: ratified autonomy policy, milestone gate,
    commit gate, @identifier syntax per step, 13 skill synergy table
  - AGENTS.md: operating sequence uses @identifier + inline skill hooks,
    dual-source YAML/.md convention, milestone/autonomy preambles
  - WORKFLOW_TEMPLATES: agent identifier table §0, kickoff with
    Milestone Gate + Autonomy + Execution Ledger output format
  - FEATURE/BUGFIX/RELEASE kickoffs: skill hooks per step, commit gate,
    release hard safety rules, M-QA-02 master-verification gate
  - SOLO_KICKOFF: 3 new top-level sections (policy/MILESTONE/AUTONOMY),
    7-step routed output + Execution Ledger
  - .trae/agents/README: Method 1 = canonical user-level skill install"
  ```

- [ ] **Step 3 — Create Cursor migration artifacts (§6):** `.cursorrules`, `.cursor/rules/` copies, Custom Instructions paste.

- [ ] **Step 4 — Metro health + quick smoke:** `curl -sS -o /dev/null -w 'HTTP=%{http_code}\n' http://127.0.0.1:8081/status` then `npm run typecheck` → confirm clean (or apply fixes from last known green state).

- [ ] **Step 5 — Sprint 7 M-QA-01 closure evidence snapshot:** Copy the final 18/18 run artifact dir into docs/superpowers/evidence/ so it's not wiped from `.cache/` temp:
  ```bash
  mkdir -p /Volumes/KooDrive/InsiteApp/docs/superpowers/evidence
  cp -R /Volumes/KooDrive/InsiteApp/.cache/maestro-artifacts/qa01-20260806_214425 /Volumes/KooDrive/InsiteApp/docs/superpowers/evidence/m-qa-01-2026-08-06-18-18-pass
  ls -la /Volumes/KooDrive/InsiteApp/docs/superpowers/evidence/m-qa-01-2026-08-06-18-18-pass
  ```
  Why? `.cache/` is frequently gitignored and may be wiped. ROADMAP says M-QA-01 is closed; the close-out evidence should live in a docs folder.

- [ ] **Step 6 (OPTIONAL) — If you want to confirm TRAE registration bug hypothesis:** On the user's machine with TRAE still open (but no credit, so no assistant work needed, just Settings), navigate to Skills UI. Check for "solo-agents" local card appearing after the fixes we made. If it's still not showing → fallback is Step 3 Cursor migration (which is more reliable anyway for Cursor work), so this step is purely investigative.

---

## 9. Sprint 7 Maestro — 295-Minute False-Success Lessons (copy to QA rules)

Create `.cursor/rules/maestro-preflight.md` with the content below. Apply the 8 preflight gates + 6 runner hardening layers BEFORE ANY Maestro flow invocation.

### 8 Mandatory Preflight Gates (enforced per solo-orchestrator.md lines 71–79)

1. **LOGBOX FAMILY AUDIT**: Open `index.ts` (or entry file calling LogBox.ignoreLogs). If the RED "Failed to open debugger…" banner is suppressed, the GRAY sibling "Open debugger to view warnings." banner MUST be suppressed alongside it. Any unstipulated bottom ~10% banner z-overlaps iPhone 17 Pro Max bottom-tab Pressables, causing XCTest silent tap interception with rc=0. Cherry-picking = bug. This single issue produced >30% of the 5-hour debugging on M-QA-01.
2. **UNIQUE LANDING TESTID**: Every navigation assert must assert a testID that appears ONLY on that target screen (e.g. `tasks-screen__search_section` on Tasks, `developer-settings-screen__root` on DevSettings). Never allow profile-trigger or headers alone; they render on every screen and historically produced rc=0 with 100% wrong scenes.
3. **BOTTOM-TAB NAV NO `- back`**: Explicit sibling tab tap `tapOn id: root-tab__activity | root-tab__tasks`, never `- pressKey: back`. React Navigation bottom-tab root goBack is a no-op.
4. **SPRINT7 PRESET OVERWRITES ACTOR**: If a flow taps both a confirmation-sheet actor AND a preset, cross-check `src/test-utils/sprint7RuntimeSandbox.ts` lines 256–278 for the preset's hardcoded activeActor. Preset re-inits and wipes the confirmation-sheet actor choice; screenshots must be labeled correctly.
5. **SUBCOMMAND FLAG ORDER**: `bash scripts/maestro/run-local.sh [options] test [--reinstall-driver] flow.yaml`. `--reinstall-driver` is subcommand-only. Before `test` → Maestro exits 5999 "Unknown option".
6. **ARTIFACT PATH SCOPE**: Maestro v2 artifacts only live under `/tmp/maestro-tmp-home/.maestro/tests/<timestamp>/`. Do not search `/`, `$HOME`, or repo-wide `.maestro/` for screenshots; findings there are stale.
7. **DASHBOARD RETURN**: From DevSettings or any non-root screen back to Dashboard home, use `launchApp clearState: true` (JS restart; Zustand persist preserved; cost ~90s, 100% reliable). Chevron/back chains are unreliable and leave a 10–20% wrong-state surface.
8. **VISUAL PNG EVIDENCE FIRST BEFORE rc=0**: First action after ANY Maestro run (rc=0 or rc=1) is to visually read screenshot PNG bytes of tab-landing and actor-switch screenshots. Compare title text / list content to filename intent. rc=0 alone is MEANINGLESS. False rc=0 due to banner intercepts produced 5 wasted hours.

### 6 Runner Hardening Layers (enforced in run-qa01-suite.sh)

1. **Metro health-check before EVERY scenario (lines 128–167)**: curl `/status` HTTP 200. 3 attempts + auto-restart if cmd configured.
2. **Flow rebuild + Maestro syntax check pre-suite (lines 182–221)**: Rebuild flows from Python templates → maestro check-syntax per flow → refuse to run if invalid.
3. **5999 / Transport unreachable auto-retry (lines 259–306)**: On "Transport unreachable|connection refused|5999|FlyingFox" → auto-retry once with `--reinstall-driver` to wipe stale XCTest FlyingFox listener.
4. **SEMANTIC SHOT-COUNT GATE (lines 312–328)**: After rc=0 PASS → `find takeScreenshot/*.png | count` → MUST be >= NEED per scenario. If rc=0 but shots=0 → override rc=98 SEMANTIC FAIL + stop. This is the automated version of Gate #8 above that would have FAILED all 4 false-success runs (21:29→21:33) instead of reporting PASS.
5. **Stop-on-fail (lines 362–366)**: First failing scenario → DO NOT run remaining scenarios against dead state; saves expensive tokens.
6. **Inter-scenario cool-down 8s (lines 368–373)**: After `clearState: true` JS restart, pause before next confirmation-sheet tap to avoid a race between JS bundle reload and XCTest tap dispatch.

### First 4 runs proof of the lesson (never forget)
From `.cache/maestro-artifacts/`: 4 runs 21:29→21:33 all rc=0 PASS suite result with screenshots 0/4, 0/10, 0/4, 0/18. Final fixed run 21:44:44 = 18/18 screenshots elapsed 419s real wall time (24s false-pass vs 419s real-pass is your sanity check ratio for future runs).

---

## 10. Validation Commands Cheat Sheet

### Jest (layered per TESTING_STRATEGY.md)
```bash
npm test -- --testPathPattern='src/test-utils/__tests__'       # Sprint7 seeds/runtime unit
npm test -- --testPathPattern='src/__tests__/integration'      # DevSettingsScreen integration + view adapter mocks
npm test -- --testPathPattern='parity'                         # Parity layer (Supabase/Zustand model equivalence)
npm test -- --testPathPattern='journey'                        # Jest journey layer (NOT Maestro)
npm run typecheck                                              # TypeScript full project tsc noEmit
npm run lint                                                   # eslint
```

### Maestro
```bash
# Foundation bootstrap / Sprint7 root flows (M-QA-02 surface):
bash scripts/maestro/run-local.sh test maestro/flows/launch-smoke.yaml
bash scripts/maestro/run-local.sh test maestro/flows/sprint7-open-developer-settings.yaml
bash scripts/maestro/run-local.sh test maestro/flows/sprint7-initialize-sandbox.yaml

# Sprint7 rubric full 4-scenario 18-shot suite (REBUILDS flows + Metro health + 6 runner layers ON):
bash scripts/maestro/run-qa01-suite.sh
# or with custom UDID + stop-on-fail on:
bash scripts/maestro/run-qa01-suite.sh --udid B7B2640C-4738-4F8A-AEEE-5DF3D21D2533 --stop-on-fail 1 --driver-retry 1

# M-QA-03 live Supabase task-core (NOT sprint7 sandbox):
bash scripts/maestro/run-local.sh test maestro/flows/task-core-create-task.yaml
bash scripts/maestro/run-local.sh test maestro/flows/task-core-assign-task.yaml
bash scripts/maestro/run-local.sh test maestro/flows/task-core-update-progress.yaml
bash scripts/maestro/run-local.sh test maestro/flows/task-core-completion.yaml
bash scripts/maestro/run-local.sh test maestro/flows/task-core-photo-upload.yaml
# M-QA-03 critical: use unique MAESTRO_TASK_TITLE per run to avoid Supabase collisions
MAESTRO_TASK_TITLE="MAESTRO_$(date +%Y%m%d_%H%M%S)_regression" bash scripts/maestro/run-local.sh test maestro/flows/task-core-create-task.yaml
```

### Metro
```bash
# Health: HTTP 200 = alive
curl -sS -o /dev/null -w 'HTTP=%{http_code}\n' --connect-timeout 3 http://127.0.0.1:8081/status

# Force reload bundle (between scenario runs, after git changes):
curl -sS -o /dev/null -w 'HTTP=%{http_code}\n' -X POST --connect-timeout 3 http://127.0.0.1:8081/_expo/reload
```

### Release / Build
```bash
# Local EAS production build (per AGENTS.md release manager rules):
bash ./build-local.sh --profile production --platform ios

# Submit IPA to ASC (NEVER marks public release done — only human can):
bash ./build-and-submit.sh --profile production --platform ios --submit asc
```

---

## 11. TRAE-Specific Artifacts That Need Migration Into Cursor

| Artifact | Lives Where | Migrated to Cursor Equivalent | Status |
|---|---|---|---|
| SOLO agent YAML prompts (8 files) with enriched Maestro/Autonomy/Milestone/Skill-synergy rules | `~/.trae/skills/solo-agents/agents/*.yaml` | `.cursorrules` file + 5 copy-synced `.cursor/rules/` files + Custom Instructions | Required → covered in §6 Migration Steps 1/2/3 |
| Installed TRAE marketplace skills (react-native-skills, react-best-practices, brainstorming, writing-plans, executing-plans, TDD, TRAE-code-review, TRAE-debugger, git-commit, gh-cli, figma, agent-browser, defuddle) | TRAE Marketplace bound to TRAE credits | Cursor equivalents: react-native-skills rules → copy from TRAE skill install SKILL.md into `.cursor/rules/react-native.md`; writing-plans → §8 Step 1 plan-then-execute pattern; TRAE-code-review → Cursor self-review step in COMMIT GATE; git-commit → Cursor conventional commit command line per §8 Step 2; gh-cli → terminal calls; figma → (requires Cursor figma plugin or separate figma API key config). | Partial coverage in `.cursorrules`; optional deep migration per skill later |
| TRAE `skill-config.json` local entry | `~/.trae/skill-config.json` | None (Cursor doesn't load TRAE skills). Keep as-is in case user returns to TRAE later. | Not needed for Cursor; already captured in `.trae-backups/` Step 1 backup |
| Autonomous Delivery Mode user profile rule (mandatory pre-acceptance self-analysis gate) | `user_profile.md` project memory → § Custom Instructions + `.cursorrules` Autonomy Policy | Custom Instructions + `.cursorrules` § Mandatory Pre-kickoff gates 1/2/3 | Migrated in §6 Step 1/2 |
| `project_memory.md` lessons (iOS modal accessible={false}, keyboardShouldPersistTaps=always, Maestro unique titles, non-standard .env files outside root, bundle-id mismatch risk, App Store manual step, rerun-safe callbacks, deterministic keyboard dismiss before CTA, dedicated UpdateProgress callback route) | `~/.trae/memory/projects/.../project_memory.md` → in `.cursorrules` Hard Safety Rules + Role Boundaries Builder Maestro compatibility list → Cursor Rules file | Migrated in §7 + Role Boundaries Builder + §9 Gates 1/3/4 |
| `user_confirmed` hard constraint: Jest vs Maestro layer classification BEFORE planning/coding | `project_memory.md` user_confirmed | `.cursorrules` Mandatory Pre-kickoff gate 3 Validation Plan | Migrated in Pre-kickoff Gate 3 |

---

## 12. Open Questions / Assumptions Log

Write these down as first-draft assumptions to revisit with the user on next chat. Do NOT act on them silently.

| # | Assumption / Open Question | Why unresolved | Possible actions in Cursor |
|---|---|---|---|
| A1 | TRAE @-menu SOLO agents were NOT visually confirmed by user (8 rows Planner → Docs Curator visible or not?) | User ran out of TRAE credit before testing reload | Optional Step 6 in §8 (investigative, TRAE-side only). Does NOT block Cursor migration — use the `.cursorrules` + `.cursor/rules/` workflow instead which has identical logic. |
| A2 | Sprint 7 release-spoofing hardening edits (deep links + Dev Settings button `__DEV__` gating) were proposed but not applied. User has not said whether the risk is acceptable for next release. | TRAE session was informational Q&A; no explicit "go fix it" was given | Ask user on first Cursor chat. If yes → apply 3 proposed edits from §5 + run release smoke + Maestro. |
| A3 | project-level `.trae/skills/solo-agents/` was deleted earlier this session (intentional dedup of user-level copy at ~/.trae/skills). Backup created in Step 1 §8 covers user-level copy. Does user want a repo-level synced copy for team sharing? | Open preference | Ask user. If yes → copy user-level → repo → add to git → keep in sync with symlink or manual. |
| A4 | Current master-side M-QA-02 verification status (governance close-out gate item) unknown — last known state Pipeline per AGENTS.md + ROADMAP. Is there a CI or master runner status page we should hook into? | Project-level knowledge gap; not discoverable from current docs | Ask user. If answer is "no CI" → document in release-manager rules "no automated master verification → close M-QA-02 only after manual master checkout + run-local.sh passes on both smoke/bootstrap flows". |
| A5 | Do uncommitted files detected by `git status` at Step 2 §8 match the expected 8 SOLO workflow doc set exactly? Or are there unrelated local changes from a previous session that we accidentally include in the commit? | Can't know until Cursor actually runs the command | Examine `git status` output carefully, use `git add -p` for selective staging if needed, DO NOT blindly run the commit command verbatim if extra files appear. |
| A6 | Is `/tmp/d7_qav.sh` 1-line placeholder actually meaningful? User-initiated, might be a diagnostic they care about. | Unknown contents | First thing on Cursor: `cat /tmp/d7_qav.sh` → decide to keep/debug/ignore. |

---

## End of Handoff Document

Total sections: 12.
Expected first read time on Cursor: < 10 minutes.
Expected total migration work (§8 items 1–6 + §6 migration 1–4): ~30 minutes from cold Cursor open.
