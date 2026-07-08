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

The canonical documentation hub lives under [`documentation/`](./documentation/README.md), with additional promoted governance and product references in the repo root and `docs/` as listed below.

Start here:

- [`documentation/SOURCE_OF_TRUTH.md`](./documentation/SOURCE_OF_TRUTH.md) - Documentation governance and classification rules
- [`documentation/ROADMAP.md`](./documentation/ROADMAP.md) - Canonical WS/M/S milestone inventory and execution order
- [`AGENTS.md`](./AGENTS.md) - Repository-local agent inventory and workflow context
- [`SOLO_OPERATING_PROCEDURE.md`](./SOLO_OPERATING_PROCEDURE.md) - Canonical operator workflow reference
- [`documentation/SOFTWARE_ARCHITECTURE.md`](./documentation/SOFTWARE_ARCHITECTURE.md) - Canonical system-level architecture reference
- [`documentation/DATABASE_ARCHITECTURE.md`](./documentation/DATABASE_ARCHITECTURE.md) - Canonical Supabase, schema, and persistence architecture reference
- [`docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`](./docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md) - Canonical approved product UI/UX logic and target-state direction
- [`documentation/UI_ARCHITECTURE.md`](./documentation/UI_ARCHITECTURE.md) - Canonical UI ownership, layering, and navigation contract reference
- [`documentation/README.md`](./documentation/README.md) - Canonical docs hub and read order
- [`documentation/INSITE_APP_LATEST.md`](./documentation/INSITE_APP_LATEST.md) - Current product description
- [`documentation/role-permission-matrix.md`](./documentation/role-permission-matrix.md) - Role and permission model

Working delivery docs live under `docs/superpowers/`.
Historical and superseded notes now live under `documentation/history/`.

## Project Context

- Main runtime entry: `App.tsx`, `index.ts`
- Navigation integration: `src/navigation/AppNavigator.tsx`
- Task source of truth: `src/state/taskStore.supabase.ts`
- Backend integration root: `src/api/supabase.ts`
