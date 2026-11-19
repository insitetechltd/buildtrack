import { mapProjectMemberRow } from "../projectTeam";

describe("projectTeam mappers (M-WEB-01)", () => {
  it("flags lead_project_manager as PA", () => {
    const row = mapProjectMemberRow(
      {
        id: "a1",
        user_id: "u1",
        project_role: "lead_project_manager",
        is_active: true,
      },
      { name: "Carol", email: "c@x.com", system_permission: "admin" },
    );
    expect(row.isProjectAdmin).toBe(true);
    expect(row.name).toBe("Carol");
    expect(row.systemPermission).toBe("admin");
  });

  it("maps worker as member", () => {
    const row = mapProjectMemberRow(
      { user_id: "u2", project_role: "worker", is_active: true },
      { name: "Worker", system_permission: "member" },
    );
    expect(row.isProjectAdmin).toBe(false);
    expect(row.projectRole).toBe("worker");
  });
});
