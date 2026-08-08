---
alwaysApply: true
---
# LEGACY — Trae exit in progress

Project law for Cursor lives in `.cursor/rules/`. Do not extend this file.
See `documentation/CURSOR_DEV_HARNESS.md`.

# Insite App Project Context

## Stack

- Use Expo-managed React Native patterns first.
- Default to TypeScript for new code.
- Use React Navigation for screen flow, Zustand for app state, Supabase for backend persistence, and NativeWind for styling when the surrounding code already uses it.

## Architecture

- Preserve the existing screen-driven structure in `src/screens/`, store logic in `src/state/`, and service integration in `src/api/`.
- Prefer extending current modules over introducing duplicate stores, duplicate API clients, or new architecture layers without a strong reason.
- Treat `src/navigation/AppNavigator.tsx` as the main navigation integration point.

## App-Specific Guidance

- For task features, prefer `src/state/taskStore.supabase.ts` as the current task source of truth.
- Keep task behavior aligned with the current flows for task creation, assignment, progress updates, review, comments, cancellation, archival, and subtask handling.
- Respect the existing Supabase and AsyncStorage persistence model.

## Change Discipline

- Make focused edits that fit the local style.
- Avoid broad refactors unless explicitly requested.
- Do not change build identifiers, release settings, Expo SDK versions, React Native versions, or dependency strategy unless the task requires it.
- Keep secrets and credential material out of code and docs.

## Verification

- Validate changes with the smallest relevant command, test, or inspection step available.
- For documentation or configuration changes, verify against `package.json`, `app.json`, `eas.json`, and files in `documentation/`.
