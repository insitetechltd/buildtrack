import {
  mapCompanyProjectRow,
  mapCompanyUserRow,
  permissionLabel,
} from "../companyDesk";

describe("companyDesk mappers (M-WEB-01)", () => {
  it("maps user seats and pending flags", () => {
    const row = mapCompanyUserRow({
      id: "u1",
      name: "Carol",
      email: "carol.admina@test.com",
      phone: null,
      system_permission: "admin",
      is_pending: false,
      is_active: true,
    });
    expect(row.systemPermission).toBe("admin");
    expect(permissionLabel(row)).toBe("CA");
    expect(permissionLabel(mapCompanyUserRow({ id: "u3", system_permission: "member" }))).toBe(
      "Worker",
    );
  });

  it("maps supervisor to PM band", () => {
    const row = mapCompanyUserRow({
      id: "u2",
      name: "John",
      system_permission: "supervisor",
    });
    expect(row.systemPermission).toBe("manager");
    expect(permissionLabel(row)).toBe("PM");
  });

  it("maps project rows without archived column", () => {
    const row = mapCompanyProjectRow(
      {
        id: "p1",
        name: "Site A",
        description: "Lobby",
        status: "active",
        location: "HK",
        start_date: "2026-09-01T00:00:00Z",
        budget: 5000,
        client_info: { name: "Acme" },
        created_by: "u1",
        created_at: "2026-10-01T00:00:00Z",
      },
      {
        createdByName: "Carol",
        memberCount: 2,
        taskCount: 5,
      },
    );
    expect(row.name).toBe("Site A");
    expect(row.clientName).toBe("Acme");
    expect(row.createdByName).toBe("Carol");
    expect(row.memberCount).toBe(2);
    expect(row.taskCount).toBe(5);
    expect(row.budget).toBe(5000);
  });
});
