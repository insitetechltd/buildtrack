import { normalizeAuthUser } from "@/state/authStore";

describe("auth store user normalization", () => {
  it("materializes systemPermission from a legacy role", () => {
    expect(
      normalizeAuthUser({
        id: "user-1",
        name: "Worker User",
        email: "worker@example.com",
        role: "worker",
        companyId: "company-1",
        position: "Worker",
        phone: "12345678",
        createdAt: "2026-06-20T00:00:00.000Z",
      } as any).systemPermission,
    ).toBe("member");
  });

  it("preserves an explicit systemPermission", () => {
    expect(
      normalizeAuthUser({
        id: "user-2",
        name: "Admin User",
        email: "admin@example.com",
        role: "worker",
        systemPermission: "admin",
        companyId: "company-1",
        position: "Admin",
        phone: "12345679",
        createdAt: "2026-06-20T00:00:00.000Z",
      } as any).systemPermission,
    ).toBe("admin");
  });

  it("materializes admin from PROD system_permission when role column is absent", () => {
    const user = normalizeAuthUser({
      id: "sara-1",
      name: "Sara",
      email: "sara@insitetest.com",
      system_permission: "admin",
      company_id: "company-1",
      position: "Company Admin",
    } as any);

    expect(user.systemPermission).toBe("admin");
    expect(user.role).toBe("admin");
  });
});
