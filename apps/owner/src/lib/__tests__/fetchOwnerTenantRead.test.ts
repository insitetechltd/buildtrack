import {
  parseCompanyDetail,
  parseCompanyListResult,
  parseGlobalProjectListResult,
  parseGlobalUserListResult,
  parseProjectDetail,
  parseProjectListResult,
  parseProjectMembersResult,
  parseTaskDetail,
  parseTaskListResult,
  parseUserDetail,
  parseUserListResult,
  OwnerTenantError,
  formatErrorDetail,
  mapOwnerTenantHttpError,
} from "../fetchOwnerTenantRead";
import { formatSeatUsageLine, tasksByStatusToHistogram } from "../ownerEntitlementView";

describe("parseCompanyListResult", () => {
  it("parses company rows", () => {
    const result = parseCompanyListResult({
      companies: [
        {
          id: "c1",
          name: "Acme",
          type: "general_contractor",
          isActive: true,
          email: null,
          phone: null,
          createdAt: "2026-01-01T00:00:00Z",
          projectCount: 2,
          userCount: 5,
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
    });
    expect(result.companies[0].name).toBe("Acme");
    expect(result.companies[0].projectCount).toBe(2);
  });
});

describe("parseCompanyDetail", () => {
  it("parses entitlement and stats", () => {
    const detail = parseCompanyDetail({
      company: {
        id: "c1",
        name: "Acme",
        type: "general_contractor",
        description: null,
        address: null,
        phone: null,
        email: null,
        website: null,
        logo: null,
        isActive: true,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      },
      entitlement: {
        tierSlug: "starter",
        tierDisplayName: "Starter",
        subscriptionStatus: "active",
        billingPhase: "paid",
        hasStripeSubscription: true,
        meterLimits: { pm_seats: 1, worker_seats: 5 },
        trialEndsAt: null,
        statusLabel: "Starter · active",
        limitsLabel: "PM 1 · Worker 5",
      },
      usage: {
        pmSeats: 1,
        workerSeats: 3,
        pmSeatLimit: 1,
        workerSeatLimit: 5,
        projectCount: 2,
        projectLimit: 10,
      },
      stats: { projects: 2, tasks: 12, users: 4 },
    });
    expect(detail.stats.tasks).toBe(12);
    expect(detail.entitlement.tierDisplayName).toBe("Starter");
  });
});

describe("parseProjectDetail", () => {
  it("parses tasksByStatus", () => {
    const detail = parseProjectDetail({
      project: {
        id: "p1",
        name: "Site A",
        description: "",
        status: "active",
        startDate: "2026-01-01",
        endDate: null,
        location: null,
        budget: null,
        companyId: "c1",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      tasksByStatus: { new: 2, approved: 1 },
      taskTotal: 3,
    });
    expect(detail.tasksByStatus.new).toBe(2);
    expect(detail.taskTotal).toBe(3);
  });
});

describe("parseTaskListResult", () => {
  it("parses task rows", () => {
    const result = parseTaskListResult({
      tasks: [
        {
          id: "t1",
          title: "Fix leak",
          status: "in_progress",
          priority: "high",
          projectId: "p1",
          projectName: "Tower",
          primaryAssigneeId: "u1",
          primaryAssigneeName: "Pat",
          completionPercentage: 40,
          updatedAt: "2026-01-02",
          createdAt: "2026-01-01",
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
      truncated: false,
    });
    expect(result.tasks[0].title).toBe("Fix leak");
    expect(result.total).toBe(1);
  });

  it("parses relationRoles for HQ user-scoped lists", () => {
    const result = parseTaskListResult({
      tasks: [
        {
          id: "t1",
          title: "Fix leak",
          status: "in_progress",
          priority: "high",
          projectId: "p1",
          projectName: "Tower",
          primaryAssigneeId: null,
          primaryAssigneeName: null,
          completionPercentage: 0,
          updatedAt: "2026-01-02",
          createdAt: "2026-01-01",
          relationRoles: ["assigner", "assignee", "bogus"],
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
      truncated: false,
    });
    expect(result.tasks[0].relationRoles).toEqual(["assigner", "assignee"]);
  });
});

describe("parseTaskDetail", () => {
  it("parses task detail and activities", () => {
    const detail = parseTaskDetail({
      task: {
        id: "t1",
        title: "Fix leak",
        description: "Basement",
        status: "in_progress",
        priority: "high",
        category: null,
        taskReference: null,
        dueDate: null,
        completionPercentage: 40,
        locationOnSite: "B1",
        tags: ["plumbing"],
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
        projectId: "p1",
        projectName: "Tower",
        projectStatus: "active",
        companyId: "c1",
        primaryAssigneeId: "u1",
        primaryAssigneeName: "Pat",
        assignedById: null,
        assignedByName: null,
        acceptedById: null,
        acceptedByName: null,
        reviewedById: null,
        reviewedByName: null,
        assigneeCount: 1,
      },
      recentActivities: [
        {
          id: "a1",
          activityType: "progress_update",
          timestamp: "2026-01-02T00:00:00Z",
          description: "40%",
          completionPercentage: 40,
          userId: "u1",
          userName: "Pat",
        },
      ],
    });
    expect(detail.task.title).toBe("Fix leak");
    expect(detail.recentActivities).toHaveLength(1);
  });
});

describe("parseGlobalProjectListResult", () => {
  it("parses cross-company projects with company fields", () => {
    const result = parseGlobalProjectListResult({
      projects: [
        {
          id: "p1",
          name: "Tower",
          status: "active",
          startDate: "2026-01-01",
          endDate: null,
          location: "HK",
          createdAt: "2026-01-01",
          taskCount: 4,
          memberCount: 2,
          companyId: "c1",
          companyName: "Acme",
        },
      ],
      total: 12,
      limit: 50,
      offset: 0,
      truncated: true,
    });
    expect(result.projects[0].companyName).toBe("Acme");
    expect(result.projects[0].companyId).toBe("c1");
    expect(result.projects[0].memberCount).toBe(2);
    expect(result.total).toBe(12);
    expect(result.truncated).toBe(true);
  });
});

describe("parseGlobalUserListResult", () => {
  it("parses cross-company users with project counts", () => {
    const result = parseGlobalUserListResult({
      users: [
        {
          id: "u1",
          name: "Pat",
          email: "p@x.com",
          phone: "",
          role: "admin",
          position: "",
          isPending: false,
          isActive: true,
          seatClass: "worker",
          createdAt: "2026-01-01",
          projectCount: 5,
          companyId: "c1",
          companyName: "Acme",
        },
      ],
      total: 9,
      limit: 50,
      offset: 0,
      truncated: false,
    });
    expect(result.users[0].projectCount).toBe(5);
    expect(result.users[0].companyName).toBe("Acme");
    expect(result.total).toBe(9);
  });
});

describe("parseProjectMembersResult", () => {
  it("parses members", () => {
    const result = parseProjectMembersResult({
      members: [
        {
          userId: "u1",
          name: "Pat",
          email: "p@x.com",
          phone: "",
          role: "admin",
          position: "",
          isPending: false,
          isActive: true,
          seatClass: "pm",
          projectRole: "project_admin",
        },
      ],
      truncated: false,
      limit: 100,
    });
    expect(result.members[0].userId).toBe("u1");
    expect(result.members[0].projectRole).toBe("project_admin");
  });
});

describe("parseUserListResult", () => {
  it("parses users", () => {
    const result = parseUserListResult({
      users: [
        {
          id: "u1",
          name: "Pat",
          email: "p@x.com",
          phone: "",
          role: "admin",
          position: "",
          isPending: false,
          isActive: true,
          seatClass: "worker",
          createdAt: "2026-01-01",
          projectCount: 3,
        },
      ],
      truncated: false,
      limit: 100,
    });
    expect(result.users[0].seatClass).toBe("worker");
    expect(result.users[0].projectCount).toBe(3);
  });
});

describe("parseUserDetail", () => {
  it("parses assignments", () => {
    const detail = parseUserDetail({
      user: {
        id: "u1",
        name: "Pat",
        email: "p@x.com",
        phone: "",
        companyId: "c1",
        role: "admin",
        position: "",
        isPending: false,
        isActive: true,
        seatClass: "worker",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        approvedAt: null,
      },
      assignments: [
        {
          projectId: "p1",
          projectName: "Site A",
          projectStatus: "active",
          projectRole: "lead_project_manager",
          isActive: true,
        },
      ],
    });
    expect(detail.assignments[0].projectRole).toBe("lead_project_manager");
  });
});

describe("mapOwnerTenantHttpError", () => {
  it("maps forbidden", () => {
    expect(mapOwnerTenantHttpError(403, { error: "forbidden" }).code).toBe("forbidden");
  });

  it("stringifies object detail from edge", () => {
    const err = mapOwnerTenantHttpError(500, {
      error: "internal_error",
      detail: { message: "Could not embed task_assignments" },
    });
    expect(err.message).toContain("task_assignments");
  });
});

describe("formatErrorDetail", () => {
  it("unwraps nested invoke error objects", () => {
    expect(
      formatErrorDetail({
        error: "internal_error",
        detail: "URI too long",
      }),
    ).toBe("URI too long");
  });

  it("rejects object Object placeholder", () => {
    expect(formatErrorDetail("[object Object]")).toBeNull();
  });
});

describe("ownerEntitlementView helpers", () => {
  it("formats seat usage", () => {
    expect(formatSeatUsageLine(1, 2, 3, 5)).toBe("PM 1/2 · Worker 3/5");
  });

  it("builds status histogram buckets", () => {
    const hist = tasksByStatusToHistogram({ new: 2, approved: 1 });
    expect(hist.buckets).toHaveLength(2);
  });
});

describe("parse errors", () => {
  it("throws on bad list", () => {
    expect(() => parseCompanyListResult(null)).toThrow(OwnerTenantError);
  });
});
