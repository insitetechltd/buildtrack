import {
  collectAttachmentRefs,
  formatDueDate,
  mapProjectTaskRow,
} from "../projectTasks";

describe("projectTasks mappers (M-WEB-01)", () => {
  it("maps task row and resolves assignee name", () => {
    const row = mapProjectTaskRow(
      {
        id: "t1",
        title: "Fix pipe",
        description: "Lobby",
        status: "in_progress",
        priority: "high",
        due_date: "2026-10-20T00:00:00Z",
        completion_percentage: 40,
        primary_assignee_id: "u1",
        tags: ["wet"],
        updated_at: "2026-10-16T00:00:00Z",
      },
      { u1: "John Manager A" },
      ["projects/p1/tasks/t1/a.jpg", "projects/p1/tasks/t1/b.jpg"],
      ["https://cdn.example.com/a.jpg"],
    );
    expect(row.primaryAssigneeName).toBe("John Manager A");
    expect(row.completionPercentage).toBe(40);
    expect(row.tags).toEqual(["wet"]);
    expect(row.nestingLevel).toBe(0);
    expect(row.attachmentRefs).toEqual([
      "projects/p1/tasks/t1/a.jpg",
      "projects/p1/tasks/t1/b.jpg",
    ]);
    expect(row.photoUris).toEqual(["https://cdn.example.com/a.jpg"]);
  });

  it("collects file + activity refs without evolved attachments col", () => {
    expect(
      collectAttachmentRefs({}, ["a.jpg", "b.jpg"], ["b.jpg", "c.jpg"]),
    ).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
    expect(collectAttachmentRefs({})).toEqual([]);
  });

  it("formats due dates", () => {
    expect(formatDueDate(null)).toBe("No due date");
    expect(formatDueDate("not-a-date")).toBe("not-a-date");
  });
});

