import {
  canViewerSelectTask,
  filterTasksForViewer,
  isProjectScopeReady,
  resolveTaskSelectRoleBand,
} from "../taskVisibilityPermissions";

describe("taskVisibilityPermissions", () => {
  const john = { id: "john", role: "manager", companyId: "co-a" };
  const bob = { id: "bob", role: "worker", companyId: "co-a" };
  const projectA = { id: "proj-a", companyId: "co-a" };

  it("maps role bands for app-side visibility", () => {
    expect(resolveTaskSelectRoleBand({ role: "worker" })).toBe("worker");
    expect(resolveTaskSelectRoleBand({ role: "foreman" })).toBe("worker");
    expect(resolveTaskSelectRoleBand({ role: "supervisor" })).toBe("manager");
    expect(resolveTaskSelectRoleBand({ systemPermission: "admin" })).toBe("admin");
  });

  it("hides John→John self-assign from worker Bob", () => {
    const task = {
      id: "t1",
      projectId: "proj-a",
      assignedBy: "john",
      assignedTo: ["john"],
    };

    expect(
      canViewerSelectTask({
        viewer: bob,
        task,
        project: projectA,
        viewerProjectIds: ["proj-a"],
      }),
    ).toBe(false);

    expect(
      canViewerSelectTask({
        viewer: john,
        task,
        project: projectA,
        viewerProjectIds: ["proj-a"],
      }),
    ).toBe(true);
  });

  it("keeps tasks Bob is assigned to or created", () => {
    expect(
      canViewerSelectTask({
        viewer: bob,
        task: {
          projectId: "proj-a",
          assignedBy: "john",
          assignedTo: ["bob"],
        },
        project: projectA,
        viewerProjectIds: ["proj-a"],
      }),
    ).toBe(true);

    expect(
      canViewerSelectTask({
        viewer: bob,
        task: {
          projectId: "proj-a",
          assignedBy: "bob",
          assignedTo: ["alice"],
        },
        project: projectA,
        viewerProjectIds: ["proj-a"],
      }),
    ).toBe(true);
  });

  it("lets managers see project tasks including peer self-assign", () => {
    const tasks = [
      {
        id: "self",
        projectId: "proj-a",
        assignedBy: "john",
        assignedTo: ["john"],
      },
      {
        id: "other-proj",
        projectId: "proj-b",
        assignedBy: "john",
        assignedTo: ["john"],
      },
    ];

    expect(
      filterTasksForViewer({
        viewer: { id: "sarah", role: "manager", companyId: "co-a" },
        tasks,
        projectsById: {
          "proj-a": projectA,
          "proj-b": { id: "proj-b", companyId: "co-a" },
        },
        viewerProjectIds: ["proj-a"],
      }).map((task) => task.id),
    ).toEqual(["self"]);
  });

  it("scopes admins to assigned projects (not all company tasks)", () => {
    const peerTask = {
      projectId: "proj-a",
      assignedBy: "x",
      assignedTo: ["y"],
    };

    expect(
      canViewerSelectTask({
        viewer: { id: "henry", systemPermission: "admin", companyId: "co-a" },
        task: peerTask,
        project: projectA,
        viewerProjectIds: [],
      }),
    ).toBe(false);

    expect(
      canViewerSelectTask({
        viewer: { id: "henry", systemPermission: "admin", companyId: "co-a" },
        task: peerTask,
        project: projectA,
        viewerProjectIds: ["proj-a"],
      }),
    ).toBe(true);
  });

  it("denies admin/manager when project scope is missing (callers must hold loading)", () => {
    const peerSelfAssign = {
      id: "self",
      projectId: "proj-a",
      assignedBy: "john",
      assignedTo: ["john"],
    };

    expect(
      canViewerSelectTask({
        viewer: { id: "henry", systemPermission: "admin", companyId: "co-a" },
        task: peerSelfAssign,
        project: null,
      }),
    ).toBe(false);

    expect(
      canViewerSelectTask({
        viewer: { id: "sarah", role: "manager", companyId: "co-a" },
        task: peerSelfAssign,
        project: null,
        viewerProjectIds: [],
      }),
    ).toBe(false);

    expect(
      canViewerSelectTask({
        viewer: bob,
        task: peerSelfAssign,
        project: null,
        viewerProjectIds: [],
      }),
    ).toBe(false);
  });

  it("isProjectScopeReady is false until projects exist or fetched once", () => {
    expect(isProjectScopeReady({ projectCount: 0 })).toBe(false);
    expect(isProjectScopeReady({ projectCount: 0, hasFetchedProjectsOnce: true })).toBe(true);
    expect(isProjectScopeReady({ projectCount: 2 })).toBe(true);
  });
});
