# SOLO Agent Pack

This folder contains a reusable custom-agent pack for Trae SOLO environments.

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

## How To Use In Trae

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
