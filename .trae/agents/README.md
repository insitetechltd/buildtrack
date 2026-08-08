# SOLO Agent Pack

> **LEGACY (Trae exit in progress — 2026-08-08)**  
> Operational SoT is now Cursor: `documentation/CURSOR_DEV_HARNESS.md`,  
> `.cursor/rules/`, `.cursor/skills/insite-dev/`, and personal skill  
> `~/.cursor/skills/solo-dev-harness/`. Do not extend this Trae pack.  
> Keep this folder read-only until migration is confirmed, then archive/delete.

This folder contains a reusable custom-agent pack for Trae SOLO environments (historical).

## Purpose

Trae custom agents are typically created in the UI, but their prompt design, operating rules, and handoff conventions can live in the repository so the setup is reusable across projects.

This pack provides:

- a recommended agent team
- copy-ready prompts for each agent
- callable identifiers for SOLO orchestration
- tool recommendations
- handoff requirements
- reusable operating procedures

## Recommended Team

- `SOLO Orchestrator`
- `Planner`
- `Builder`
- `Reviewer`
- `Test Engineer`
- `QA Validator`
- `Release Manager`
- optional: `Docs Curator`

## Registration Methods

### Method 1 (Canonical): User-wide skill auto-registration

The SOLO agent team is registered as the **user-wide Trae skill `solo-agents`**
installed at:

```
~/.trae/skills/solo-agents/
```

This is the CANONICAL OPERATIONAL SOURCE OF TRUTH. When this skill is enabled,
all 8 agents appear in the agent picker automatically.

**Contents of the installed skill:**
- `~/.trae/skills/solo-agents/SKILL.md` — skill manifest, agent roster, workflow defaults,
  **marketplace skill synergy table** with overlap resolution rules
- `~/.trae/skills/solo-agents/metadata.json` — structured manifest (version 1.1.0, 8 agent entries,
  related_skills, categories)
- `~/.trae/skills/solo-agents/agents/solo-orchestrator.yaml` — NOT callable, entry coordinator
- `~/.trae/skills/solo-agents/agents/planner.yaml` — Callable + milestone-aware scope planning
- `~/.trae/skills/solo-agents/agents/builder.yaml` — Callable + Maestro UI/automation compatibility rules
- `~/.trae/skills/solo-agents/agents/reviewer.yaml` — Callable + Maestro accessibility audit findings
- `~/.trae/skills/solo-agents/agents/test-engineer.yaml` — Callable + Jest/Maestro layer boundary
- `~/.trae/skills/solo-agents/agents/qa-validator.yaml` — Callable + Maestro keyboard/model/project rules
- `~/.trae/skills/solo-agents/agents/release-manager.yaml` — Callable + bundle-ID safety + submission rules
- `~/.trae/skills/solo-agents/agents/docs-curator.yaml` — Callable + milestone/AGENTS.md maintenance rules

**To verify the skill is loaded:**

1. Open Trae settings → Skills. Look for `solo-agents` in the list. If installed
   via `~/.trae/skills/` it is auto-discovered on reload.
2. If missing: ensure the folder exists at `~/.trae/skills/solo-agents/` then reload the window.
3. Type `@` in the chat input — the 8 SOLO agents should appear alongside the
   built-in "Chat" and "Agent" entries.
4. Use `@SOLO Orchestrator <request>` as the primary entry point for non-trivial
   work. It dispatches the correct specialist workflow automatically.

**Dual-source convention (with AGENTS.md):**
- This folder `.trae/agents/*.md` = MINIMAL human-readable blueprints. Stable,
  copy-ready prompts for the manual UI-creation fallback.
- `~/.trae/skills/solo-agents/agents/*.yaml` = OPERATIONAL enriched definitions.
  These contain exact output format headings, project_memory Maestro rules,
  milestone references, and marketplace skill synergies. YAMLs are a **strict
  superset** of the `.md` prompts.
- When updating agent behavior: **edit the YAMLs first**. Update corresponding
  `.md` files and AGENTS.md inventory ONLY if the core role/focus/constraints
  actually changed — not for minor output-format tweaks.
- AGENTS.md at the repo root is the INVENTORY DOCUMENT that references both
  sources. Update its § Source of truth scanned list when new canonical sources
  appear.

### Method 2: Manual creation (fallback / legacy)

Use this if you need to customize an agent beyond the defaults or if skill-based
registration is not available in your Trae version.

1. Open Trae settings and go to the Agents section.
2. Create a custom agent manually for each file in this folder.
3. Create `SOLO Orchestrator` first and use it as the primary entry point for non-trivial work in this repository.
4. Copy the prompt from the relevant markdown file into the agent prompt field.
5. Enable "Can be called by other agents" for the specialist agents that should participate in SOLO orchestration.
6. Keep `SOLO Orchestrator` as the coordinator and the other agents as callable specialists.
7. Use the recommended English identifier and "When to call" text from each file.
8. Enable the tools listed in the file for that agent.

## Reuse Model

Use this pack in future projects by:

1. copying this folder into the new repository
2. adjusting `AGENTS.md` and `.trae/rules/` for the new project
3. keeping the agent roles and handoff rules mostly unchanged
4. adapting any repository-specific specialization sections inside the agent prompts

## Files

- `solo-orchestrator.md`
- `planner.md`
- `builder.md`
- `reviewer.md`
- `test-engineer.md`
- `qa-validator.md`
- `release-manager.md`
- `docs-curator.md`

See [SOLO_OPERATING_PROCEDURE.md](file:///Volumes/KooDrive/Insite%20App/SOLO_OPERATING_PROCEDURE.md) for the full workflow and [AGENT_TEAM_TEMPLATE.md](file:///Volumes/KooDrive/Insite%20App/AGENT_TEAM_TEMPLATE.md) for reuse in future repos.
