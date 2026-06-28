# BuildTrack

A construction project and task management application built with Expo, React Native, Zustand, and Supabase.

## Quick Start

```bash
npm install
npm start
```

Common commands:

- `npm run ios`
- `npm run android`
- `npm test`
- `npx tsc --noEmit`

## Documentation

Canonical docs now live under [`documentation/`](./documentation/README.md).

Start here:

- [`documentation/SOURCE_OF_TRUTH.md`](./documentation/SOURCE_OF_TRUTH.md) - Documentation governance and classification rules
- [`documentation/README.md`](./documentation/README.md) - Canonical docs hub
- [`documentation/INSITE_APP_LATEST.md`](./documentation/INSITE_APP_LATEST.md) - Current product description
- [`documentation/role-permission-matrix.md`](./documentation/role-permission-matrix.md) - Role and permission model

Working delivery docs live under `docs/superpowers/`.
Historical and superseded notes now live under `documentation/history/`.

## Project Context

- Main runtime entry: `App.tsx`, `index.ts`
- Navigation integration: `src/navigation/AppNavigator.tsx`
- Task source of truth: `src/state/taskStore.supabase.ts`
- Backend integration root: `src/api/supabase.ts`
