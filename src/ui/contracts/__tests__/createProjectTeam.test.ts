import {
  buildCreateProjectRosterCandidates,
  countCreateProjectAdmins,
  normalizeCreateProjectTeamMembers,
  placeCreateProjectTeamMembers,
} from "../createProjectTeam";
import type { User } from "@/types/buildtrack";

function user(partial: Partial<User> & Pick<User, "id" | "name" | "companyId">): User {
  return {
    email: `${partial.id}@test.com`,
    role: "member",
    systemPermission: "member",
    isActive: true,
    ...partial,
  } as User;
}

describe("createProjectTeam", () => {
  const ca = user({
    id: "ca-1",
    name: "Sara",
    companyId: "co-1",
    role: "admin",
    systemPermission: "admin",
  });
  const pm = user({
    id: "pm-1",
    name: "Pat",
    companyId: "co-1",
    role: "manager",
    systemPermission: "manager",
  });
  const worker = user({
    id: "w-1",
    name: "Wes",
    companyId: "co-1",
    role: "member",
    systemPermission: "member",
  });
  const otherCo = user({
    id: "x-1",
    name: "Other",
    companyId: "co-2",
    role: "admin",
    systemPermission: "admin",
  });

  it("lists same-company users with PA eligibility flags", () => {
    const rows = buildCreateProjectRosterCandidates(
      [ca, pm, worker, otherCo],
      "co-1",
    );
    expect(rows.map((r) => r.userId).sort()).toEqual(["ca-1", "pm-1", "w-1"]);
    expect(rows.find((r) => r.userId === "w-1")?.canBeProjectAdmin).toBe(false);
    expect(rows.find((r) => r.userId === "ca-1")?.canBeProjectAdmin).toBe(true);
  });

  it("normalizes dual PA and illegal worker PA crowns", () => {
    const usersById = { "ca-1": ca, "pm-1": pm, "w-1": worker };
    const normalized = normalizeCreateProjectTeamMembers(
      [
        { userId: "ca-1", asProjectAdmin: true },
        { userId: "pm-1", asProjectAdmin: true },
        { userId: "w-1", asProjectAdmin: true },
      ],
      usersById,
    );
    expect(normalized).toEqual([
      { userId: "ca-1", asProjectAdmin: true },
      { userId: "pm-1", asProjectAdmin: false },
      { userId: "w-1", asProjectAdmin: false },
    ]);
    expect(countCreateProjectAdmins(normalized)).toBe(1);
  });

  it("places members via upsert and continues after a failure", async () => {
    const assignUserToProject = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("boom"));
    const updateUserProjectCategory = jest.fn().mockResolvedValue(undefined);

    const result = await placeCreateProjectTeamMembers({
      writer: { assignUserToProject, updateUserProjectCategory },
      projectId: "p1",
      assignedBy: "ca-1",
      members: [
        { userId: "w-1", asProjectAdmin: false },
        { userId: "pm-1", asProjectAdmin: true },
      ],
      usersById: { "w-1": worker, "pm-1": pm },
    });

    expect(result.placed).toEqual(["w-1"]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.userId).toBe("pm-1");
    expect(assignUserToProject).toHaveBeenCalled();
  });
});
