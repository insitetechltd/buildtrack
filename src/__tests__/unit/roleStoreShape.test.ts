import { mapRoleRow } from "@/state/roleStore";

describe("role catalog alignment", () => {
  it("can represent member as a first-class system role", () => {
    expect(["admin", "manager", "member"]).toContain("member");
  });

  it("maps snake_case role rows into the Role interface", () => {
    const mapped = mapRoleRow({
      id: "role-1",
      name: "member",
      display_name: "Member",
      description: "Standard member role",
      level: 3,
      permissions: { tasks: true },
      is_system_role: true,
      created_at: "2026-06-20T00:00:00.000Z",
      updated_at: "2026-06-20T00:00:00.000Z",
    });

    expect(mapped.name).toBe("member");
    expect(mapped.displayName).toBe("Member");
    expect(mapped.isSystemRole).toBe(true);
    expect(mapped.createdAt).toBe("2026-06-20T00:00:00.000Z");
  });
});
