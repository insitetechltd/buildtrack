export const TENANT_MAX_STACK_DEPTH = 10;
export const TENANT_HOME_ROUTE = "TenantOps" as const;

type NavState = {
  routes: { name: string }[];
  index: number;
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
