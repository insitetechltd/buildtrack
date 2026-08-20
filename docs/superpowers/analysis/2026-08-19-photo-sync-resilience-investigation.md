# Photo load + pull/sync resilience — investigation (2026-08-19)

**Status:** App-side M-DATA-03 / M-PERF-01 landed 2026-08-20 (session gate, scoped activities, reconcile, expo-image, persisted signed URLs). Broader visibility hardening stays post-RC. **RC blocker remains M-DATA-04.**

**Triggers:** Slow evidence thumbnails on device and sim; intermittent empty Tasks/Activity after pull-to-refresh (non-repeatable).

---

## Photo slowness (remote evidence)

Private bucket (`buildtrack-files`) since M-SUPABASE-03c D2. Display path:

1. `createSignedUrl` (Supabase) — cached in **in-memory** `Map` only (`fileUploadService.ts`, TTL 3600s).
2. HTTP GET of bytes — list/detail use React Native **`Image`** (no disk cache). Create/edit preview and full-screen use `expo-image` + `memory-disk`.

**Maestro amplifies cold starts:** most flows use `clearState: true` → app reinstall wipes signed-URL cache, NSURLCache, expo-image disk cache, and Zustand task persist (tasks intentionally not persisted — Hermes OOM fix).

**Sim Photos library** (Create/Update picker) is **not** the main bottleneck — fixtures are ~2 KB; DCIM is reused by `ensure-create-task-photo-media.sh` unless `FORCE_PURGE=1`.

---

## Pull / sync returning 0 tasks (intermittent)

| Cause | Mechanism | User-visible |
|-------|-----------|--------------|
| Session race | `fetchTasks` no-ops when `getSessionScopedSupabase()` null; `triggerRefresh` now retries once on force then sets list error | Empty list copy is “Could not load tasks” when fetch failed |
| No task persist | `taskStore` partialize writes `tasks: []` always — cold start has no offline fallback | Empty until first successful fetch |
| Heavy fetch + 10s timeout | `fetchTasks` still pulls **all** loaded `tasks`; activities scoped to those IDs | First fetch can still fail on huge tenants until deeper post-RC hardening |
| Refresh debounce | Non-forced `triggerRefresh` skips if hash unchanged within 30s | Background sync appears stuck |
| Filter vs fetch | Tasks empty copy distinguishes fetch failure vs no matching filters | Honest empty |

**Key files:** `DataRefreshManager.tsx`, `taskStore.supabase.ts` (`fetchTasks`), `supabaseSessionGate.ts`, `ActivityStyleRowCard.tsx`, `fileUploadService.ts`.

---

## Recommended implementation (when scheduled)

### M-DATA-03 — Sync & pull resilience

1. Gate `triggerRefresh` on session (+ short retry/backoff before fail).
2. Surface refresh failure when `tasks.length === 0` (toast / inline banner).
3. Distinguish empty fetch vs filter-empty vs load error in Tasks/Activity copy.
4. Scope or paginate `task_activities` fetch; optional longer timeout for bulk read only.
5. Retry once on `AbortError` / network when no cached tasks.

### M-PERF-01 — Evidence photo performance

1. `expo-image` + `memory-disk` on list thumbnails + `TaskActivityTimeline`.
2. Persist signed-URL cache (AsyncStorage + expiry).
3. Narrow `prefetchSignedUrls` to visible project / screen, not entire tenant.
4. (Optional) Maestro harness: `_boot-no-clear` / resume flows where isolation allows.

---

## Roadmap placement

- **Order:** After commercial RC; idle-parallel with **M-OPS-02** prep (does not block RC).
- **Does not** require schema/auth Human Gate.

---

Updated: 2026-08-19
