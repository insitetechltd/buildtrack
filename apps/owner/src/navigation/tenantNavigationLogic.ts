export const TENANT_MAX_STACK_DEPTH = 10;
export const TENANT_HOME_ROUTE = "TenantOps" as const;

type NavState = {
  routes: { name: string; params?: object }[];
  index: number;
  key?: string;
  routeNames?: string[];
  type?: string;
  stale?: boolean;
};

export function getTenantStackDepth(state: NavState | undefined): number {
  if (!state?.routes?.length) return 0;
  return state.index + 1;
}

export function shouldReplaceAtDepth(depth: number): boolean {
  return depth >= TENANT_MAX_STACK_DEPTH;
}

export function resolveNavigationMode(
  depth: number,
  forcePush?: boolean,
): "push" | "replace" {
  if (forcePush) return "push";
  return shouldReplaceAtDepth(depth) ? "replace" : "push";
}

export function buildTenantHomeResetState() {
  return {
    index: 1,
    routes: [{ name: "Home" }, { name: TENANT_HOME_ROUTE }],
  };
}

/** Index of the topmost matching route, or -1. */
export function findRouteIndexInStack(
  state: NavState | undefined,
  routeName: string,
): number {
  if (!state?.routes?.length) return -1;
  for (let i = state.routes.length - 1; i >= 0; i -= 1) {
    if (state.routes[i]?.name === routeName) return i;
  }
  return -1;
}

/**
 * Truncate stack to an existing route (merge params), for "up" links like
 * Project → Company without leaving a duplicate CompanyDetail on the stack.
 */
export function buildPopToRouteState(
  state: NavState,
  routeIndex: number,
  params?: object,
): NavState {
  const routes = state.routes.slice(0, routeIndex + 1).map((route, i) => {
    if (i !== routeIndex) return route;
    return {
      ...route,
      params: { ...(route.params as object | undefined), ...params },
    };
  });
  return {
    ...state,
    index: routeIndex,
    routes,
  };
}
