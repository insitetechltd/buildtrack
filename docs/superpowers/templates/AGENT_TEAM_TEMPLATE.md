# Reusable Agent Team Template

Use this template to bootstrap the same SOLO team in future repositories.

## Step 1: Copy The Reusable Layer

Copy these files into the new project:

- `.trae/agents/README.md`
- `.trae/agents/solo-orchestrator.md`
- `.trae/agents/planner.md`
- `.trae/agents/builder.md`
- `.trae/agents/reviewer.md`
- `.trae/agents/test-engineer.md`
- `.trae/agents/qa-validator.md`
- `.trae/agents/release-manager.md`
- optional: `.trae/agents/docs-curator.md`
- `SOLO_OPERATING_PROCEDURE.md`

## Step 2: Create The Project Overlay

Add or adapt:

- `AGENTS.md`
- `.trae/rules/project-context.md`
- any domain-specific rules under `.trae/rules/`

## Step 3: Create The Agents In Trae

For each agent:

1. Open Trae settings.
2. Go to Agents.
3. Create a custom agent manually.
4. Copy the corresponding prompt file contents.
5. Set the English identifier from the file.
6. Enable "Can be called by other agents" for agents you want SOLO to orchestrate.
7. Enable the recommended tools for that role.

## Default Team

- `SOLO Orchestrator`
- `Planner`
- `Builder`
- `Reviewer`
- `Test Engineer`
- `QA Validator`
- `Release Manager`

## Optional Team Members

- `Docs Curator`

## Minimal Version

For lightweight projects, use only:

- `Planner`
- `Builder`
- `Reviewer`

## Project Overlay Checklist

Before using the pack in a new project, update:

- platform and framework notes
- build and deployment workflow
- testing expectations
- architecture boundaries
- environment-variable conventions
- safety constraints
- any domain-specific module guidance

## Good Defaults

- keep agents reusable
- keep project specifics in rules
- use a coordinator agent to choose the workflow
- prefer narrow responsibilities
- enforce handoff structure
- require evidence-based validation

## Anti-Patterns

Avoid these mistakes:

- putting all project context directly into every agent prompt
- letting `Builder` both plan and approve major architecture changes
- using the top-level orchestrator as the main coder for non-trivial work
- using `Reviewer` only for style feedback
- forcing broad test suites for small changes
- skipping release checks on configuration or deployment work
