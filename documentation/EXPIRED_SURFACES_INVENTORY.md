# Expired / idle surfaces inventory

**Purpose:** Canonical list of screens, nav routes, menu entries, and helpers that are unused, owner-only, or candidates for purge/reallocation. Do not delete from this list without evidence + a follow-up plan.

**Last updated:** 2026-08-25  
**Related:** Profile declutter (reload data / system status removed); Dev Admin tools restricted to platform owner allowlist.

---

## Parked product surfaces (disabled UI; code may remain)

| Surface | Former entry | Status | Notes |
|---|---|---|---|
| Custom company banner | Company Admin Dashboard strip | **Restored 2026-08-25 as Company Plan entrance** | Tap banner (or fallback “Company Plan” strip) opens Company Plan. Custom image/text still optional. |
| Company Plan on Profile | Profile → Settings → Company plan | **Moved 2026-08-25** | Entrance is Company Admin banner only (Profile row removed). Profile stack `CompanyPlan` route kept for deep links / checkout return. |
| Company scope name strip | Admin Dashboard + User Management (“Stark Industry” / “Showing … from your company only”) | **Removed 2026-08-25** | UI strip + `AdminOverviewHero` usage removed; adapter `companyScope` may remain unused in contracts until a later cleanup. |

---

## Removed from Profile UI (2026-08-25) — code may still exist

| Surface | Former entry | Code still present? | Notes |
|---|---|---|---|
| Reload Data | Profile → Settings | Yes — `handleRefreshData` in `useProfileViewAdapter` (dead path unless re-wired) | Pull-to-refresh / store fetch remain on field screens |
| System Status | Profile bottom block | Yes — connection check + `systemStatusItems` contract may be emptied/removed | Env + Supabase ping were display-only |

---

## Owner-only / platform-superuser (keep, not general users)

| Surface | Path | Gate | Status |
|---|---|---|---|
| Owner Console | Profile → Owner Console → Monitoring / Economics / Tenant ops | `isPlatformSuperuser` | Active M-OPS-01 |
| Developer Settings | Profile stack `DeveloperSettings` | Platform superuser only (was `__DEV__` avatar/Profile) | Idle for field users; sandbox/preset tools |
| Dev Admin | Admin dashboard `DevAdmin` | `__DEV__` + Company management | Environment switcher / legacy tools — candidate to fold into Owner Console |

Allowlist: `src/config/platformSuperusers.ts`.

---

## Screens / routes — purge or reallocate candidates

| Surface | Location | Why flagged | Suggested later action |
|---|---|---|---|
| `DeveloperSettingsScreen` | `src/screens/DeveloperSettingsScreen.tsx` | Sprint7 sandbox presets; not used in day-to-day RC | Keep owner-only or merge into Owner → Tenant ops |
| `useDeveloperSettingsViewAdapter` | `src/ui/viewAdapters/useDeveloperSettingsViewAdapter.ts` | Same | Same |
| `DevAdminScreen` | `src/screens/DevAdminScreen.tsx` | Overlaps Owner Console; `__DEV__` only | Reallocate under Owner Console or delete after Owner parity |
| `useDevAdminViewAdapter` | `src/ui/viewAdapters/useDevAdminViewAdapter.ts` | Same | Same |
| `WorkflowGapsScreen` | Profile / Owner Monitoring | Still linked from Owner Console | Keep until monitoring KPIs replace it |
| `PendingUsersScreen` | Profile stack | Legacy approve flow; invites may supersede | Audit usage vs invite-user Edge; purge if unused |
| Add Comment path | `S-UX-01R` plan | Dead field path; Update Description is SoT | Retire screen/nav post-RC per plan |
| Photo Annotation route | removed in `S-UX-01Q2` | Already uninstalled | Confirm no residual deep links |
| Legacy `taskStore.ts` | `src/state/taskStore.ts` | Not SoT — use `taskStore.supabase.ts` | Do not extend; eventual delete |

---

## Nav / menu wiring quirks

| Item | Behavior | Flag |
|---|---|---|
| Avatar → Developer Settings | Must not show for non-owners | Gate with `isPlatformSuperuser` |
| Dashboard / Tasks `showDeveloperSettingsShortcut` | Was `__DEV__` | Align to platform superuser |
| Admin Dashboard → Dev Admin | `__DEV__` only | Inventory for Owner Console merge |

---

## Theme

| Item | Notes |
|---|---|
| `useThemeStore` | Persisted light/dark |
| Dark palette SoT | `src/theme/colors.ts` + `documentation/audit/database` N/A — UI: `src/theme/` |
| Progressive dark: | Profile + shell first; field screens adopt `dark:` / semantic tokens over time |

---

## How to use this list

1. Before adding a new “admin / debug” surface, check this inventory and Owner Console first.
2. Purge PRs should cite a row here and update this file in the same commit.
3. Do not resurrect Reload Data / System Status on Profile without product GO.
