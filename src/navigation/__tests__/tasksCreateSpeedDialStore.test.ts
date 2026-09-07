import {
  getTasksCreateDialExpanded,
  setTasksCreateDialExpanded,
  toggleTasksCreateDialExpanded,
} from "../tasksCreateSpeedDialStore";

describe("tasksCreateSpeedDialStore", () => {
  beforeEach(() => {
    setTasksCreateDialExpanded(false);
  });

  it("toggles expanded state", () => {
    expect(getTasksCreateDialExpanded()).toBe(false);
    expect(toggleTasksCreateDialExpanded()).toBe(true);
    expect(getTasksCreateDialExpanded()).toBe(true);
    expect(toggleTasksCreateDialExpanded()).toBe(false);
  });
});
