# UI Architecture & Ownership Rules

This document defines the ownership boundaries and contract expectations for the current hybrid UI stack (legacy screens + migrated primitives + view adapters).

## Source Of Truth Boundaries

### Screens (`src/screens/`)

Screens own:
- Layout composition, styling, and screen-level interaction wiring
- Calling view adapters and rendering their output
- Navigation triggers via callbacks passed down from navigators/wrappers

Screens must not own:
- Supabase read/write logic
- Zustand persistence logic
- Cross-screen orchestration state that belongs in stores

### View Adapters (`src/ui/viewAdapters/`)

View adapters own:
- Transforming store/service state into UI-ready models and primitive contracts
- Providing screen action callbacks that encapsulate non-navigation behavior
- Memoizing derived data that is expensive or frequently recomputed

View adapters must not own:
- Navigation calls (`navigation.navigate(...)`)
- Direct React Native layout composition

### State (`src/state/`)

State modules own:
- Domain state, selectors, and mutations
- Persistence behavior (AsyncStorage and related helpers)
- Supabase-backed source-of-truth coordination for domain entities

State modules must not own:
- UI layout concerns
- Navigation concerns

### API / Services (`src/api/`)

API modules own:
- Supabase client integration and service-level calls
- Request shaping, response parsing, and error mapping for backend interactions

API modules must not own:
- UI state or screen state
- Navigation concerns

## Adapter Output Contract Expectations

When a screen is migrated to the view-adapter contract model, the adapter output should include:
- `screenId`: stable identifier for the screen contract
- `readiness`: navigation readiness gating (loading/ready/stale semantics)
- `continuity`: continuity contract for cross-navigation data stability

The screen consumes the adapter output and renders the appropriate loading/empty/stale shells without re-implementing the underlying gating logic.

## Navigation Typing Rules

- `src/navigation/navigationTypes.ts` is the source of truth for route params.
- Navigation wrappers in `src/navigation/AppNavigator.tsx` must not use `any`-typed route/navigation props.
- Navigation helper functions should accept typed navigation surfaces and avoid varargs `any[]` signatures.

## Parallel-Work Separation Rule

Avoid mixing unrelated ownership changes in the same change set:
- UI/screen/layout work should not be bundled with store persistence changes unless required for the same behavior.
- Navigation typing changes should not be bundled with feature behavior changes.
- Performance refactors (e.g. list virtualization) should preserve existing behavior and avoid cross-layer rewrites.

