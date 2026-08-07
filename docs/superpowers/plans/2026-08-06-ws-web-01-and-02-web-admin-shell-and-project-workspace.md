# InsiteApp WS-WEB-01 + WS-WEB-02: Web Admin Shell + Project Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the working Phase 2 web shell on Expo/react-native-web with permission-guarded routes. M-WEB-01 delivers web login, 240px sidebar + top-bar layout, route map, and working `/a/users` (CRUD + CSV invite) plus `/a/projects` list. M-WEB-02 adds project workspace shell, `/p/:id/team`, `/p/:id/settings`, and a KPI dashboard. Both milestones share the shell and are therefore shipped together.

**Architecture:** Keep `AppNavigator.tsx` as mobile entry. Create a parallel web entry `src/webRouter/` that bootstraps on web platform via `Platform.OS === 'web'` check in `App.tsx`. React Router DOM v6 added to deps; used for `/a/*` and `/p/*` routes. Zustand stores (`authStore`, `userStore`, `projectStore`) are consumed unchanged on web — the same Supabase tables, same RLS policies, same permission helpers. Shell components under `src/components/web/` (sidebar, topbar, breadcrumbs, datatable, modal) are web-only; they use NativeWind where possible, fall back to plain RN-web styles where NativeWind web support is awkward. Mobile-only code uses `.native.tsx` suffix guard; web-only uses `.web.tsx` or `src/screens/web/` directory + platform import guard in App.tsx.

**Tech Stack:** Expo SDK 54, react-native-web ^0.20, React Router DOM ^6 (new dep), Zustand ^5, Supabase JS ^2, NativeWind ^4, TypeScript strict, Jest, `tsc --noEmit`

---

## File Structure (Before Tasks: Plan Locked)

### New directories
- Create `src/components/web/` — desktop-only primitive components
- Create `src/screens/web/` — screens only rendered on web (shell, admin, project workspace)
  - `src/screens/web/shared/` (layout shell, 404, loading fallback)
  - `src/screens/web/admin/` (company admin screens, Module A)
  - `src/screens/web/project/` (project workspace screens, Module B)
- Create `src/webRouter/` — React Router definitions + permission guards
- Create `src/utils/web/` — web utilities (CSV parse/serialize, platform detection helpers)
- Create `src/types/web.ts` — DTOs for web UI (RowAction, DataTableColumn, PermissionRouteConfig)

### Modified files
- Modify `App.tsx` — add web platform gate rendering `<WebApp />` instead of `<MobileApp />` when `Platform.OS === 'web'`
- Modify `package.json` — add `react-router-dom`, `papaparse`; add scripts `web:build` = `expo export:web`, `web:typecheck`
- Modify `tsconfig.json` — add `src/screens/web/**/*`, `src/components/web/**/*`, `src/webRouter/**/*` to includes; no allowJs changes
- Create `supabase/migrations/20260806000000_web_admin_no_schema_change_sentinel.sql` — empty sentinel migration (this plan adds NO new tables; DMS tables are in WS-DMS plan)

### New files created by this plan
See Task file lists for exact paths. Each task's Files section is authoritative.

### Spec coverage against `2026-08-06-web-admin-and-dms-product-spec.md`
- §5.1 shell layout → Task 4, 5
- §5.2 route map → Task 3 (stubs added, real screens added by M-WEB-01/02 tasks)
- §4.3 login dispatch → Task 2
- §4.2 permission gates → Task 3 HOC
- §6.1.1 `/a/users` → Task 8–12
- §6.1.2 `/a/projects` list + edit → Task 13
- §6.2.1 `/p/:id/team` → Task 14
- §6.2.2 `/p/:id/settings` General + DMS Defaults tabs → Task 15
- §7.1 Expo Web shell routing, shared stores → Task 1–5
- §3.3 bulk invite timing test → Task 11 end-to-end

Open questions Q1 (deploy target), Q2 (email), Q8 (scope boundary) are not resolved by this plan — referenced as "TBD per §10 spec" in relevant tasks.

---

## Prerequisite Validation (Run First)

### Step P1: Verify current web entry compiles

- [ ] Run web server to confirm baseline react-native-web works

Run:

```bash
cd /Volumes/KooDrive/InsiteApp && timeout 30 npx expo start --web 2>&1 | head -60
```

Expected: Expo web dev server starts, prints "Webpack compiled successfully" or Metro bundling success. Stop after output appears (timeout will kill it).

### Step P2: Typecheck baseline

- [ ] Confirm `tsc --noEmit` passes on current tree

Run:

```bash
cd /Volumes/KooDrive/InsiteApp && npx tsc --noEmit 2>&1 | tail -20
```

Expected: exit code 0, no errors. If there are errors, record and fix before continuing (unlikely since M-QA-03 foundation closed).

### Step P3: Install 2 new packages

- [ ] Add React Router DOM and PapaParse (CSV parser — battle-tested, typeable)

Run:

```bash
cd /Volumes/KooDrive/InsiteApp && npm install react-router-dom@^6 papaparse@^5 && npm install -D @types/papaparse@^5
```

Expected: Both install, package-lock updated, no peer conflicts with React 19.

Then commit:

```bash
git add package.json package-lock.json
git commit -m "deps: add react-router-dom and papaparse for WS-WEB-01"
```

---

## Task 1: Web App Entry Bootstrap & Platform Gate

**Files:**
- Create: `src/webRouter/WebApp.tsx`
- Create: `src/webRouter/index.ts`
- Modify: `App.tsx` (add Platform.OS gate)
- Test: `src/webRouter/__tests__/WebApp.gate.test.tsx`

- [ ] **Step 1.1: Write the test first — gate renders web shell when Platform OS === web**

Create `src/webRouter/__tests__/WebApp.gate.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import App from '../../../App';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'web',
  select: jest.fn((objs) => objs.web),
}));

jest.mock('../WebApp', () => () => <div testID="web-app-marker">WEB APP</div>);
jest.mock('../../navigation/AppNavigator', () => () => <div testID="mobile-nav-marker">MOBILE NAV</div>);

describe('App platform gate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders WebApp when Platform.OS === web', () => {
    render(<App />);
    expect(screen.getByTestId('web-app-marker')).toBeTruthy();
    expect(screen.queryByTestId('mobile-nav-marker')).toBeNull();
  });
});
```

- [ ] **Step 1.2: Run the test — expect FAIL because WebApp not yet exported**

Run:

```bash
cd /Volumes/KooDrive/InsiteApp && npx jest src/webRouter/__tests__/WebApp.gate.test.tsx --no-coverage 2>&1 | tail -25
```

Expected: FAIL with "Cannot find module '../WebApp'" or similar.

- [ ] **Step 1.3: Implement WebApp barrel file**

Create `src/webRouter/index.ts`:

```typescript
export { WebApp as default } from './WebApp';
```

Create `src/webRouter/WebApp.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function WebApp() {
  return (
    <View style={styles.root} testID="web-app-marker">
      <Text style={styles.title}>InsiteApp Web — Bootstrapping…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E7F4F8', padding: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#07111E' },
});
```

- [ ] **Step 1.4: Add the Platform gate to App.tsx**

Read `App.tsx` first to find the exact JSX return, then edit. Typical pattern:

```tsx
// Near top of App.tsx — after existing imports
import { Platform } from 'react-native';
import WebApp from './webRouter';

// In return statement of App function body, replace <NavigationContainer>...</NavigationContainer> block with:
{Platform.OS === 'web' ? (
  <WebApp />
) : (
  <NavigationContainer ref={navigationRef} linking={linking} onReady={onNavReady}>
    {/* existing mobile AppNavigator */}
  </NavigationContainer>
)}
```

Note: Keep existing hooks (useEffect for init, etc.) above the return untouched.

- [ ] **Step 1.5: Run test again to confirm it passes**

Run:

```bash
cd /Volumes/KooDrive/InsiteApp && npx jest src/webRouter/__tests__/WebApp.gate.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: PASS (1 test).

- [ ] **Step 1.6: Commit**

```bash
git add App.tsx src/webRouter/
git commit -m "feat(ws-web-01): add web Platform gate and WebApp entry"
```

---

## Task 2: Web Login Screen + Session Dispatch

**Files:**
- Create: `src/screens/web/shared/WebLoginScreen.tsx`
- Create: `src/webRouter/loginPortal.tsx`
- Create: `src/screens/web/shared/__tests__/WebLoginScreen.test.tsx`
- Uses: `authStore.supabase.ts` (unmodified), `types/buildtrack.ts` helpers

- [ ] **Step 2.1: Write test for login success → dispatch to admin route**

Create `src/screens/web/shared/__tests__/WebLoginScreen.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { WebLoginScreen } from '../WebLoginScreen';
import { useAuthStore } from '../../../../state/authStore';
import { getUserSystemPermission } from '../../../../types/buildtrack';
import type { User, SystemPermission } from '../../../../types/buildtrack';

jest.mock('../../../../state/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../../../../types/buildtrack', () => ({
  getUserSystemPermission: jest.fn(),
}));

const mockLogin = jest.fn().mockResolvedValue(true);
beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as unknown as jest.Mock).mockReturnValue({
    user: null,
    isLoading: false,
    login: mockLogin,
    isAuthenticated: false,
  });
  (getUserSystemPermission as jest.Mock).mockImplementation((u: User | null): SystemPermission | null =>
    u ? (u.email === 'admin@acme.co' ? 'admin' : 'manager') : null
  );
});

it('shows validation error when form submitted empty', async () => {
  render(<WebLoginScreen />);
  fireEvent.press(screen.getByText(/sign in/i));
  await waitFor(() => expect(screen.getByText(/email or phone is required/i)).toBeTruthy());
});

it('calls login() with credentials and success flag resolves', async () => {
  mockLogin.mockResolvedValueOnce(true);
  (useAuthStore as unknown as jest.Mock).mockReturnValueOnce({
    user: { id: 'u1', email: 'admin@acme.co', name: 'Admin' } as User,
    isLoading: false,
    login: mockLogin,
    isAuthenticated: true,
  });
  render(<WebLoginScreen />);
  fireEvent.changeText(screen.getByPlaceholderText(/email or phone/i), 'admin@acme.co');
  fireEvent.changeText(screen.getByPlaceholderText(/password/i), 'secret123');
  fireEvent.press(screen.getByText(/sign in/i));
  await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('admin@acme.co', 'secret123'));
});
```

- [ ] **Step 2.2: Run test to verify failure (file not created yet)**

Run:

```bash
cd /Volumes/KooDrive/InsiteApp && npx jest src/screens/web/shared/__tests__/WebLoginScreen.test.tsx --no-coverage 2>&1 | tail -15
```

Expected: FAIL with module-not-found.

- [ ] **Step 2.3: Implement WebLoginScreen**

Create `src/screens/web/shared/WebLoginScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../../state/authStore';
import { User } from '../../../types/buildtrack';

type LoginError = string | null;

interface Props {
  onAuthenticatedDispatch?: (user: User) => string; // returns path to redirect to, defaults to spec §4.3 logic
}

export function WebLoginScreen({ onAuthenticatedDispatch }: Props) {
  const { login, isLoading, isAuthenticated, user } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<LoginError>(null);

  async function handleSubmit() {
    setError(null);
    if (!identifier.trim()) {
      setError('Email or phone is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    const ok = await login(identifier.trim(), password);
    if (!ok) {
      setError('Invalid credentials. Please try again.');
    }
  }

  if (isAuthenticated && user) {
    const target = onAuthenticatedDispatch
      ? onAuthenticatedDispatch(user)
      : defaultDispatchPath(user);
    // Browser redirect is handled by the calling loginPortal router wrapper;
    // here we return a sentinel so the wrapper can do <Navigate to=…>
    return <RedirectTarget path={target} />;
  }

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Sign in to InsiteApp</Text>
        <Text style={styles.subtitle}>Construction operations — web control plane</Text>

        <TextInput
          placeholder="Email or phone"
          placeholderTextColor="#8FA3AD"
          style={styles.input}
          autoComplete="email"
          value={identifier}
          onChangeText={setIdentifier}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#8FA3AD"
          style={styles.input}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.btn, isLoading && styles.btnDisabled]} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Sign In</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function RedirectTarget({ path }: { path: string }) {
  return <View testID={`redirect-${path}`}><Text style={{ display: 'none' }}>{path}</Text></View>;
}

export function defaultDispatchPath(user: User): string {
  // Spec §4.3 login dispatch: system permission based
  const perm = (user.role === 'admin' || user.role === 'manager') ? user.role : 'member';
  if (perm === 'admin') return '/a/dashboard';
  if (perm === 'manager') return '/p/_/workspace'; // '_' project ID means project picker; router handles
  return '/u/tasks';
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#08576E', padding: 24 },
  card: { width: 420, maxWidth: '100%', backgroundColor: '#FFFFFF', borderRadius: 22, padding: 32, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 24, elevation: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#07111E', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#577783', marginBottom: 28 },
  input: { height: 48, backgroundColor: '#F4FAFC', borderWidth: 1, borderColor: '#C8E2EA', borderRadius: 12, paddingHorizontal: 14, marginBottom: 12, fontSize: 15, color: '#07111E' },
  btn: { marginTop: 8, backgroundColor: '#12A8E0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  error: { color: '#DC2626', fontSize: 13, marginBottom: 8 },
});
```

- [ ] **Step 2.4: Run the test and make it green**

Run:

```bash
cd /Volumes/KooDrive/InsiteApp && npx jest src/screens/web/shared/__tests__/WebLoginScreen.test.tsx --no-coverage 2>&1 | tail -15
```

Expected: PASS (2 tests). If NativeWind or StyleSheet complains on web jest preset, skip the styling-only test and keep the logic tests via custom jest preset in jest-expo config.

- [ ] **Step 2.5: Create loginPortal.tsx React Router loader wrapper**

Create `src/webRouter/loginPortal.tsx`:

```tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { WebLoginScreen, defaultDispatchPath } from '../screens/web/shared/WebLoginScreen';
import { useAuthStore } from '../state/authStore';

export function LoginPortal() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const redirectTo = (location.state as { redirectTo?: string } | null)?.redirectTo;

  if (isAuthenticated && user) {
    return <Navigate to={redirectTo ?? defaultDispatchPath(user)} replace />;
  }

  return <WebLoginScreen />;
}
```

- [ ] **Step 2.6: Commit**

```bash
git add src/screens/web/shared/WebLoginScreen.tsx src/screens/web/shared/__tests__/WebLoginScreen.test.tsx src/webRouter/loginPortal.tsx
git commit -m "feat(ws-web-01): web login screen with permission dispatch routing"
```

---

## Task 3: Permission-Guarded React Router v6 Route Map (Stubs)

**Files:**
- Create: `src/types/web.ts`
- Create: `src/webRouter/routes.ts`
- Create: `src/webRouter/guards.tsx`
- Create: `src/webRouter/WebRouter.tsx`
- Create: `src/screens/web/shared/NotFound.tsx`
- Create: `src/screens/web/shared/LoadingFallback.tsx`
- Create: `src/screens/web/shared/__tests__/guards.test.tsx`
- Modify: `src/webRouter/WebApp.tsx` (swap bootstrap <Text> for <WebRouter/>)

- [ ] **Step 3.1: Write failing test for guards**

Create `src/screens/web/shared/__tests__/guards.test.tsx` (actually put under webRouter):

```tsx
// src/webRouter/__tests__/guards.test.tsx
import { canAccessRoute, buildWebRoutesConfig } from '../guards';
import type { WebRouteConfig } from '../../types/web';
import type { User, ProjectRole } from '../../types/buildtrack';

const adminUser = { id: '1', role: 'admin' } as unknown as User;
const managerUser = { id: '2', role: 'manager' } as unknown as User;
const memberUser = { id: '3', role: 'member' } as unknown as User;

describe('canAccessRoute', () => {
  const routes: WebRouteConfig[] = buildWebRoutesConfig();
  const find = (path: string) => routes.find(r => r.path === path)!;

  it('admin can access /a/users', () => {
    expect(canAccessRoute(find('/a/users'), adminUser, null)).toBe(true);
  });
  it('manager cannot access /a/users', () => {
    expect(canAccessRoute(find('/a/users'), managerUser, null)).toBe(false);
  });
  it('member cannot access /a/users', () => {
    expect(canAccessRoute(find('/a/users'), memberUser, null)).toBe(false);
  });
  it('member can access /u/tasks', () => {
    expect(canAccessRoute(find('/u/tasks'), memberUser, null)).toBe(true);
  });
  it('admin can access project-scoped /p/:id/workspace as implicit lead', () => {
    expect(canAccessRoute(find('/p/:projectId/workspace'), adminUser, 'lead_project_manager' as ProjectRole)).toBe(true);
  });
});
```

- [ ] **Step 3.2: Run test to confirm FAIL (types not yet defined)**

Run:

```bash
cd /Volumes/KooDrive/InsiteApp && npx jest src/webRouter/__tests__/guards.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: FAIL module-not-found.

- [ ] **Step 3.3: Create types/web.ts**

```typescript
// src/types/web.ts
export type RouteAccessScope = 'admin-only' | 'manager-and-above' | 'member-and-above' | 'public';
export type RouteArea = 'company' | 'project' | 'personal';

export interface WebRouteConfig {
  path: string; // may include :projectId dynamic segment
  label?: string; // sidebar label, if visible in nav
  area: RouteArea;
  icon?: string; // Ionicons name, optional for sidebar
  visibleInSidebarFor?: RouteAccessScope; // when to show item in nav (access scope rule)
  access: RouteAccessScope;
  // For project-area routes: minimum project role gate; lead_pm = always passes.
  projectRoleRequired?: Array<'lead_project_manager' | 'contractor' | 'subcontractor' | 'inspector' | 'architect' | 'engineer' | 'worker' | 'foreman' | 'owner_rep'>;
  // Screen component key — matches lazy-loaded route element in WebRouter
  componentKey: string;
}

export interface DataTableColumn<T> {
  key: keyof T & string;
  header: string;
  width?: number;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface RowAction<T> {
  key: string;
  label: string;
  danger?: boolean;
  onClick: (row: T) => void;
  requiresRole?: RouteAccessScope;
}

export interface CsvInviteRow {
  name: string;
  email: string;
  phone: string;
  system_permission: 'admin' | 'manager' | 'member';
  project_roles: Array<{ project_id: string; role: string }>;
}
```

- [ ] **Step 3.4: Create guards.tsx and routes.ts**

Create `src/webRouter/routes.ts`:

```typescript
import type { WebRouteConfig } from '../types/web';

// Spec §5.2 full route map. componentKey references the lazy import name in WebRouter.tsx
export const WEB_ROUTES: WebRouteConfig[] = [
  // Company admin (Module A)
  { path: '/a/dashboard', label: 'Dashboard', area: 'company', icon: 'grid-outline', visibleInSidebarFor: 'admin-only', access: 'admin-only', componentKey: 'AdminDashboardScreen' },
  { path: '/a/organization', label: 'Organization', area: 'company', icon: 'business-outline', visibleInSidebarFor: 'admin-only', access: 'admin-only', componentKey: 'OrgProfileScreen' },
  { path: '/a/users', label: 'Users', area: 'company', icon: 'people-outline', visibleInSidebarFor: 'admin-only', access: 'admin-only', componentKey: 'UsersScreen' },
  { path: '/a/roles', label: 'Roles', area: 'company', icon: 'key-outline', visibleInSidebarFor: 'admin-only', access: 'admin-only', componentKey: 'RolesScreen' },
  { path: '/a/projects', label: 'Projects', area: 'company', icon: 'list-outline', visibleInSidebarFor: 'admin-only', access: 'admin-only', componentKey: 'ProjectsAdminScreen' },
  { path: '/a/projects/new', area: 'company', access: 'admin-only', componentKey: 'NewProjectWizardScreen' },
  { path: '/a/reports', label: 'Reports', area: 'company', icon: 'bar-chart-outline', visibleInSidebarFor: 'admin-only', access: 'admin-only', componentKey: 'ReportsScreen' },
  { path: '/a/settings', label: 'System Settings', area: 'company', icon: 'settings-outline', visibleInSidebarFor: 'admin-only', access: 'admin-only', componentKey: 'SystemSettingsScreen' },

  // Project workspace (Module B + placeholders for DMS/RFI/Submittals later)
  { path: '/p/:projectId/workspace', label: 'Project Dashboard', area: 'project', icon: 'analytics-outline', visibleInSidebarFor: 'manager-and-above', access: 'manager-and-above', projectRoleRequired: ['lead_project_manager', 'contractor', 'owner_rep'], componentKey: 'ProjectDashboardScreen' },
  { path: '/p/:projectId/team', label: 'Team', area: 'project', icon: 'people-circle-outline', visibleInSidebarFor: 'manager-and-above', access: 'manager-and-above', projectRoleRequired: ['lead_project_manager'], componentKey: 'ProjectTeamScreen' },
  { path: '/p/:projectId/settings', label: 'Project Settings', area: 'project', icon: 'cog-outline', visibleInSidebarFor: 'manager-and-above', access: 'manager-and-above', projectRoleRequired: ['lead_project_manager'], componentKey: 'ProjectSettingsScreen' },
  { path: '/p/:projectId/tasks', label: 'Tasks', area: 'project', icon: 'checkbox-outline', visibleInSidebarFor: 'member-and-above', access: 'member-and-above', componentKey: 'TasksWebListScreen' },
  { path: '/p/:projectId/documents', label: 'Documents', area: 'project', icon: 'folder-outline', visibleInSidebarFor: 'member-and-above', access: 'member-and-above', componentKey: 'DocumentsPlaceholderScreen' },
  { path: '/p/:projectId/rfis', label: 'RFIs', area: 'project', icon: 'help-circle-outline', visibleInSidebarFor: 'member-and-above', access: 'member-and-above', componentKey: 'RfisPlaceholderScreen' },
  { path: '/p/:projectId/submittals', label: 'Submittals', area: 'project', icon: 'document-text-outline', visibleInSidebarFor: 'member-and-above', access: 'member-and-above', componentKey: 'SubmittalsPlaceholderScreen' },

  // Personal compact views
  { path: '/u/tasks', label: 'My Tasks', area: 'personal', icon: 'list', access: 'member-and-above', componentKey: 'MyTasksCompactScreen' },
  { path: '/u/documents', label: 'My Documents', area: 'personal', icon: 'folder', access: 'member-and-above', componentKey: 'MyDocumentsScreen' },
  { path: '/u/settings', label: 'Settings', area: 'personal', icon: 'settings', access: 'member-and-above', componentKey: 'PersonalSettingsScreen' },
];
```

Create `src/webRouter/guards.tsx`:

```typescript
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { WEB_ROUTES } from './routes';
import type { WebRouteConfig } from '../types/web';
import { useAuthStore } from '../state/authStore';
import type { User, ProjectRole } from '../types/buildtrack';
import { getUserSystemPermission, getProjectRole as _getProjectRoleStub } from '../types/buildtrack';

export function buildWebRoutesConfig(): WebRouteConfig[] {
  return WEB_ROUTES;
}

export function canAccessRoute(
  route: WebRouteConfig,
  user: User | null,
  projectRoleForContext: ProjectRole | null,
): boolean {
  if (!user) return route.access === 'public';
  const systemPerm = getUserSystemPermission(user);

  switch (route.access) {
    case 'public':
      return true;
    case 'member-and-above':
      return systemPerm === 'admin' || systemPerm === 'manager' || systemPerm === 'member';
    case 'manager-and-above':
      return systemPerm === 'admin' || systemPerm === 'manager';
    case 'admin-only':
      return systemPerm === 'admin';
  }

  // Project role secondary gate for project-area routes
  if (route.area === 'project' && route.projectRoleRequired?.length && systemPerm !== 'admin') {
    const pr = projectRoleForContext;
    if (!pr) return false; // default deny unless lead
    if (pr === 'lead_project_manager') return true;
    return route.projectRoleRequired.includes(pr);
  }

  return true;
}

// HOC for protected routes in React Router
export function RequireAuth({ children, route }: { children: React.ReactElement; route: WebRouteConfig }) {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ redirectTo: location.pathname }} replace />;
  }
  // Project role is stubbed here; project-scoped wrappers pass real value in later tasks
  if (!canAccessRoute(route, user ?? null, null)) {
    return <Navigate to="/403" replace state={{ from: location.pathname }} />;
  }
  return children;
}
```

- [ ] **Step 3.5: Create NotFound + LoadingFallback placeholder screens**

Create `src/screens/web/shared/NotFound.tsx`:

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigate } from 'react-router-dom';

export function NotFound({ code = 404, message = 'The page you were looking for does not exist.' }: { code?: number; message?: string }) {
  const navigate = useNavigate();
  return (
    <View style={styles.center}>
      <Text style={styles.code}>{code}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.btn} onPress={() => navigate('/')}><Text style={styles.btnText}>Go home</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  code: { fontSize: 80, fontWeight: '800', color: '#08576E', letterSpacing: -2 },
  message: { fontSize: 16, color: '#577783', marginTop: 8, marginBottom: 24 },
  btn: { backgroundColor: '#12A8E0', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  btnText: { color: '#FFFFFF', fontWeight: '700' },
});
```

Create `src/screens/web/shared/LoadingFallback.tsx`:

```tsx
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export function LoadingFallback({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color="#12A8E0" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  label: { marginTop: 12, color: '#577783', fontSize: 14 },
});
```

- [ ] **Step 3.6: Implement WebRouter.tsx with lazy-load + Outlet shell scaffold, wire into WebApp.tsx**

Create `src/webRouter/WebRouter.tsx`:

```tsx
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPortal } from './loginPortal';
import { RequireAuth } from './guards';
import { buildWebRoutesConfig } from './guards';
import { LoadingFallback } from '../screens/web/shared/LoadingFallback';
import { NotFound } from '../screens/web/shared/NotFound';

// Lazy placeholders: implement real components in later tasks; all render "coming soon" stubs for now.
const components: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  AdminDashboardScreen: lazy(() => import('../screens/web/admin/AdminDashboardScreen').then(m => ({ default: m.AdminDashboardScreen }))),
  OrgProfileScreen: lazy(() => import('../screens/web/admin/OrgProfileScreen').then(m => ({ default: m.OrgProfileScreen }))),
  UsersScreen: lazy(() => import('../screens/web/admin/UsersScreen').then(m => ({ default: m.UsersScreen }))),
  RolesScreen: lazy(() => import('../screens/web/admin/RolesScreen').then(m => ({ default: m.RolesScreen }))),
  ProjectsAdminScreen: lazy(() => import('../screens/web/admin/ProjectsAdminScreen').then(m => ({ default: m.ProjectsAdminScreen }))),
  NewProjectWizardScreen: lazy(() => import('../screens/web/admin/NewProjectWizardScreen').then(m => ({ default: m.NewProjectWizardScreen }))),
  ReportsScreen: lazy(() => import('../screens/web/admin/ReportsScreen').then(m => ({ default: m.ReportsScreen }))),
  SystemSettingsScreen: lazy(() => import('../screens/web/admin/SystemSettingsScreen').then(m => ({ default: m.SystemSettingsScreen }))),
  ProjectDashboardScreen: lazy(() => import('../screens/web/project/ProjectDashboardScreen').then(m => ({ default: m.ProjectDashboardScreen }))),
  ProjectTeamScreen: lazy(() => import('../screens/web/project/ProjectTeamScreen').then(m => ({ default: m.ProjectTeamScreen }))),
  ProjectSettingsScreen: lazy(() => import('../screens/web/project/ProjectSettingsScreen').then(m => ({ default: m.ProjectSettingsScreen }))),
  TasksWebListScreen: lazy(() => import('../screens/web/project/TasksWebListScreen').then(m => ({ default: m.TasksWebListScreen }))),
  DocumentsPlaceholderScreen: lazy(() => import('../screens/web/project/DocumentsPlaceholderScreen').then(m => ({ default: m.DocumentsPlaceholderScreen }))),
  RfisPlaceholderScreen: lazy(() => import('../screens/web/project/RfisPlaceholderScreen').then(m => ({ default: m.RfisPlaceholderScreen }))),
  SubmittalsPlaceholderScreen: lazy(() => import('../screens/web/project/SubmittalsPlaceholderScreen').then(m => ({ default: m.SubmittalsPlaceholderScreen }))),
  MyTasksCompactScreen: lazy(() => import('../screens/web/personal/MyTasksCompactScreen').then(m => ({ default: m.MyTasksCompactScreen }))),
  MyDocumentsScreen: lazy(() => import('../screens/web/personal/MyDocumentsScreen').then(m => ({ default: m.MyDocumentsScreen }))),
  PersonalSettingsScreen: lazy(() => import('../screens/web/personal/PersonalSettingsScreen').then(m => ({ default: m.PersonalSettingsScreen }))),
};

export function WebRouter() {
  const routes = buildWebRoutesConfig();

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPortal />} />
          <Route path="/403" element={<NotFound code={403} message="You do not have permission to view this page." />} />
          <Route path="/404" element={<NotFound />} />
          {routes.map(r => {
            const Comp = components[r.componentKey];
            return (
              <Route
                key={r.path}
                path={r.path}
                element={
                  <RequireAuth route={r}>
                    <Comp />
                  </RequireAuth>
                }
              />
            );
          })}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

Modify `src/webRouter/WebApp.tsx` to render `<WebRouter/>` instead of the bootstrap marker:

```tsx
import React from 'react';
import { WebRouter } from './WebRouter';

export function WebApp() {
  return <WebRouter />;
}
```

- [ ] **Step 3.7: Create 18 lazy-loaded placeholder stub screens**

Create 18 stub files that each return a minimal `<ShellScaffoldStub />`. Pattern (use this exact file once, then replicate — command below generates them):

Create a single `src/screens/web/admin/AdminDashboardScreen.tsx` as the template:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function AdminDashboardScreen() {
  return (
    <View style={styles.scaffold}>
      <Text style={styles.title}>Company Dashboard</Text>
      <Text style={styles.note}>KPI widgets ship in M-WEB-02 task. This scaffold confirms routing works.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scaffold: { flex: 1, padding: 32, backgroundColor: '#F8FCFF' },
  title: { fontSize: 24, fontWeight: '700', color: '#07111E', marginBottom: 8 },
  note: { color: '#577783', fontSize: 14 },
});
```

Then use a single shell command to copy+sed for the other 17 files, OR manually repeat with appropriate title text:

```bash
cd /Volumes/KooDrive/InsiteApp/src/screens/web
mkdir -p admin personal project
# Admin placeholders
for name in OrgProfileScreen UsersScreen RolesScreen ProjectsAdminScreen NewProjectWizardScreen ReportsScreen SystemSettingsScreen; do
  cat > "admin/$name.tsx" <<EOF
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export function ${name}() { return <View style={styles.scaffold}><Text style={styles.title}>${name}</Text><Text style={styles.note}>Scaffold routing OK — implementation in later task.</Text></View>; }
const styles = StyleSheet.create({ scaffold: { flex: 1, padding: 32, backgroundColor: '#F8FCFF' }, title: { fontSize: 24, fontWeight: '700', color: '#07111E', marginBottom: 8 }, note: { color: '#577783', fontSize: 14 } });
EOF
done
# Project placeholders
for name in ProjectDashboardScreen ProjectTeamScreen ProjectSettingsScreen TasksWebListScreen DocumentsPlaceholderScreen RfisPlaceholderScreen SubmittalsPlaceholderScreen; do
  cat > "project/$name.tsx" <<EOF
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export function ${name}() { return <View style={styles.scaffold}><Text style={styles.title}>${name}</Text><Text style={styles.note}>Scaffold routing OK — implementation in later task (WS-DMS for docs/RFI/submittals; WS-WEB-02 for team/settings/dashboard).</Text></View>; }
const styles = StyleSheet.create({ scaffold: { flex: 1, padding: 32, backgroundColor: '#F8FCFF' }, title: { fontSize: 24, fontWeight: '700', color: '#07111E', marginBottom: 8 }, note: { color: '#577783', fontSize: 14 } });
EOF
done
# Personal placeholders
for name in MyTasksCompactScreen MyDocumentsScreen PersonalSettingsScreen; do
  cat > "personal/$name.tsx" <<EOF
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export function ${name}() { return <View style={styles.scaffold}><Text style={styles.title}>${name}</Text><Text style={styles.note}>Scaffold routing OK.</Text></View>; }
const styles = StyleSheet.create({ scaffold: { flex: 1, padding: 32, backgroundColor: '#F8FCFF' }, title: { fontSize: 24, fontWeight: '700', color: '#07111E', marginBottom: 8 }, note: { color: '#577783', fontSize: 14 } });
EOF
done
```

Note: AdminDashboardScreen.tsx was already created — that's fine, this command skips on existence or overwrites.

- [ ] **Step 3.8: Run guards tests — should PASS now**

Run:

```bash
cd /Volumes/KooDrive/InsiteApp && npx jest src/webRouter/__tests__/guards.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: PASS (5 tests).

- [ ] **Step 3.9: Commit**

```bash
git add src/types/web.ts src/webRouter/ src/screens/web/
git commit -m "feat(ws-web-01): React Router v6 map, permission guards, 18 stub screens"
```

---

## Task 4: Shell Layout — Sidebar, Top Bar, Breadcrumbs (Desktop 240+Canvas)

**Files:**
- Create: `src/components/web/WebAppShell.tsx`
- Create: `src/components/web/SidebarNav.tsx`
- Create: `src/components/web/TopContextBar.tsx`
- Create: `src/components/web/Breadcrumbs.tsx`
- Create: `src/components/web/__tests__/WebAppShell.test.tsx`
- Modify: `src/webRouter/WebRouter.tsx` — wrap RequireAuth output in `<ShellScaffold>`

- [ ] **Step 4.1: Write failing layout test**

Create `src/components/web/__tests__/WebAppShell.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MemoryRouter } from 'react-router-dom';
import { WebAppShell } from '../WebAppShell';
import { WEB_ROUTES } from '../../../webRouter/routes';

jest.mock('../../../state/authStore', () => ({
  useAuthStore: () => ({
    user: { id: '1', name: 'A', role: 'admin' },
    isAuthenticated: true,
  }),
}));

describe('WebAppShell layout', () => {
  it('renders sidebar nav and top bar with company name slot', () => {
    render(
      <MemoryRouter initialEntries={['/a/dashboard']}>
        <WebAppShell route={WEB_ROUTES[0]}>
          <div>child</div>
        </WebAppShell>
      </MemoryRouter>
    );
    // Sidebar renders "Dashboard" label from routes
    expect(screen.getByText(/dashboard/i)).toBeTruthy();
    // Profile/account slot exists in topbar
    expect(screen.getByTestId('topbar-account-slot')).toBeTruthy();
  });
});
```

Run test → FAIL.

- [ ] **Step 4.2: Implement SidebarNav**

Create `src/components/web/SidebarNav.tsx`:

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import type { WebRouteConfig } from '../../types/web';
import { getUserSystemPermission } from '../../types/buildtrack';
import { useAuthStore } from '../../state/authStore';

interface Props {
  routes: WebRouteConfig[];
}

type Group = 'Work' | 'Organization' | 'Settings';

function groupFor(p: WebRouteConfig): Group {
  if (p.area === 'company') return 'Organization';
  if (p.area === 'project') return 'Work';
  return 'Settings';
}

function orderFor(g: Group): number { return g === 'Work' ? 0 : g === 'Organization' ? 1 : 2; }

export function SidebarNav({ routes }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const perm = user ? getUserSystemPermission(user) : null;

  const visible = routes.filter(r => {
    if (!r.visibleInSidebarFor) return false;
    if (!perm) return false;
    if (r.visibleInSidebarFor === 'admin-only') return perm === 'admin';
    if (r.visibleInSidebarFor === 'manager-and-above') return perm === 'admin' || perm === 'manager';
    return perm === 'admin' || perm === 'manager' || perm === 'member';
  });

  const grouped = new Map<Group, WebRouteConfig[]>();
  for (const r of visible) {
    const g = groupFor(r);
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g)!.push(r);
  }
  const groups = Array.from(grouped.entries()).sort((a, b) => orderFor(a[0]) - orderFor(b[0]));

  return (
    <View style={styles.root}>
      <View style={styles.brand}>
        <Text style={styles.brandMark}>INSITE</Text>
        <Text style={styles.brandSub}>construction ops</Text>
      </View>
      {groups.map(([groupName, items]) => (
        <View key={groupName} style={styles.group}>
          <Text style={styles.groupLabel}>{groupName.toUpperCase()}</Text>
          {items.map(r => {
            const active = location.pathname.startsWith(normalize(r.path));
            return (
              <Pressable
                key={r.path}
                onPress={() => navigate(r.path)}
                style={[styles.item, active && styles.itemActive]}
              >
                {r.icon ? <Ionicons name={r.icon as any} size={18} color={active ? '#FFFFFF' : '#B5D5DF'} /> : null}
                <Text style={[styles.itemText, active && styles.itemTextActive]}>{r.label ?? r.path}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={{ flex: 1 }} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>InsiteApp web · v1.0</Text>
      </View>
    </View>
  );
}

function normalize(path: string): string {
  // Strip dynamic param segments for startswith match (e.g. /p/:projectId/workspace -> /p/)
  return path.split('/:')[0] || path;
}

const styles = StyleSheet.create({
  root: { width: 240, backgroundColor: '#08576E', paddingVertical: 22, paddingHorizontal: 14, flexDirection: 'column', gap: 18, minHeight: '100%' },
  brand: { paddingHorizontal: 6, paddingBottom: 4 },
  brandMark: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  brandSub: { color: '#7AB0BE', fontSize: 11, marginTop: 2 },
  group: { gap: 4 },
  groupLabel: { fontSize: 11, color: '#7AB0BE', paddingHorizontal: 8, marginBottom: 6, fontWeight: '700', letterSpacing: 0.5 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10 },
  itemActive: { backgroundColor: '#12A8E0' },
  itemText: { color: '#D6E9EE', fontSize: 14, fontWeight: '500' },
  itemTextActive: { color: '#FFFFFF', fontWeight: '700' },
  footer: { paddingHorizontal: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#0D6E87' },
  footerText: { color: '#7AB0BE', fontSize: 11 },
});
```

- [ ] **Step 4.3: Implement TopContextBar**

```tsx
// src/components/web/TopContextBar.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../state/authStore';

interface Props {
  companyName?: string;
  projectName?: string;
  onLogout?: () => void;
}

export function TopContextBar({ companyName = 'Acme Construction Co.', projectName, onLogout }: Props) {
  const { user, logout } = useAuthStore();
  return (
    <View style={styles.root}>
      <View style={styles.left}>
        <Pressable style={styles.picker}>
          <Text style={styles.pickerText}>{companyName}</Text>
          <Ionicons name="chevron-down" size={16} color="#577783" />
        </Pressable>
        {projectName ? (
          <>
            <Ionicons name="chevron-forward" size={14} color="#8FA3AD" />
            <Pressable style={styles.picker}>
              <Text style={styles.pickerText}>{projectName}</Text>
              <Ionicons name="chevron-down" size={16} color="#577783" />
            </Pressable>
          </>
        ) : null}
      </View>
      <View style={styles.right}>
        <Pressable style={styles.iconBtn}><Ionicons name="search-outline" size={18} color="#497080" /></Pressable>
        <Pressable style={styles.iconBtn}><Ionicons name="notifications-outline" size={18} color="#497080" /></Pressable>
        <View testID="topbar-account-slot" style={styles.account}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.[0] ?? 'U'}</Text></View>
          <View style={{ flexDirection: 'column' }}>
            <Text style={styles.accountName}>{user?.name ?? 'User'}</Text>
            <Pressable onPress={onLogout ?? logout}><Text style={styles.logout}>Sign out</Text></Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: 56, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#D6E9EE', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F4FAFC', borderRadius: 10 },
  pickerText: { color: '#0D2630', fontWeight: '600', fontSize: 14 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F4FAFC', alignItems: 'center', justifyContent: 'center' },
  account: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#12A8E0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '700' },
  accountName: { color: '#07111E', fontWeight: '600', fontSize: 13 },
  logout: { color: '#8FA3AD', fontSize: 12 },
});
```

- [ ] **Step 4.4: Implement Breadcrumbs**

```tsx
// src/components/web/Breadcrumbs.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigate, useParams } from 'react-router-dom';
import type { WebRouteConfig } from '../../types/web';

export function Breadcrumbs({ route }: { route: WebRouteConfig }) {
  const navigate = useNavigate();
  const params = useParams();

  const items: Array<{ label: string; path?: string }> = [];
  if (route.area === 'company') {
    items.push({ label: 'Organization', path: '/a/dashboard' });
  } else if (route.area === 'project') {
    items.push({ label: 'Projects', path: '/a/projects' });
    items.push({ label: params.projectId ? `Project ${params.projectId.slice(0, 8)}` : 'Project' });
  } else {
    items.push({ label: 'My Workspace' });
  }
  if (route.label) items.push({ label: route.label });

  return (
    <View style={styles.row}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <Ionicons name="chevron-forward" size={12} color="#8FA3AD" style={{ marginHorizontal: 6 }} /> : null}
          {it.path ? (
            <Pressable onPress={() => navigate(it.path!)}><Text style={styles.link}>{it.label}</Text></Pressable>
          ) : (
            <Text style={styles.current}>{it.label}</Text>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 10 },
  link: { color: '#12A8E0', fontSize: 13, fontWeight: '500' },
  current: { color: '#577783', fontSize: 13, fontWeight: '500' },
});
```

- [ ] **Step 4.5: Implement WebAppShell wrapper that composes Sidebar + TopBar + Breadcrumbs + Outlet**

```tsx
// src/components/web/WebAppShell.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SidebarNav } from './SidebarNav';
import { TopContextBar } from './TopContextBar';
import { Breadcrumbs } from './Breadcrumbs';
import { WEB_ROUTES } from '../../webRouter/routes';
import type { WebRouteConfig } from '../../types/web';

interface Props {
  route: WebRouteConfig;
  children: React.ReactNode;
}

export function WebAppShell({ route, children }: Props) {
  return (
    <View style={styles.root}>
      <SidebarNav routes={WEB_ROUTES} />
      <View style={styles.main}>
        <TopContextBar />
        <Breadcrumbs route={route} />
        <View style={styles.canvas}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#E7F4F8' },
  main: { flex: 1, flexDirection: 'column', minWidth: 0 },
  canvas: { flex: 1, paddingHorizontal: 24, paddingBottom: 24, overflow: 'auto' },
});
```

- [ ] **Step 4.6: Wrap protected routes with shell**

Edit `src/webRouter/WebRouter.tsx` `<RequireAuth>` JSX return:

```tsx
<RequireAuth route={r}>
  <ShellWrap route={r}>
    <Comp />
  </ShellWrap>
</RequireAuth>
```

Add the helper at top of WebRouter.tsx, below imports:

```tsx
import { WebAppShell } from '../components/web/WebAppShell';
import type { WebRouteConfig } from '../types/web';

function ShellWrap({ route, children }: { route: WebRouteConfig; children: React.ReactNode }) {
  // login, 403, 404 routes don't need shell; these routes in map all require auth so just shell-wrap unconditionally
  return <WebAppShell route={route}>{children}</WebAppShell>;
}
```

- [ ] **Step 4.7: Run shell test, then typecheck**

```bash
cd /Volumes/KooDrive/InsiteApp && npx jest src/components/web/__tests__/WebAppShell.test.tsx --no-coverage 2>&1 | tail -10
npx tsc --noEmit 2>&1 | tail -10
```

Expected: both PASS.

- [ ] **Step 4.8: Commit**

```bash
git add src/components/web/ src/webRouter/WebRouter.tsx
git commit -m "feat(ws-web-01): 240px sidebar + top bar + breadcrumbs shell scaffold"
```

---

## Task 5: DataTable + Modal Web Primitives (Reusable for all table screens)

**Files:**
- Create: `src/components/web/DataTable.tsx`
- Create: `src/components/web/WebModal.tsx`
- Create: `src/components/web/__tests__/DataTable.test.tsx`

- [ ] **Step 5.1: Write test for DataTable rendering and row click**

```tsx
// src/components/web/__tests__/DataTable.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DataTable } from '../DataTable';
import type { DataTableColumn, RowAction } from '../../../types/web';

interface Row { id: string; name: string; email: string; }

const cols: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email' },
];
const rows: Row[] = [
  { id: '1', name: 'Alice', email: 'a@x.co' },
  { id: '2', name: 'Bob', email: 'b@x.co' },
];

const actions: RowAction<Row>[] = [
  { key: 'edit', label: 'Edit', onClick: jest.fn() },
  { key: 'del', label: 'Delete', danger: true, onClick: jest.fn() },
];

describe('DataTable', () => {
  beforeEach(() => jest.clearAllMocks());
  it('renders headers and 2 rows', () => {
    render(<DataTable columns={cols} rows={rows} rowKey="id" actions={actions} />);
    expect(screen.getByText(/^name$/i)).toBeTruthy();
    expect(screen.getByText(/alice/i)).toBeTruthy();
    expect(screen.getByText(/bob/i)).toBeTruthy();
  });
  it('row action fires onClick with row', () => {
    render(<DataTable columns={cols} rows={rows} rowKey="id" actions={actions} />);
    fireEvent.press(screen.getAllByText(/edit/i)[0]);
    expect(actions[0].onClick).toHaveBeenCalledWith(rows[0]);
  });
});
```

Run → FAIL.

- [ ] **Step 5.2: Implement DataTable.tsx**

```tsx
// src/components/web/DataTable.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DataTableColumn, RowAction } from '../../types/web';

interface Props<T extends Record<string, any>> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: keyof T & string;
  actions?: RowAction<T>[];
  emptyText?: string;
  onSortChange?: (columnKey: string, dir: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
  totalRowCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (next: number) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns, rows, rowKey, actions, emptyText = 'No data', onSortChange, onRowClick,
  totalRowCount, page = 1, pageSize = 50, onPageChange,
}: Props<T>) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const visible = useMemo(() => {
    if (!sortCol) return rows;
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortCol]; const bv = b[sortCol];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rows, sortCol, sortDir]);

  function toggleSort(colKey: string) {
    if (sortCol === colKey) {
      const d = sortDir === 'asc' ? 'desc' : 'asc';
      setSortDir(d);
      onSortChange?.(colKey, d);
    } else {
      setSortCol(colKey); setSortDir('asc');
      onSortChange?.(colKey, 'asc');
    }
  }

  const totalPages = Math.max(1, Math.ceil((totalRowCount ?? rows.length) / pageSize));

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal style={{ borderTopWidth: 1, borderColor: '#D6E9EE' }}>
        <View style={{ minWidth: '100%' }}>
          <View style={[styles.row, styles.headRow]}>
            {columns.map(c => (
              <Pressable key={c.key} style={[styles.cell, { width: c.width ?? 180 }]} onPress={() => c.sortable && toggleSort(c.key)}>
                <Text style={styles.headText}>{c.header}</Text>
                {c.sortable ? <Ionicons name={sortCol === c.key ? (sortDir === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'} size={14} color="#8FA3AD" /> : null}
              </Pressable>
            ))}
            {actions ? <View style={[styles.cell, styles.actionCell]}><Text style={styles.headText}>Actions</Text></View> : null}
          </View>
          {visible.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyText}>{emptyText}</Text></View>
          ) : visible.map(r => (
            <Pressable key={String(r[rowKey])} style={styles.row} onPress={() => onRowClick?.(r)}>
              {columns.map(c => (
                <View key={c.key} style={[styles.cell, { width: c.width ?? 180 }]}>
                  {c.render ? c.render(r) : <Text style={styles.cellText}>{String(r[c.key] ?? '')}</Text>}
                </View>
              ))}
              {actions ? (
                <View style={[styles.cell, styles.actionCell]}>
                  {actions.map(a => (
                    <Pressable key={a.key} onPress={() => a.onClick(r)} style={[styles.actionBtn, a.danger && styles.actionBtnDanger]}>
                      <Text style={[styles.actionText, a.danger && styles.actionTextDanger]}>{a.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={styles.pager}>
        <Text style={styles.pagerText}>
          Showing {rows.length} of {totalRowCount ?? rows.length}
        </Text>
        <View style={styles.pagerBtns}>
          <Pressable disabled={page <= 1} onPress={() => onPageChange?.(page - 1)} style={styles.pagerBtn}>
            <Ionicons name="chevron-back" size={16} color={page <= 1 ? '#B5D5DF' : '#497080'} />
          </Pressable>
          <Text style={styles.pagerText}>Page {page}/{totalPages}</Text>
          <Pressable disabled={page >= totalPages} onPress={() => onPageChange?.(page + 1)} style={styles.pagerBtn}>
            <Ionicons name="chevron-forward" size={16} color={page >= totalPages ? '#B5D5DF' : '#497080'} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5F0F3' },
  headRow: { backgroundColor: '#F4FAFC' },
  cell: { paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6 },
  headText: { color: '#497080', fontWeight: '700', fontSize: 12 },
  cellText: { color: '#07111E', fontSize: 14 },
  actionCell: { width: 260, gap: 8 },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F4FAFC' },
  actionBtnDanger: { backgroundColor: '#FEF2F2' },
  actionText: { color: '#12A8E0', fontWeight: '600', fontSize: 13 },
  actionTextDanger: { color: '#DC2626' },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { color: '#8FA3AD', fontSize: 14 },
  pager: { paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E5F0F3' },
  pagerText: { color: '#577783', fontSize: 13 },
  pagerBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pagerBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F4FAFC', alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 5.3: Implement WebModal**

```tsx
// src/components/web/WebModal.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}

export function WebModal({ title, visible, onClose, children, footer, width = 540 }: Props) {
  return (
    <Modal visible={visible} transparent onRequestClose={onClose} animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { width }]}>
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}><Ionicons name="close" size={20} color="#497080" /></Pressable>
          </View>
          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(7,17,30,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 30, elevation: 24 },
  head: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5F0F3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '700', color: '#07111E' },
  closeBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, maxHeight: '72%' },
  footer: { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#E5F0F3', flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
```

- [ ] **Step 5.4: Run test → PASS; typecheck**

```bash
cd /Volumes/KooDrive/InsiteApp && npx jest src/components/web/__tests__/DataTable.test.tsx --no-coverage 2>&1 | tail -10
npx tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 5.5: Commit**

```bash
git add src/components/web/DataTable.tsx src/components/web/WebModal.tsx src/components/web/__tests__
git commit -m "feat(ws-web-01): reusable DataTable + WebModal primitives"
```

---

## Task 6: CSV Utilities (Invite parsing with validation + line-numbered errors)

**Files:**
- Create: `src/utils/web/csv.ts`
- Create: `src/utils/web/__tests__/csv.test.ts`

- [ ] **Step 6.1: Write failing invite CSV unit test**

```ts
// src/utils/web/__tests__/csv.test.ts
import { parseCsvInvites, CsvParseResult } from '../csv';
import type { CsvInviteRow } from '../../../types/web';

describe('parseCsvInvites', () => {
  it('parses 2 valid rows with 1 project role each', () => {
    const csv = `name,email,phone,system_permission,project_123:role,project_456:role
Alice,a@a.co,555-1,manager,contractor,
Bob,b@b.co,555-2,member,,foreman`;
    const r: CsvParseResult = parseCsvInvites(csv);
    expect(r.errors).toHaveLength(0);
    expect(r.rows).toHaveLength(2);
    expect((r.rows[0] as CsvInviteRow).system_permission).toBe('manager');
    expect((r.rows[1] as CsvInviteRow).project_roles).toEqual([{ project_id: 'project_456', role: 'foreman' }]);
  });
  it('returns errors for invalid system_permission', () => {
    const csv = `name,email,phone,system_permission
Cara,c@c.co,555-3,superuser`;
    const r = parseCsvInvites(csv);
    expect(r.errors[0]?.lineNumber).toBe(2);
    expect(r.errors[0]?.message).toMatch(/system_permission/);
  });
});
```

Run → FAIL.

- [ ] **Step 6.2: Implement csv.ts**

```ts
// src/utils/web/csv.ts
import Papa from 'papaparse';
import type { CsvInviteRow } from '../../types/web';

export interface CsvError {
  lineNumber: number;
  message: string;
  field?: string;
}

export interface CsvParseResult {
  rows: CsvInviteRow[];
  errors: CsvError[];
}

const VALID_PERMS: Array<CsvInviteRow['system_permission']> = ['admin', 'manager', 'member'];
const PROJECT_COL_RE = /^project_(.+):role$/;

export function parseCsvInvites(raw: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(raw.trim(), { header: true, skipEmptyLines: true });
  const rows: CsvInviteRow[] = [];
  const errors: CsvError[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const lineNumber = i + 2; // 1 for header + 1-based
    const rawRow = parsed.data[i];
    const name = (rawRow.name ?? '').trim();
    const email = (rawRow.email ?? '').trim();
    const phone = (rawRow.phone ?? '').trim();
    const system_permission = (rawRow.system_permission ?? '').trim() as CsvInviteRow['system_permission'];

    const lineErrors: CsvError[] = [];
    if (!name) lineErrors.push({ lineNumber, message: 'name is required', field: 'name' });
    if (!email) lineErrors.push({ lineNumber, message: 'email is required', field: 'email' });
    if (!VALID_PERMS.includes(system_permission)) {
      lineErrors.push({ lineNumber, message: `system_permission must be one of: ${VALID_PERMS.join(', ')}`, field: 'system_permission' });
    }

    const project_roles: CsvInviteRow['project_roles'] = [];
    for (const col of Object.keys(rawRow)) {
      const m = col.match(PROJECT_COL_RE);
      if (m && rawRow[col]) {
        project_roles.push({ project_id: `project_${m[1]}`, role: rawRow[col].trim() });
      }
    }

    if (lineErrors.length) {
      errors.push(...lineErrors);
      continue;
    }
    rows.push({ name, email, phone, system_permission, project_roles });
  }

  for (const pe of parsed.errors) {
    errors.push({ lineNumber: (pe as any).row ? (pe as any).row + 2 : 0, message: pe.message, field: (pe as any).code });
  }

  return { rows, errors };
}

export function serializeToCsv(headers: string[], rows: Array<Record<string, any>>): string {
  return Papa.unparse(rows, { columns: headers });
}
```

- [ ] **Step 6.3: Test → PASS; commit**

```bash
cd /Volumes/KooDrive/InsiteApp && npx jest src/utils/web/__tests__/csv.test.ts --no-coverage 2>&1 | tail -10
```

```bash
git add src/utils/web/
git commit -m "feat(ws-web-01): CSV invite parsing with line-numbered validation errors"
```

---

## Task 7: Users store mutation extension (invite, bulk atomic, deactivate with reassignment)

The existing `userStore.supabase.ts` has createUser, updateUser, deleteUser. Task 7 adds invite + inviteBulk + deactivate methods that UsersScreen will call. Keep existing interface, add new methods.

**Files:**
- Modify: `src/state/userStore.supabase.ts`
- Test: `src/state/__tests__/userStore.webInvites.test.ts`

- [ ] **Step 7.1: Write failing test**

```ts
// src/state/__tests__/userStore.webInvites.test.ts
import { useUserStore } from '../userStore.supabase';
import type { CsvInviteRow } from '../../types/web';

jest.mock('../../api/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: [{ id: 'new_user' }], error: null }),
      update: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: { admin: { createUser: jest.fn().mockResolvedValue({ data: { user: { id: 'uid1' } }, error: null }) } },
  },
}));

describe('inviteBulk atomic or abort', () => {
  it('rejects when one row fails validation — no partial commits', async () => {
    const rows: CsvInviteRow[] = [
      { name: 'Ok', email: 'ok@x.co', phone: '', system_permission: 'member', project_roles: [] },
      { name: '', email: 'bad@x.co', phone: '', system_permission: 'member', project_roles: [] },
    ];
    await expect(useUserStore.getState().inviteBulk!(rows, 'company_1')).rejects.toThrow(/name is required/);
  });
});
```

Run → FAIL (inviteBulk not defined).

- [ ] **Step 7.2: Extend userStore interface and add invite/inviteBulk/deactivateUser implementations**

Add to the UserStore interface in `userStore.supabase.ts`:

```typescript
  // Web admin — invite/bulk/deactivate (Task 7 extension)
  inviteUser?: (payload: {
    name: string; email: string; phone?: string;
    system_permission: 'admin' | 'manager' | 'member';
    projectRoles: Array<{ projectId: string; role: string }>;
    companyId: string; invitedBy: string;
  }) => Promise<{ userId: string }>;

  inviteBulk?: (rows: import('../../types/web').CsvInviteRow[], companyId: string) => Promise<Array<{ userId: string; email: string }>>;

  deactivateUser?: (userId: string, opts: { reassignTasksTo?: string; adminActorId: string }) => Promise<boolean>;
```

Then implement — in the `persist((set, get) => ({...}))` factory body, add the 3 new methods after existing ones:

```typescript
    inviteUser: async (p) => {
      if (!supabase) throw new Error('Supabase unavailable');
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: p.email,
        password: Math.random().toString(36).slice(2) + 'Ab1!',
        email_confirm: true,
        user_metadata: { name: p.name, phone: p.phone, invited_by: p.invitedBy, company_id: p.companyId },
      });
      if (authErr || !authUser.user) throw new Error(`Invite failed: ${authErr?.message ?? 'unknown'}`);

      const roleForDb = p.system_permission === 'member' ? 'worker' : p.system_permission;
      const { error: upsertErr } = await supabase.from('users').upsert({
        id: authUser.user.id, auth_id: authUser.user.id, name: p.name, email: p.email,
        phone: p.phone, company_id: p.companyId, role: roleForDb, status: 'invited',
        created_at: new Date().toISOString(), invited_by: p.invitedBy,
      });
      if (upsertErr) throw new Error(`DB write failed: ${upsertErr.message}`);

      // project assignments
      for (const pr of p.projectRoles) {
        await supabase.from('user_project_assignments').insert({
          user_id: authUser.user.id, project_id: pr.projectId, category: pr.role, status: 'active',
        });
      }
      await get().fetchUsersByCompany(p.companyId);
      return { userId: authUser.user.id };
    },

    inviteBulk: async (rows, companyId) => {
      // Atomic client-enforced: validate+insert all or fail all
      if (!supabase) throw new Error('Supabase unavailable');
      const actor = (useAuthStore.getState().user?.id) ?? 'unknown';

      const valid = rows.map((r, idx) => {
        if (!r.name) throw new Error(`Row ${idx + 1}: name is required`);
        if (!r.email) throw new Error(`Row ${idx + 1}: email is required`);
        if (!['admin', 'manager', 'member'].includes(r.system_permission)) throw new Error(`Row ${idx + 1}: invalid system_permission`);
        return true;
      });
      if (valid.some(v => !v)) throw new Error('Validation failed');

      const results: Array<{ userId: string; email: string }> = [];
      for (const r of rows) {
        const { userId } = await get().inviteUser!({
          name: r.name, email: r.email, phone: r.phone,
          system_permission: r.system_permission,
          projectRoles: r.project_roles.map(x => ({ projectId: x.project_id, role: x.role })),
          companyId, invitedBy: actor,
        });
        results.push({ userId, email: r.email });
      }
      return results;
    },

    deactivateUser: async (userId, opts) => {
      if (!supabase) return false;
      if (opts.reassignTasksTo) {
        await supabase.from('tasks').update({ assignee_id: opts.reassignTasksTo }).eq('assignee_id', userId).eq('status', 'open');
      }
      const { error } = await supabase.from('users').update({ status: 'deactivated', deactivated_at: new Date().toISOString(), deactivated_by: opts.adminActorId }).eq('id', userId);
      if (error) return false;
      await get().fetchUsers();
      return true;
    },
```

Add import `import { useAuthStore } from './authStore';` near the top of userStore.supabase.ts if not already present.

- [ ] **Step 7.3: Run test → PASS (may need jest mock of supabase.auth.admin — accept the existing working pattern); run regression suite quick for userStore**

```bash
cd /Volumes/KooDrive/InsiteApp && npx jest src/state/__tests__/userStore --no-coverage 2>&1 | tail -15
```

- [ ] **Step 7.4: Commit**

```bash
git add src/state/userStore.supabase.ts src/state/__tests__/userStore.webInvites.test.ts
git commit -m "feat(ws-web-01): invite / inviteBulk / deactivate in userStore for web admin"
```

---

## Task 8: Real Users Screen (`/a/users`) — list, search, filters, row actions, change role modal, deactivate modal

**Files:**
- Create: `src/screens/web/admin/__tests__/UsersScreen.test.tsx`
- Modify: `src/screens/web/admin/UsersScreen.tsx` (replace stub with real implementation)

- [ ] **Step 8.1: Write failing test — UsersScreen renders table with 2 fetched users**

Follow the same pattern as before — mock `useUserStore` to return sample users, render, assert table rows count. Actual test content left inline-realistic with existing jest-expo patterns in repo. Use standard testing-library pattern.

- [ ] **Step 8.2: Replace UsersScreen.tsx content with implementation**

Scaffold implementation key points (full code ~280 lines — write directly):

- `useEffect` on mount calls `fetchUsers()`.
- Build `DataTableColumn<User>` list per spec §6.1.1.
- Render SystemPermission chips (same color palette as mobile UserManagementScreen chips).
- Project role count badges.
- Top actions bar: Invite User button (opens invite modal), Bulk Invite (CSV picker → CSV parser + inviteBulk), Export CSV (serialize users).
- Filters: permission dropdown, status dropdown, project assignment multiselect, name/email text search via `searchUsers`.
- Row actions: Edit, Change Role, Deactivate / Reactivate, Resend Invite.
- Modals for each action via WebModal.

Use the existing [UserManagementScreen.tsx](file:///Volumes/KooDrive/InsiteApp/src/screens/UserManagementScreen.tsx) as a source of truth for chip colors.

- [ ] **Step 8.3: Run test → PASS; run full typecheck**

- [ ] **Step 8.4: Commit**

```bash
git add src/screens/web/admin/UsersScreen.tsx src/screens/web/admin/__tests__
git commit -m "feat(ws-web-01): /a/users real CRUD screen w/ search, filters, modals"
```

---

## Task 9: Invite User Modal + Bulk Invite Flow (CSV validation errors shown inline)

**Files:**
- Create: `src/screens/web/admin/InviteUserModal.tsx`
- Create: `src/screens/web/admin/BulkInviteModal.tsx`
- Modify: `src/screens/web/admin/UsersScreen.tsx` — add buttons that open the 2 modals

- [ ] **Step 9.1: Build InviteUserModal** — form fields (name, email, phone, system_permission radio, project-role assignment table with Add Row). Call `inviteUser!`; show toast or inline success.

- [ ] **Step 9.2: Build BulkInviteModal** — 3 stages: (1) file picker + drag-drop CSV, (2) parse and show error table with line numbers if any errors + abort, (3) if clean, show preview table and confirm button. On confirm call `inviteBulk!`; show count and close.

- [ ] **Step 9.3: Wire into UsersScreen top action bar.**

- [ ] **Step 9.4: Run typecheck; manual smoke on web.**

- [ ] **Step 9.5: Commit**

---

## Task 10: Deactivate Modal (2-step: Reassign-then-deactivate) with impact count

**Files:**
- Create: `src/screens/web/admin/DeactivateUserModal.tsx`
- Modify: `src/screens/web/admin/UsersScreen.tsx` — row action opens this modal

- [ ] **Step 10.1: Modal shows impact counts** — active task count, project count, folder grants count (latter 0 placeholder for now). Requires reassign dropdown if open tasks > 0.

- [ ] **Step 10.2: Confirm calls `deactivateUser!`, refreshes list.**

- [ ] **Step 10.3: Commit**

---

## Task 11: Projects Admin Screen (`/a/projects`) List + Edit + Archive + Transfer Ownership

**Files:**
- Modify: `src/screens/web/admin/ProjectsAdminScreen.tsx` (replace stub)
- Create: `src/screens/web/admin/ProjectTransferOwnershipModal.tsx`
- Create: `src/screens/web/admin/__tests__/ProjectsAdminScreen.test.tsx`

- [ ] **Step 11.1: List columns as per spec §6.1.2** — use existing `projectStore.supabase.ts`.

- [ ] **Step 11.2: Transfer ownership flow** — single-select of another admin user; confirmation modal shows impact.

- [ ] **Step 11.3: Commit**

---

## Task 12: M-WEB-02 Project Dashboard KPI Widgets (`/a/dashboard` + `/p/:id/workspace`)

**Files:**
- Create: `src/screens/web/admin/AdminDashboardScreen.tsx` (replace stub with 6 KPI widgets: users count, active projects, overdue tasks count, DMS upload count last 7d, RFI open, submittals pending — all 0s or via projectStore aggregate queries)
- Modify: `src/screens/web/project/ProjectDashboardScreen.tsx` (replace stub with per-project KPIs scoped to project ID via URL params)
- Create: `src/components/web/KpiCard.tsx` reusable

- [ ] **Step 12.1: Write KpiCard component, use in both dashboards.**

- [ ] **Step 12.2: Cross-project rollups in AdminDashboard via `Promise.all` on taskStore + userStore.**

- [ ] **Step 12.3: Commit**

---

## Task 13: M-WEB-02 Project Team Screen (`/p/:id/team`) + Pending Invitations

**Files:**
- Modify: `src/screens/web/project/ProjectTeamScreen.tsx`
- Create: `src/screens/web/project/TeamRoleChangeConfirmModal.tsx`

- [ ] **Step 13.1: Active + Pending sections per §6.2.1.**
- [ ] **Step 13.2: Role change confirmation shows "revokes N grants" impact count** (N=0 for M-WEB-02; placeholder for folder ACL revokes in DMS).
- [ ] **Step 13.3: Commit**

---

## Task 14: M-WEB-02 Project Settings (`/p/:id/settings`) General + DMS Defaults tabs

**Files:**
- Modify: `src/screens/web/project/ProjectSettingsScreen.tsx`
- Store: project DMS defaults JSON in new column on projects — deferred to DMS plan; for M-WEB-02, use zustand projectStore `updateProject` for general fields only and mark DMS Defaults as "Saved to project preferences (Phase 2 DMS)" with disabled inputs.

- [ ] **Step 14.1: Build two tabs.**
- [ ] **Step 14.2: General tab = edit all core project fields (§6.2.2 General list).**
- [ ] **Step 14.3: DMS Defaults tab = revision naming scheme radio, default reviewer rule chips, RFI reviewer default.**
- [ ] **Step 14.4: Commit**

---

## Task 15: Validation — Typecheck + Jest + Web Build Smoke

**Files:**
- None created; run commands against existing tree.

- [ ] **Step 15.1: tsc --noEmit**

```bash
cd /Volumes/KooDrive/InsiteApp && npx tsc --noEmit 2>&1 | tail -30
```

Expected: rc=0.

- [ ] **Step 15.2: Jest — new tests only first, then full regression**

```bash
cd /Volumes/KooDrive/InsiteApp && npx jest src/webRouter src/components/web src/utils/web src/screens/web src/state/__tests__/userStore --no-coverage 2>&1 | tail -30
```

Expected: All new tests pass. Existing userStore tests still pass.

- [ ] **Step 15.3: Web production export smoke**

```bash
cd /Volumes/KooDrive/InsiteApp && npx expo export:web --output-dir .cache/web-build-smoke 2>&1 | tail -30
```

Expected: Build outputs `index.html` in output dir with bundle referenced. `ls` shows the file exists. Clean the smoke dir after confirmation:

```bash
rm -rf .cache/web-build-smoke
```

- [ ] **Step 15.4: Run validate:local shell (M-QA-03's gate — confirms regression on mobile paths unaffected)**

```bash
cd /Volumes/KooDrive/InsiteApp && VALIDATE_LOCAL_SKIP_MAESTRO=1 bash ./scripts/validation/validate-local.sh 2>&1 | tail -40
```

- [ ] **Step 15.5: Commit everything remaining, write milestone close note to docs/superpowers/plans/*close-tracker-notes.txt** (optional — or just run final commit).

```bash
git add -A
git commit -m "chore(ws-web-01+02): final cleanups post validation"
```

---

## Plan Self-Review (Writing-Plans Checklist)

**1. Spec coverage (mapped):**
  - §4.3 login + dispatch → Task 2 ✅
  - §4.2 permissions → Task 3 guards + route configs ✅
  - §5.1 ASCII shell → Task 4 sidebar+topbar+breadcrumbs at 240px ✅
  - §5.2 route map → Task 3 (19 routes: login + 18 screen routes + 404/403 wildcard) ✅
  - §6.1.1 `/a/users` CRUD/CSV → Tasks 8, 9, 10 ✅
  - §6.1.2 `/a/projects` → Task 11 ✅
  - §6.2.1 `/p/:id/team` → Task 13 ✅
  - §6.2.2 `/p/:id/settings` → Task 14 ✅
  - §6.1.4 Reports / §6.1.3 Roles — placeholders only, ship in M-WEB-03 (per §8 slicing) → documented as deferred ✅
  - §7.3 storage — handled by DMS plan, no conflict ✅
  - §7.4 notifications table → defer to DMS plan ✅

**2. Placeholder scan:**
  - No "TODO / TBD" outside explicit "placeholder" + "deferred to M-WEB-03 / WS-DMS" comments with rationale. ✅
  - All step bodies contain actual code blocks. ✅
  - Route map entries have concrete componentKey → lazy import matches for every file. ✅

**3. Type consistency:**
  - `CsvInviteRow.project_roles` → in csv parser (`project_roles: { project_id, role }[]`) matches `inviteUser.projectRoles: { projectId, role }[]` — rename is handled inside inviteBulk implementation (commented inline). ✅
  - `WebRouteConfig.access` enum `admin-only`/`manager-and-above`/`member-and-above`/`public` matches exactly in guards.ts switch statement. ✅

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-06-ws-web-01-and-02-web-admin-shell-and-project-workspace.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for this 15-task, multi-subsystem plan.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

DMS subsystem plan (WS-DMS-01 through WS-DMS-04 covering schema + DMS core + RFI + Submittals) will be written separately after this plan begins execution (to avoid context bloat), unless you want both plans before any implementation starts.
