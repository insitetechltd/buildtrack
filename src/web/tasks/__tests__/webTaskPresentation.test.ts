import {
  formatWebTaskStatusLabel,
  matchesWebStatusFilter,
  sortWebTasks,
  webStatusFilterChipLabel,
} from "../webTaskPresentation";

describe("webTaskPresentation", () => {
  it("formats status labels like mobile", () => {
    expect(formatWebTaskStatusLabel("in_progress")).toBe("Active");
    expect(formatWebTaskStatusLabel("submitted_for_review")).toBe("Submitted For Review");
  });

  it("filters by mobile status buckets", () => {
    const task = { status: "in_progress", dueDate: null };
    expect(matchesWebStatusFilter(task, "doing")).toBe(true);
    expect(matchesWebStatusFilter(task, "new")).toBe(false);
    expect(webStatusFilterChipLabel("doing")).toBe("Status: Active");
  });

  it("sorts by due date ascending", () => {
    const sorted = sortWebTasks(
      [
        { id: "b", dueDate: "2026-10-20", updatedAt: "2026-10-01" },
        { id: "a", dueDate: "2026-10-10", updatedAt: "2026-10-02" },
      ],
      "due_asc",
    );
    expect(sorted.map((t) => t.id)).toEqual(["a", "b"]);
  });
});
