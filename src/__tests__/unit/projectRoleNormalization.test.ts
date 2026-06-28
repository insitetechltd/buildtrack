import { useProjectStore } from "@/state/projectStore.supabase";

describe("project assignment normalization", () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [
        {
          id: "project-1",
          name: "Project One",
          description: "Test project",
          status: "active",
          startDate: "2026-06-20T00:00:00.000Z",
          location: "Site",
          clientInfo: { name: "Client" },
          createdBy: "user-9",
          createdAt: "2026-06-20T00:00:00.000Z",
          updatedAt: "2026-06-20T00:00:00.000Z",
        },
      ],
      userAssignments: [
        {
          id: "assignment-1",
          userId: "user-1",
          projectId: "project-1",
          category: "worker",
          projectRole: "lead_project_manager",
          assignedAt: "2026-06-20T00:00:00.000Z",
          assignedBy: "user-9",
          isActive: true,
        },
      ],
    } as any);
  });

  it("finds a lead PM when an assignment uses projectRole", () => {
    expect(useProjectStore.getState().getLeadPMForProject("project-1")).toBe("user-1");
  });

  it("counts users by normalized project role", () => {
    const stats = useProjectStore.getState().getProjectStats("project-1");

    expect(stats.usersByCategory.lead_project_manager).toBe(1);
    expect(stats.usersByCategory.worker).toBeUndefined();
  });
});
