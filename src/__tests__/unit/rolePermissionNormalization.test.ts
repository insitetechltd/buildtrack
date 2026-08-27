import {
  getProjectRole,
  getUserSystemPermission,
  isAdmin,
  isLeadProjectManager,
  isManagerOrAdmin,
} from "@/types/buildtrack";

describe("role and permission normalization", () => {
  it("maps legacy worker to member system permission", () => {
    expect(
      getUserSystemPermission({
        id: "user-1",
        role: "worker",
      } as any),
    ).toBe("member");
  });

  it("maps live DB supervisor role to manager system permission", () => {
    expect(
      getUserSystemPermission({
        id: "user-pm",
        role: "supervisor",
      } as any),
    ).toBe("manager");
  });

  it("prefers systemPermission when present", () => {
    expect(
      getUserSystemPermission({
        id: "user-2",
        role: "worker",
        systemPermission: "manager",
      } as any),
    ).toBe("manager");
  });

  it("prefers projectRole over category", () => {
    expect(
      getProjectRole({
        id: "assignment-1",
        userId: "user-1",
        projectId: "project-1",
        category: "worker",
        projectRole: "lead_project_manager",
        assignedAt: "2026-06-20T00:00:00.000Z",
        assignedBy: "user-9",
        isActive: true,
      }),
    ).toBe("lead_project_manager");
  });

  it("detects lead PM from normalized project role", () => {
    expect(
      isLeadProjectManager({
        id: "assignment-2",
        userId: "user-1",
        projectId: "project-1",
        projectRole: "lead_project_manager",
        assignedAt: "2026-06-20T00:00:00.000Z",
        assignedBy: "user-9",
        isActive: true,
      } as any),
    ).toBe(true);
  });

  it("treats admin access from systemPermission instead of raw role", () => {
    const user = {
      id: "user-3",
      role: "worker",
      systemPermission: "admin",
    } as any;

    expect(isAdmin(user)).toBe(true);
    expect(isManagerOrAdmin(user)).toBe(true);
  });
});
