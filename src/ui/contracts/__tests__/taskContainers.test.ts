import {
  listChildContainers,
  listTopLevelContainers,
  normalizeContainerLabel,
  shouldShowContainerOrganization,
} from "../taskContainers";

describe("taskContainers helpers", () => {
  const sample = [
    { id: "c1", projectId: "p1", label: "Tower A" },
    { id: "c2", projectId: "p1", parentId: "c1", label: "Level 3" },
    { id: "c3", projectId: "p1", label: "Basement" },
  ];

  it("normalizes labels", () => {
    expect(normalizeContainerLabel("  Level   3  ")).toBe("Level 3");
  });

  it("lists top-level and children", () => {
    expect(listTopLevelContainers(sample).map((c) => c.id)).toEqual(["c1", "c3"]);
    expect(listChildContainers(sample, "c1").map((c) => c.id)).toEqual(["c2"]);
  });

  it("gates organization UI for progressive disclosure", () => {
    expect(
      shouldShowContainerOrganization({ containerCount: 0, userExpanded: false }),
    ).toBe(false);
    expect(
      shouldShowContainerOrganization({ containerCount: 0, userExpanded: true }),
    ).toBe(true);
    expect(
      shouldShowContainerOrganization({ containerCount: 2, userExpanded: false }),
    ).toBe(true);
    expect(
      shouldShowContainerOrganization({
        containerCount: 0,
        selectedContainerId: "c1",
        userExpanded: false,
      }),
    ).toBe(true);
  });
});
