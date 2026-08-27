import { resolveWorkspaceProjectId } from "../workspaceProject";

describe("resolveWorkspaceProjectId", () => {
  it("prefers an explicit selection when it is in the available list", () => {
    expect(resolveWorkspaceProjectId("p2", ["p1", "p2", "p3"])).toBe("p2");
  });

  it("keeps an explicit selection while projects are still loading", () => {
    expect(resolveWorkspaceProjectId("p-west", [])).toBe("p-west");
  });

  it("falls back to the only available project when nothing is selected", () => {
    expect(resolveWorkspaceProjectId(null, ["only"])).toBe("only");
    expect(resolveWorkspaceProjectId("", ["only"])).toBe("only");
  });

  it("returns null when selection is missing and multiple projects exist", () => {
    expect(resolveWorkspaceProjectId(null, ["a", "b"])).toBeNull();
  });

  it("drops a stale selection that is no longer available when multiple remain", () => {
    expect(resolveWorkspaceProjectId("gone", ["a", "b"])).toBeNull();
  });

  it("uses the sole remaining project when the prior selection is stale", () => {
    expect(resolveWorkspaceProjectId("gone", ["only"])).toBe("only");
  });
});
