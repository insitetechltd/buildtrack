import {
  buildPopToRouteState,
  buildTenantHomeResetState,
  findRouteIndexInStack,
  getTenantStackDepth,
  resolveNavigationMode,
  shouldReplaceAtDepth,
  TENANT_MAX_STACK_DEPTH,
  TENANT_HOME_ROUTE,
} from "../tenantNavigationLogic";

describe("getTenantStackDepth", () => {
  it("returns 0 for empty state", () => {
    expect(getTenantStackDepth(undefined)).toBe(0);
    expect(getTenantStackDepth({ routes: [], index: 0 })).toBe(0);
  });

  it("returns index + 1", () => {
    expect(
      getTenantStackDepth({
        routes: [{ name: "Home" }, { name: "TenantOps" }, { name: "CompanyList" }],
        index: 2,
      }),
    ).toBe(3);
  });
});

describe("shouldReplaceAtDepth", () => {
  it("replaces at max depth", () => {
    expect(shouldReplaceAtDepth(TENANT_MAX_STACK_DEPTH - 1)).toBe(false);
    expect(shouldReplaceAtDepth(TENANT_MAX_STACK_DEPTH)).toBe(true);
    expect(shouldReplaceAtDepth(TENANT_MAX_STACK_DEPTH + 1)).toBe(true);
  });
});

describe("resolveNavigationMode", () => {
  it("forces push when requested", () => {
    expect(resolveNavigationMode(TENANT_MAX_STACK_DEPTH, true)).toBe("push");
  });

  it("replaces at depth cap", () => {
    expect(resolveNavigationMode(TENANT_MAX_STACK_DEPTH)).toBe("replace");
    expect(resolveNavigationMode(TENANT_MAX_STACK_DEPTH - 1)).toBe("push");
  });
});

describe("buildTenantHomeResetState", () => {
  it("resets to Home then TenantOps", () => {
    expect(buildTenantHomeResetState()).toEqual({
      index: 1,
      routes: [{ name: "Home" }, { name: TENANT_HOME_ROUTE }],
    });
  });
});

describe("findRouteIndexInStack", () => {
  it("finds topmost matching route", () => {
    expect(
      findRouteIndexInStack(
        {
          index: 3,
          routes: [
            { name: "Home" },
            { name: "TenantOps" },
            { name: "CompanyDetail", params: { companyId: "a" } },
            { name: "ProjectSummary" },
          ],
        },
        "CompanyDetail",
      ),
    ).toBe(2);
  });

  it("returns -1 when missing", () => {
    expect(findRouteIndexInStack({ index: 0, routes: [{ name: "Home" }] }, "CompanyDetail")).toBe(
      -1,
    );
  });
});

describe("buildPopToRouteState", () => {
  it("truncates stack and merges params", () => {
    const next = buildPopToRouteState(
      {
        index: 3,
        routes: [
          { name: "Home" },
          { name: "TenantOps" },
          { name: "CompanyDetail", params: { companyId: "a", companyName: "Old" } },
          { name: "ProjectSummary" },
        ],
      },
      2,
      { companyName: "New" },
    );
    expect(next.index).toBe(2);
    expect(next.routes).toHaveLength(3);
    expect(next.routes[2]).toEqual({
      name: "CompanyDetail",
      params: { companyId: "a", companyName: "New" },
    });
  });
});
