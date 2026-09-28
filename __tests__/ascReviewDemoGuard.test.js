const {
  ascLockedDemoEmails,
  isAscLockedDemoEmail,
  assertMayRotateAscDemoPassword,
  assertMayRotateAscDemoPasswordOrThrow,
  ascDemoPasswordBreakGlassEnabled,
} = require("../scripts/lib/ascReviewDemoGuard.cjs");

describe("ascReviewDemoGuard", () => {
  const locked = [
    "sara@insitetest.com",
    "john@insitetest.com",
    "joe@insitetest.com",
  ];

  it("lists ASC-locked Insite Test Ltd review emails", () => {
    expect(ascLockedDemoEmails()).toEqual(locked);
  });

  it("matches locked emails case-insensitively", () => {
    expect(isAscLockedDemoEmail("Sara@InsiteTest.com")).toBe(true);
    expect(isAscLockedDemoEmail("carol.admina@test.com")).toBe(false);
  });

  it("refuses rotation without break-glass", () => {
    const r = assertMayRotateAscDemoPassword("sara@insitetest.com", {});
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Guideline 2\.1/);
    expect(() =>
      assertMayRotateAscDemoPasswordOrThrow("john@insitetest.com", {}),
    ).toThrow(/ASC-locked/);
  });

  it("allows rotation only with ASC_DEMO_PASSWORD_BREAK_GLASS=1", () => {
    expect(
      ascDemoPasswordBreakGlassEnabled({ ASC_DEMO_PASSWORD_BREAK_GLASS: "1" }),
    ).toBe(true);
    expect(
      assertMayRotateAscDemoPassword("joe@insitetest.com", {
        ASC_DEMO_PASSWORD_BREAK_GLASS: "1",
      }).ok,
    ).toBe(true);
  });

  it("allows non-ASC Maestro actors without break-glass", () => {
    expect(
      assertMayRotateAscDemoPassword("carol.admina@test.com", {}).ok,
    ).toBe(true);
  });
});
