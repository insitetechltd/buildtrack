# Insite App (BuildTrack / Taskr) — Current product description

This document is the **single consolidated description** of the mobile app as implemented in this repository. It was produced by cross-checking the **codebase** (`app.json`, navigation, types, API layer) against the large set of historical Markdown notes in the repo.

**Rule of thumb:** If a standalone `.md` file disagrees with the code, **trust the code**. Many root-level files are incident-specific troubleshooting logs or superseded plans; they are not duplicated here.

---

## 1. Product identity

| Item | Value (from `app.json` / config) |
|------|----------------------------------|
| **Display name** | Taskr |
| **Expo slug** | `buildtrack` |
| **URL scheme** | `taskr` |
| **Expo owner** | `insitetech` |
| **Marketing / repo name** | BuildTrack, Insite App (documentation uses both) |
| **User-facing purpose** | Construction-oriented **project and task management**: assignments, progress, photos, review workflows, and reporting, backed by **Supabase**. |

**Semantic version:** `1.1.3` (`expo.version`).

**iOS:** bundle id `com.buildtrack.app.local`, `buildNumber` **137**, deployment target **16.0**, tablet support enabled.

**Android:** package `com.buildtrack.app`, `minSdkVersion` **24**, `targetSdkVersion` / `compileSdkVersion` **36**, edge-to-edge enabled.

**Over-the-air updates:** `runtimeVersion` **1.0.0**, updates URL points at the Expo project (`u.expo.dev/...`). Native changes require a new store build; JS/asset changes can ship via EAS Update when compatible with the runtime.

---

## 2. Technology stack (runtime)

Derived from `package.json` and `app.json` (exact patch versions may drift with lockfile updates):

- **Expo SDK** ~54, **React** 19.1.x, **React Native** 0.81.x  
- **TypeScript** ~5.8  
- **Navigation:** `@react-navigation` (native stack + bottom tabs; tab bar is hidden in UI but tabs still structure navigation)  
- **State:** Zustand (e.g. `authStore`, `taskStore.supabase`, project filter store)  
- **Backend:** Supabase JS client with AsyncStorage session persistence (`src/api/supabase.ts`)  
- **Styling:** NativeWind / Tailwind-related packages  
- **Media:** `expo-image-picker`, in-app library picker, `expo-camera`, `expo-file-system`, Select Photos light edit (`expo-image-manipulator` + Skia draw bake)  
- **Testing:** Jest, Testing Library (`package.json` scripts)

**Configuration:** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are required for online operation; if missing, the client warns and the app degrades (e.g. offline-oriented behavior per implementation).

---

## 3. Authentication and onboarding

- **Login** is the only auth entry in the main navigator; **`RegisterScreen` is not wired** (commented out in `AppNavigator.tsx`).  
- Comments in code state **self-registration is disabled** for store/policy reasons; **accounts are created by administrators** (aligned with notes like `REGISTRATION_HIDDEN.md`).  
- After login, global **session persistence** and **token refresh** are handled by Supabase + AsyncStorage.

---

## 4. Permissions model (system vs project)

Defined in `src/types/buildtrack.ts` (and related user/assignment types):

- **System permission** (stored in legacy `users.role` / `systemPermission`): **`admin`**, **`manager`**, **`member`**.  
  - **`isAdmin(user)`** is true only for **`admin`**. Admins get a different primary shell (admin dashboard) than non-admins.  
  - **Managers** are elevated for many operations via helpers such as `isManagerOrAdmin`.  
- **Project role** (stored per assignment, e.g. `category` / `projectRole`): `lead_project_manager`, `contractor`, `subcontractor`, `inspector`, `architect`, `engineer`, `worker`, `foreman`, etc.  
  - Same person can differ by project.

Documentation such as `ROLE_SYSTEM_*.md` and `ROLES_VS_CATEGORIES_SUMMARY.md` elaborates history and naming; the **type definitions and `getProjectRole` / `getUserSystemPermission` helpers** are the source of truth.

---

## 5. Tasks, status, and billing

**Unified task statuses** (`TaskStatus` in `buildtrack.ts`):

`new` → `declined` → `accepted` → `in_progress` → `submitted_for_review` → `approved` | `rejected` | `cancelled`

**Billing** (`BillingStatus`): `billable`, `non_billable`, `billed` (see `BILLING_STATUS_FEATURE.md` for product intent; fields live on the task model in types/DB).

**Task categories** include `safety`, `electrical`, `plumbing`, `structural`, `general`, `materials`, `commercial`.

**Activities / audit:** Task lifecycle changes are backed by task activity records in Supabase (`taskStore.supabase.ts` and related migrations/docs such as `TASK_ACTIVITIES_MIGRATION_STATUS.md`).

---

## 6. Navigation and main screens (implemented)

Authenticated app shell (`AppNavigator.tsx`):

- **Background managers:** `DataRefreshManager`, `NetworkSyncManager`, `RealtimeSyncManager` run alongside the navigator for sync and refresh.  
- **Bottom tab bar is hidden** (`tabBarStyle: { display: 'none' }`), but screens are still organized as tabs for programmatic navigation.

**Non-admin users**

- **Dashboard** (stack): home dashboard, task detail, project picker, update progress, add comment, reject task, reassign task, create task, photo selection / viewer / annotation.  
- **CreateTask** (stack): create/edit task flow with photo selection, viewer, annotation.  
- **Reports** (stack): reports screen.  
- **Profile** (hidden tab): profile, **Developer settings**, **Pending users** (administrative approval flows exposed from profile where applicable).  
- **Tasks** (hidden tab): full task list / task detail and the same satellite flows (photos, progress, comments, reject, reassign, create).

**Admin users (`systemPermission === admin`)**

- **AdminDashboard** (stack): admin dashboard, **projects list**, **project detail**, **create project**, **user management**, **DevAdmin** screen.

**Unauthenticated**

- **Login only** (registration stack removed from tree).

---

## 7. Major user-visible capabilities

Consolidated from screens + stores + docs that match the code:

- **Multi-project** work; **project picker** and per-project filtering (project filter store used by dashboard/tasks).  
- **Dashboard** priority/summary **buttons** that set **section + status filters** and navigate to the task list; filter combinations include variants such as `wip`, `wip-overdue`, `received`, `received-overdue`, `reviewing`, `reviewing-overdue`, `assigned`, `assigned-overdue`, `done`, `all` (see `DashboardScreen.tsx` and `DASHBOARD_BUTTONS_FILTER_CRITERIA.md` — if the doc drifts, prefer `DashboardScreen.tsx`).  
- **Task detail**: accept/decline, progress, review actions, **reject** and **reassign** flows, subtasks, attachments.  
- **Photos**: pick/capture, view, **annotate/edit** (IMG.LY).  
- **Comments** and **progress updates** as separate flows.  
- **Reports** tab for reporting UI.  
- **Admin**: projects CRUD surface, **user management**, dev-only **DevAdmin** entry.  
- **Profile**: access to **developer settings** (cache, force sync, debug utilities — see `DEVELOPER_SETTINGS_FEATURE.md`).  
- **Unread-style emphasis:** dashboard tab uses `getUnreadTaskCount` for a badge (even though the tab bar is hidden, logic remains for badge/options).

---

## 8. Build, EAS, and stores (summary)

- **EAS** profiles in `eas.json` include `preview`, `simulator`, **`dev`** (daily Internal TF → DEV), **`production`** (App Store / PROD), etc.; **production** uses store distribution, remote credentials, Android **App Bundle** (`:app:bundleRelease`), iOS **CocoaPods** pinned in config.  
- **Submit** targets include Apple ASC app id and Google Play **service account** JSON path (`google-service-account.json`).  
- Detailed procedural docs live under the repo root (`ANDROID_BUILD_AND_SUBMIT_GUIDE.md`, `EAS_SUBMIT_GUIDE.md`, `APP_STORE_SUBMISSION_CHECKLIST.md`, etc.) and in `documentation/` (`README.md`, build guides). These are **operational runbooks**, not product behavior specs.

**Note:** Root `README.md` lists React Native `0.81.5` while `package.json` uses a `^0.81.4` range; the **lockfile-resolved version** is authoritative for reproducible builds.

---

## 9. Markdown documentation in this repository

- **~185** Markdown files live in **project-maintained** paths (excluding `ios/` vendor trees and `.expo/`). **~219** total including under `ios/` (often third-party).  
- **Categories:**  
  - **Product / behavior** (dashboard filters, task status, rejection workflow, roles, favorites, company selection, billing, etc.)  
  - **Backend / data** (SQL migration summaries, Supabase access, auth user sync)  
  - **Build / release / store** (EAS, keystores, Play Console, TestFlight, screenshots)  
  - **One-off incident reports** (“fix” docs, specific user/project investigations)  
  - **Future / planning** (MCP hub, construction platform integrations, agent automation proposals)  

This file **does not replace** those documents for deep dives (e.g. keystores or a specific SQL fix); it **replaces the need to read them all** for a **current, code-aligned picture of the app**.

---

## 10. Recent release note (v1.1.3 snapshot)

`RELEASE_NOTES_v1.1.3.md` documents a shipped OTA fix: **task accept** failures due to a missing `fetchTasks` import and missing **`accepted_by` / `accepted_at`** DB field mappings in the Supabase layer. That aligns with the **task acceptance** and **audit field** behavior described above.

---

*Generated as a consolidation pass: implementation verified against `app.json`, `package.json`, `eas.json`, `src/navigation/AppNavigator.tsx`, `src/types/buildtrack.ts`, `src/api/supabase.ts`, and `src/screens/DashboardScreen.tsx`.*
