import { CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { OwnerStackParamList } from "./OwnerAppNavigator";
import {
  buildPopToRouteState,
  buildTenantHomeResetState,
  findRouteIndexInStack,
  getTenantStackDepth,
  resolveNavigationMode,
} from "./tenantNavigationLogic";

export {
  buildPopToRouteState,
  buildTenantHomeResetState,
  findRouteIndexInStack,
  getTenantStackDepth,
  TENANT_HOME_ROUTE,
  TENANT_MAX_STACK_DEPTH,
} from "./tenantNavigationLogic";
export { shouldReplaceAtDepth, resolveNavigationMode } from "./tenantNavigationLogic";

/** Minimal nav surface used by tenant screens (screen-scoped props are assignable). */
export type TenantNavigationProp = Pick<
  NativeStackNavigationProp<OwnerStackParamList>,
  "navigate" | "replace" | "push" | "dispatch" | "getState" | "goBack" | "canGoBack"
>;

export function resetToTenantHome(navigation: TenantNavigationProp): void {
  navigation.dispatch(CommonActions.reset(buildTenantHomeResetState()));
}

/** One-level back; if the stack is empty, land on Tenant home (not HQ root). */
export function goBackTenant(navigation: TenantNavigationProp): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  resetToTenantHome(navigation);
}

type NavigateTenantOptions = {
  forcePush?: boolean;
};

/**
 * Forward drill-down. Uses **push** (not navigate) so Back always pops one screen.
 * React Navigation `navigate` jumps to an existing route and collapses history —
 * that made Back feel like it “popped all the way out.”
 */
export function navigateTenant(
  navigation: TenantNavigationProp,
  route: keyof OwnerStackParamList,
  params?: object,
  opts?: NavigateTenantOptions,
): void {
  const state = navigation.getState();
  const depth = getTenantStackDepth(state);
  const mode = resolveNavigationMode(depth, opts?.forcePush);
  const stackNav = navigation as NativeStackNavigationProp<OwnerStackParamList>;
  if (mode === "replace") {
    stackNav.replace(route, params as never);
    return;
  }
  stackNav.push(route, params as never);
}

/**
 * Up-link to a parent tenant screen (e.g. Project → Company). Pops to the
 * existing route when present; otherwise pushes.
 */
export function popToTenantScreen(
  navigation: TenantNavigationProp,
  route: keyof OwnerStackParamList,
  params?: object,
): void {
  const state = navigation.getState();
  const idx = findRouteIndexInStack(state, route);
  if (state && idx >= 0) {
    navigation.dispatch(
      CommonActions.reset(buildPopToRouteState(state, idx, params) as never),
    );
    return;
  }
  navigateTenant(navigation, route, params, { forcePush: true });
}
