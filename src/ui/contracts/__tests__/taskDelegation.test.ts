import {
  mergeAssignedToIds,
  normalizeDelegatedUserIds,
  uniqueUserIds,
} from "../taskDelegation";

describe("taskDelegation helpers", () => {
  it("uniqueUserIds trims and dedupes", () => {
    expect(uniqueUserIds([" a ", "a", "", null, "b"])).toEqual(["a", "b"]);
  });

  it("normalizeDelegatedUserIds excludes primary", () => {
    expect(normalizeDelegatedUserIds(["u1", "u2", "u3"], "u2")).toEqual(["u1", "u3"]);
  });

  it("normalizeDelegatedUserIds keeps all when primary missing", () => {
    expect(normalizeDelegatedUserIds(["u1", "u2"], undefined)).toEqual(["u1", "u2"]);
  });

  it("mergeAssignedToIds unions primary, delegates, and legacy assignedTo", () => {
    expect(
      mergeAssignedToIds({
        assignedTo: ["u1"],
        primaryAssigneeId: "u2",
        delegatedUserIds: ["u3", "u1"],
      }),
    ).toEqual(["u1", "u2", "u3"]);
  });
});
