# DB compute / disk I/O spike — pre-RC root-cause (2026-08-20)

**Status:** App-side hygiene landed 2026-08-20 (`RealtimeSyncManager` / `realtimeReconnect` / `DataRefreshManager`). **Close still requires human Dashboard re-measure.**  
**Verdict:** RC is **blocked** until Realtime reconnect/subscribe hygiene is proven quiet.  
**Not the primary cause:** Storage photo bytes / signed-URL minting.

Evidence from Dashboard `pg_stat_statements` + `pg_stat_user_tables` (2026-08-19 evening), plus live auth `HTTP 522` then recovery.

---

## Answer in one paragraph

The spike is **Supabase Realtime subscription churn**, not a leaked REST write loop and not photo Storage I/O. Each logged-in app instance opens **four unfiltered `postgres_changes` channels** (`tasks`, `task_activities`, `projects`, `users`). Maestro `clearState: true` cold-starts, dual-user / multi-sim sessions, AppState foreground resubscribe, and **reconnect-on-CHANNEL_ERROR** (exactly what a 522 origin timeout produces) re-INSERT into `realtime.subscription` thousands of times. REST `tasks` / `task_activities` fetches are present but cheap (~9ms mean, 36 calls). Photo `storage.objects` lookups are cheap (~0.2ms, 681 calls). Maestro **amplifies** the leak; the leak **lives in the app** and will still fire for real customers on flaky networks.

---

## What the Dashboard numbers actually ranked

| Rank by total time | Query / table | Meaning |
|---|---|---|
| 1 | `realtime.list_changes(...)` — 1276 calls, **9714 ms** | WAL poll for every live Realtime subscription |
| 2 | Dashboard catalog (`pg_timezone_names`, extensions, functions) | SQL Editor / Reports, not the mobile app |
| 3 | `INSERT realtime.subscription … ON CONFLICT DO UPDATE` — **3656 + 1216** calls | Clients (re)subscribing, not reading tasks |
| App REST | `SELECT tasks … LIMIT/OFFSET` — 36 calls, ~9.7ms | `fetchTasks` — **not** the spike |
| App REST | `SELECT task_activities …` — 36 calls, ~8.6ms | Unscoped, but still not the spike |
| Storage | `storage.objects` by name — 681 calls, ~0.20ms | Signed-URL path lookup — **not** disk-killing |
| Seq scans | `subscription` idx_scan **5456**, n_live_tup **106** | Many subscribe rows created/updated |
| Seq scans | `companies` 301 seq_scan, idx_scan 0 | `users` → `companies` join in `fetchUsers` (small table; noisy, not fatal) |

`n_live_tup = 0` on `tasks`/`users` in `pg_stat_user_tables` is a stats-visibility artifact (RLS / which schema the report used), **not** proof the tables are empty.

---

## App mechanisms (code)

### 1. Four unfiltered Realtime channels (always-on while authenticated)

`src/utils/RealtimeSyncManager.tsx` mounts from `AppNavigator` after login (intentionally **outside** `WorkspaceBootstrapGate` so Maestro workspace flips do not teardown — comment at AppNavigator ~2408).

Each session:

- `tasks` — `event: '*'` no filter  
- `task_activities` — `INSERT` no filter  
- `projects` — `event: '*'` no filter  
- `users` — `UPDATE` no filter  

RLS still applies to **payload delivery**, but Realtime still maintains **one subscription row per (client, table)** and `list_changes` still walks WAL. Filters like `company_id=eq.<id>` are **not** set.

### 2. Reconnect storm (the leak under outage)

On `CHANNEL_ERROR` / `CLOSED` / `TIMED_OUT`, `scheduleReconnect` tears down all channels and `subscribeAll()` again (`realtimeReconnect.ts`: 1s → 30s cap).

A Cloudflare **522** (origin timeout — observed 2026-08-19 15:30 UTC) makes **every** channel fail. Each failure cycle:

1. 4× `removeChannel`  
2. 4× new `INSERT realtime.subscription`  
3. `list_changes` keeps polling while sockets are half-dead  

That matches thousands of subscription upserts in a short window. This is **not** Maestro-specific: a customer on a bad cell network will do the same.

Foreground path (Maestro / iOS simulator does this constantly): `AppState` background→active **immediately** `removeAllChannels` + `subscribeAll()` with **no debounce** (comment: “soft resubscribe”).

### 3. Read amplification after each Realtime event

| Channel | Follow-on REST |
|---|---|
| `tasks` INSERT/UPDATE | `fetchTaskById` |
| `task_activities` INSERT | `fetchTaskById` |
| `projects` INSERT/UPDATE | **`fetchProjects()` full list** |
| `users` UPDATE | **`fetchUsers()` full list** + `refreshUser()` if self |

`fetchUsers` always joins `companies` (`userStore.supabase.ts`) — explains `companies` seq_scan 301 vs idx_scan 0.

`DataRefreshManager` effect depends on **`[user]`** (object identity), not `user.id`. `refreshUser()` after a `users` UPDATE can remount the 60s poller and fire another **full parallel** `fetchProjects` + `fetchUserProjectAssignments` + `fetchTasks(true)` + `fetchUsers`. `fetchTasks(true)` selects **all** live tasks **and all `task_activities` unscoped**.

Network reconnect (`NetworkSyncManager`) also calls `triggerRefresh()` (2s throttle). Combined with Realtime reconnect, a 522 recovery is a **burst of REST + subscribe**.

### 4. What is *not* leaking

- No evidence of an unbounded SQL write loop on `tasks`.  
- `fetchTasks` / activities REST volume in the captured window is small (36 each).  
- Storage signed-URL minting hits `storage.objects` with index scans, not sequential table scans. Photo **download** is CDN/Storage HTTP, which inflates **egress**, not Postgres disk I/O, unless you mint thousands of URLs (dashboard/task list prefetch can do that — `M-PERF-01` — still secondary here).

---

## Maestro’s role (amplifier, not unique source)

Maestro **does** multiply the leak:

- Most `_boot.yaml` / Section B–E / dual-user boots use **`clearState: true`** → new JS runtime → four new Realtime subscriptions every case.  
- Dual-user gate = **two UDIDs × four channels** at once.  
- Sequential suites (P01–P22, U-series, B–E) = **dozens of subscribe/unsubscribe cycles in an hour**.  
- Simulator AppState flicker (permission sheets, Photos, alerts) hits the **foreground resubscribe** path.  
- Comment in AppNavigator already records Hermes OOM when Realtime was torn down too often under Maestro — the current design **prefers leaving channels up**, which on a sick origin becomes **reconnect spam** instead of OOM.

A single production phone with a flaky network can still recreate the 522 + reconnect storm **without Maestro**. So: **cannot ship RC by “just stop Maestro.”** Stopping Maestro is the **operational** way to calm the project **today**.

---

## Controlled vs uncontrolled

| Hypothesis | Fits evidence? |
|---|---|
| Photo Storage disk I/O | **No** — `storage.objects` cheap; spike is `realtime.*` |
| Maestro-only load | **Partial** — Maestro multiplies subscribe cycles |
| Unscoped `task_activities` REST | **Secondary** — will hurt as data grows; not #1 tonight |
| Realtime reconnect + 4 unfiltered channels | **Yes — primary** |
| Dashboard SQL Editor catalog queries | Noise in `pg_stat_statements`, not mobile outage |

---

## RC gate (must pass before “go live”)

Treat as **closed** only when all are true on the **production** project, with **no Maestro** and **≤2** real devices:

1. `INSERT realtime.subscription` call rate stays low and flat (not thousands/hour).  
2. `realtime.list_changes` total_time is not the #1 statement under idle logged-in clients.  
3. Intentionally kill the socket (airplane mode 30s) → reconnect **backs off** and does **not** stampede REST `fetchTasks`/`fetchUsers`.  
4. One idle logged-in device for 10 minutes: `companies`/`users` seq_scan growth is small (no refreshUser ↔ DataRefresh loop).

Until then: **no commercial RC claim.** Operational cap: 1 phone + 0–1 sim; no parallel Maestro.

---

## Fix order (when implementing — not this investigation)

1. **Realtime:** filter subscriptions (`company_id` / `project_id` where the publication allows); **debounce** AppState resubscribe; **do not** `subscribeAll()` on every channel error independently (already coalesced — keep that); **pause reconnect** after N failures until user foreground; consider single multiplexed channel.  
2. **Stop read storms:** `DataRefreshManager` deps → `user?.id` only; `users` UPDATE must not call full `fetchUsers` + `refreshUser` in a loop; `projects` UPDATE must not full `fetchProjects`.  
3. **REST:** scope `task_activities` by current task IDs / project (`M-DATA-03`).  
4. **Harness:** Maestro default `_boot-no-clear` where isolation allows; never 3+ authenticated sims against prod.

Photo disk cache (`M-PERF-01`) remains **post-RC** unless signed-URL prefetch is proven to dominate `storage.objects` after Realtime is quiet.

---

## Files

- `src/utils/RealtimeSyncManager.tsx`  
- `src/utils/realtimeReconnect.ts`  
- `src/utils/DataRefreshManager.tsx`  
- `src/utils/NetworkSyncManager.tsx`  
- `src/navigation/AppNavigator.tsx` (mount site)  
- `src/state/taskStore.supabase.ts` (`fetchTasks` unscoped activities)  
- `src/state/userStore.supabase.ts` (`fetchUsers` + companies join)  
- `maestro/flows/**/_boot.yaml` (`clearState: true`)

Updated: 2026-08-20
