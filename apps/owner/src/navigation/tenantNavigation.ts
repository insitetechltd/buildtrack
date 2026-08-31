import { CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { OwnerStackParamList } from "./OwnerAppNavigator";
import {
  buildTenantHomeResetState,
  getTenantStackDepth,
  resolveNavigationMode,
} from "./tenantNavigationLogic";

export {
  buildTenantHomeResetState,
  getTenantStackDepth,
  TENANT_HOME_ROUTE,
  TENANT_MAX_STACK_DEPTH,
} from "./tenantNavigationLogic";
export { shouldReplaceAtDepth, resolveNavigationMode } from "./tenantNavigationLogic";

/** Minimal nav surface used by tenant screens (screen-scoped props are assignable). */
export type TenantNavigationProp = Pick<
  NativeStackNavigationProp<OwnerStackParamList>,
  "navigate" | "replace" | "dispatch" | "getState"
>;

export function resetToTenantHome(navigation: TenantNavigationProp): void {
  navigation.dispatch(CommonActions.reset(buildTenantHomeResetState()));
}

type NavigateTenantOptions = {
  forcePush?: boolean;
};

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
  stackNav.navigate(route, params as never);
}
