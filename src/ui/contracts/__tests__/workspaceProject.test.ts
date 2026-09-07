import { needsForcedProjectPicker, resolveWorkspaceProjectId } from "../workspaceProject";

describe("resolveWorkspaceProjectId", () => {
  it("prefers an explicit selection when it is in the available list", () => {
    expect(resolveWorkspaceProjectId("p2", ["p1", "p2", "p3"])).toBe("p2");
  });

  it("does not keep an explicit selection while membership is still empty", () => {
    expect(resolveWorkspaceProjectId("p-west", [])).toBeNull();
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

describe("needsForcedProjectPicker", () => {
  it("is false when a valid selection or sole project resolves", () => {
    expect(needsForcedProjectPicker("p1", ["p1", "p2"])).toBe(false);
    expect(needsForcedProjectPicker(null, ["only"])).toBe(false);
  });

  it("is true when the user must pick among multiple projects", () => {
    expect(needsForcedProjectPicker(null, ["a", "b"])).toBe(true);
    expect(needsForcedProjectPicker("gone", ["a", "b"])).toBe(true);
  });

  it("is true when selection exists but membership is empty", () => {
    expect(needsForcedProjectPicker("stale", [])).toBe(true);
  });
});
