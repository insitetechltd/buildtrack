# Trae Migration Summary

## What Was Added

This repository now includes Trae-friendly project guidance in two places:

- `AGENTS.md`
- `.trae/rules/project-context.md`
- `.trae/rules/task-domain.md`
- `.trae/rules/build-and-release.md`

## Why These Files Exist

- `AGENTS.md` provides portable project instructions that Trae and other agent-aware IDEs can reuse.
- `.trae/rules/project-context.md` gives Trae an always-on summary of the app stack, architecture, and safe-edit constraints.
- `.trae/rules/task-domain.md` gives Trae targeted task-management guidance when working on task features.
- `.trae/rules/build-and-release.md` gives Trae targeted build and release guidance when working on Expo, EAS, and dependency configuration.

## Project Analysis Used For This Migration

The rules were derived from the current repository state:

- Expo-managed React Native app
- TypeScript + React Navigation + Zustand + Supabase + NativeWind
- Main task domain centered in `src/state/taskStore.supabase.ts`
- App flow centered in `src/navigation/AppNavigator.tsx`
- Build and release workflow centered on Expo and EAS configuration in `package.json`, `app.json`, `eas.json`, and `documentation/`

## How To Use In Trae

1. Open this repository in Trae.
2. In Trae settings, make sure project rules are enabled.
3. Turn on the option to include `AGENTS.md` in context if it is not already enabled.
4. Start a new chat after changing rules so the latest guidance is picked up cleanly.

## Suggested Next Steps

- Add more module-specific rules if you want Trae to specialize further for uploads, auth, or release operations.
- Add commit-message rules under `.trae/rules/` if you want Trae-generated commit messages to follow a specific convention.
- If you previously relied on another AI IDE, copy any still-useful reusable instructions into either `AGENTS.md` or a focused file under `.trae/rules/`.
