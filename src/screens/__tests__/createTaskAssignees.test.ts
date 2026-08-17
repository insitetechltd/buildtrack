import { getAssignableProjectUsers } from "@/screens/createTaskAssignees";
import type { User, UserProjectAssignment } from "@/types/buildtrack";

describe("getAssignableProjectUsers", () => {
  const users: User[] = [
    {
      id: "user-1",
      name: "Project Manager",
      email: "pm@example.com",
      role: "manager",
      companyId: "company-1",
      position: "Project Manager",
      phone: "111-111-1111",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "user-2",
      name: "Assigned Worker",
      email: "worker@example.com",
      role: "worker",
      companyId: "company-1",
      position: "Electrician",
      phone: "222-222-2222",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "user-3",
      name: "Other Project User",
      email: "other@example.com",
      role: "worker",
      companyId: "company-1",
      position: "Plumber",
      phone: "333-333-3333",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "user-4",
      name: "Former Worker",
      email: "deleted-user-4@invalid.local",
      role: "worker",
      companyId: "company-1",
      position: "Electrician",
      phone: "",
      createdAt: "2026-01-01T00:00:00.000Z",
      deletedAt: "2026-08-17T00:00:00.000Z",
    },
  ];

  it("returns each active project member once and excludes users outside the selected project", () => {
    const assignments: UserProjectAssignment[] = [
      {
        id: "assignment-1",
        userId: "user-1",
        projectId: "project-1",
        category: "lead_project_manager",
        assignedAt: "2026-01-02T00:00:00.000Z",
        assignedBy: "admin-1",
        isActive: true,
      },
      {
        id: "assignment-2",
        userId: "user-1",
        projectId: "project-1",
        category: "contractor",
        assignedAt: "2026-01-03T00:00:00.000Z",
        assignedBy: "admin-1",
        isActive: true,
      },
      {
        id: "assignment-3",
        userId: "user-2",
        projectId: "project-1",
        category: "worker",
        assignedAt: "2026-01-04T00:00:00.000Z",
        assignedBy: "admin-1",
        isActive: true,
      },
      {
        id: "assignment-4",
        userId: "user-3",
        projectId: "project-2",
        category: "worker",
        assignedAt: "2026-01-05T00:00:00.000Z",
        assignedBy: "admin-1",
        isActive: true,
      },
      {
        id: "assignment-5",
        userId: "user-2",
        projectId: "project-1",
        category: "worker",
        assignedAt: "2026-01-06T00:00:00.000Z",
        assignedBy: "admin-1",
        isActive: false,
      },
    ];

    expect(
      getAssignableProjectUsers({
        projectId: "project-1",
        assignments,
        users,
      }).map((user) => user.id),
    ).toEqual(["user-1", "user-2"]);
  });

  it("returns an empty list when no project is selected", () => {
    expect(
      getAssignableProjectUsers({
        projectId: "",
        assignments: [],
        users,
      }),
    ).toEqual([]);
  });

  it("keeps deleted accounts out of the live assignee picker", () => {
    const assignments: UserProjectAssignment[] = [
      {
        id: "assignment-6",
        userId: "user-4",
        projectId: "project-1",
        category: "worker",
        assignedAt: "2026-01-07T00:00:00.000Z",
        assignedBy: "admin-1",
        isActive: true,
      },
      {
        id: "assignment-7",
        userId: "user-2",
        projectId: "project-1",
        category: "worker",
        assignedAt: "2026-01-08T00:00:00.000Z",
        assignedBy: "admin-1",
        isActive: true,
      },
    ];

    expect(
      getAssignableProjectUsers({
        projectId: "project-1",
        assignments,
        users,
      }).map((user) => user.id),
    ).toEqual(["user-2"]);
  });
});
