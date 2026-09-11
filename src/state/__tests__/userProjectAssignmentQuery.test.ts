import {
  assignmentTimestamp,
  isMissingAssignedAtColumnError,
  selectActiveUserProjectAssignments,
} from "@/state/userProjectAssignmentQuery";

describe("userProjectAssignmentQuery", () => {
  it("detects PROD missing assigned_at (42703)", () => {
    expect(
      isMissingAssignedAtColumnError({
        code: "42703",
        message:
          'column user_project_assignments.assigned_at does not exist',
      }),
    ).toBe(true);
  });

  it("prefers assigned_at then falls back to created_at", () => {
    expect(
      assignmentTimestamp({
        assigned_at: "2026-01-02T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
      }),
    ).toBe("2026-01-02T00:00:00Z");
    expect(
      assignmentTimestamp({ created_at: "2026-01-01T00:00:00Z" }),
    ).toBe("2026-01-01T00:00:00Z");
  });

  it("retries order by created_at when assigned_at column is missing", async () => {
    const assignedAtOrder = jest.fn().mockResolvedValue({
      data: null,
      error: {
        code: "42703",
        message:
          'column user_project_assignments.assigned_at does not exist',
      },
    });
    const createdAtOrder = jest.fn().mockResolvedValue({
      data: [{ id: "a1", user_id: "u1", project_id: "p1", is_active: true }],
      error: null,
    });

    const eqIsActive = jest.fn().mockReturnValue({
      eq: jest.fn().mockImplementation(() => ({
        order: jest
          .fn()
          .mockImplementation((column: string) =>
            column === "assigned_at"
              ? assignedAtOrder()
              : createdAtOrder(),
          ),
      })),
    });

    const client = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: eqIsActive,
        }),
      }),
    };

    const result = await selectActiveUserProjectAssignments(client, {
      userId: "u1",
    });

    expect(assignedAtOrder).toHaveBeenCalled();
    expect(createdAtOrder).toHaveBeenCalled();
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
  });
});
