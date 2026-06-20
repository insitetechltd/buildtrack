# CI Workflows

## Overview

This repository uses a 4-workflow automated testing matrix to keep the codebase stable, catch regressions early, protect merges into shared branches, and monitor long-running coverage health.

Together, these GitHub Actions workflows provide:

- fast feedback on feature branches and pull requests
- a post-merge sanity check on `main` and `develop`
- nightly full-confidence validation
- weekly coverage tracking and artifact retention

## The Automation Matrix

| Workflow File | Trigger Condition | Target Branches / Cadence | Executed Commands |
|---|---|---|---|
| `ci-pull-requests.yml` | `pull_request`, `push` | PRs targeting `main` or `develop`; direct pushes to `feature/**` and `bugfix/**` | `npm run test:auth`, `npm run test:projects`, `npm run test:regression` |
| `ci-post-merge.yml` | `push` | Direct pushes to `main` and `develop` | `npm run test:auth`, `npm run test:projects`, `npm run test:regression` |
| `ci-nightly.yml` | `schedule` | Every night at `0 2 * * *` UTC | `npm run test:all` |
| `ci-weekly.yml` | `schedule` | Every Sunday at `0 3 * * 0` UTC | `npm run test:coverage` |

## Required Secrets & Environment Variables

The workflows are currently designed to run against mocked test paths, but they already include the environment plumbing needed for future live-environment expansion.

### GitHub Secret

- `SLACK_WEBHOOK_URL`
  - Type: GitHub Actions secret
  - Used by:
    - `ci-nightly.yml`
    - `ci-post-merge.yml`
  - Purpose:
    - sends failure notifications when nightly or post-merge guardrail runs break
  - Current behavior:
    - if this secret is not configured, the workflows fall back to emitting a GitHub Actions error log message

### Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL`
  - Type: workflow environment variable, optionally overridden by GitHub repository variables
  - Current behavior:
    - defaults to a safe placeholder value in CI
  - Purpose:
    - reserved for future live Supabase-aware CI expansion if tests or scripts begin reading Expo public configuration

- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - Type: workflow environment variable, optionally overridden by GitHub secrets
  - Current behavior:
    - defaults to a safe placeholder value in CI
  - Purpose:
    - reserved for future live Supabase-aware CI expansion if tests or scripts begin reading Expo public configuration

- `EXPO_NO_DOTENV=true`
  - Type: workflow environment variable
  - Used by all workflows
  - Purpose:
    - prevents local `.env` resolution from drifting CI behavior
    - keeps the CI environment deterministic and isolated from developer machine config

## Local Development Alignment

To stay aligned with the CI strategy, developers should run the smallest relevant checks locally before pushing.

### Recommended Local Commands

- Before opening a PR:
  - `npm run test:regression`

- If touching auth or project store logic:
  - `npm run test:auth`
  - `npm run test:projects`

- If touching task workflows:
  - `npm run test:tasks`
  - `npm run test:integration`

- If touching uploads or file services:
  - `npm run test:uploads`

- If touching components or task-related screens:
  - `npm run test:components`

### Good Team Habit

Use `npm run test:regression` as the default local pre-PR checkpoint. It mirrors the core gated business workflow protection used in CI and is the fastest reliable way to catch task, upload, UI, and integration regressions before opening a pull request.

## Related Files

- [TESTING_STRATEGY.md](file:///Volumes/KooDrive/Insite%20App/TESTING_STRATEGY.md)
- [ci-pull-requests.yml](file:///Volumes/KooDrive/Insite%20App/.github/workflows/ci-pull-requests.yml)
- [ci-post-merge.yml](file:///Volumes/KooDrive/Insite%20App/.github/workflows/ci-post-merge.yml)
- [ci-nightly.yml](file:///Volumes/KooDrive/Insite%20App/.github/workflows/ci-nightly.yml)
- [ci-weekly.yml](file:///Volumes/KooDrive/Insite%20App/.github/workflows/ci-weekly.yml)
