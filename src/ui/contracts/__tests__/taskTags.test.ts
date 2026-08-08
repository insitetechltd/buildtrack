import {
  getCustomTaskTags,
  mergeTaskTags,
  resolvePrimaryAssigneeId,
  withCriticalThisWeekTag,
  CRITICAL_THIS_WEEK_TAG,
} from "../taskTags";

describe("taskTags (S-UX-01J)", () => {
  it("merges custom tags with critical_this_week", () => {
    expect(
      mergeTaskTags({
        customTags: ["hvac", "roof"],
        isCriticalThisWeek: true,
      }),
    ).toEqual(["hvac", "roof", CRITICAL_THIS_WEEK_TAG]);
  });

  it("withCriticalThisWeekTag toggles without duplicating", () => {
    expect(withCriticalThisWeekTag([CRITICAL_THIS_WEEK_TAG, "hvac"], false)).toEqual([
      "hvac",
    ]);
    expect(withCriticalThisWeekTag(["hvac"], true)).toEqual([
      "hvac",
      CRITICAL_THIS_WEEK_TAG,
    ]);
  });

  it("strips critical tag from custom tags helper", () => {
    expect(getCustomTaskTags([CRITICAL_THIS_WEEK_TAG, "site_a"])).toEqual(["site_a"]);
  });

  it("resolves primary assignee from preferred id or first assignee", () => {
    expect(resolvePrimaryAssigneeId(["a", "b"], "b")).toBe("b");
    expect(resolvePrimaryAssigneeId(["a", "b"], "missing")).toBe("a");
    expect(resolvePrimaryAssigneeId([], "a")).toBeUndefined();
  });
});
