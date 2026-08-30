import {
  parseCompanyDetail,
  parseCompanyListResult,
  parseGlobalProjectListResult,
  parseGlobalUserListResult,
  parseProjectDetail,
  parseProjectListResult,
  parseProjectMembersResult,
  parseUserDetail,
  parseUserListResult,
  OwnerTenantError,
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
