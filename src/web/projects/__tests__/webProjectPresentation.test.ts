import type { WebCompanyProjectRow } from "@/web/data/companyDesk";
import {
  filterWebProjects,
  toProjectsScreenItem,
  webProjectStatusLabel,
  webProjectStatusTone,
} from "../webProjectPresentation";

function project(partial: Partial<WebCompanyProjectRow> & Pick<WebCompanyProjectRow, "id" | "name">): WebCompanyProjectRow {
  return {
    description: null,
    status: "active",
    location: null,
    startDate: null,
    budget: null,
    clientName: null,
    createdById: null,
    createdByName: null,
    leadPmName: null,
    memberCount: 0,
    taskCount: 0,
    createdAt: null,
    ...partial,
  };
}

describe("webProjectPresentation", () => {
  it("maps status labels like mobile (active → On-going)", () => {
    expect(webProjectStatusLabel("active")).toBe("On-going");
    expect(webProjectStatusTone("active")).toBe("success");
    expect(webProjectStatusTone("cancelled")).toBe("danger");
  });

  it("filters by search and status", () => {
    const rows = [
      project({ id: "1", name: "Project A", status: "active", location: "HK" }),
      project({ id: "2", name: "QA probe", status: "planning" }),
    ];
    expect(filterWebProjects(rows, "project a", "all")).toHaveLength(1);
    expect(filterWebProjects(rows, "", "planning")).toHaveLength(1);
  });

  it("builds ProjectsScreenProjectItem for shared card", () => {
    const item = toProjectsScreenItem(
      project({
        id: "p1",
        name: "Site",
        description: "Fit-out",
        memberCount: 3,
        taskCount: 11,
        createdByName: "John",
        budget: 1000,
      }),
    );
    expect(item.projectId).toBe("p1");
    expect(item.memberCountLabel).toBe("3 members");
    expect(item.taskCountLabel).toBe("11 tasks");
    expect(item.budgetLabel).toBe("Budget: $1,000");
    expect(item.canEdit).toBe(false);
  });
});
