import {
  canAccessCompanyAdmin,
  canManageProjectDesk,
  defaultWebPathAfterLogin,
  isPaOnProject,
  webSeatBand,
} from "../access";
import type { User } from "@/types/buildtrack";
import type { UserProjectAssignment } from "@/ui/contracts/projectMembership";

function user(partial: Partial<User> & Pick<User, "id">): User {
  return {
    name: "T",
    email: "t@test.com",
    role: "member",
    systemPermission: "member",
    ...partial,
  } as User;
}

describe("web access (M-WEB-01)", () => {
  const ca = user({ id: "ca", systemPermission: "admin", role: "admin" });
  const pm = user({ id: "pm", systemPermission: "manager", role: "manager" });
  const worker = user({ id: "w", systemPermission: "member", role: "worker" });

  const paAssignment: UserProjectAssignment = {
    id: "upa-1",
    userId: "pm",
    projectId: "proj-1",
    category: "lead_project_manager",
    isActive: true,
  } as UserProjectAssignment;

  it("maps seats to ca / pm / worker", () => {
    expect(webSeatBand(ca)).toBe("ca");
    expect(webSeatBand(pm)).toBe("pm");
    expect(webSeatBand(worker)).toBe("worker");
  });

  it("company admin routes are CA-only", () => {
    expect(canAccessCompanyAdmin(ca)).toBe(true);
    expect(canAccessCompanyAdmin(pm)).toBe(false);
    expect(canAccessCompanyAdmin(worker)).toBe(false);
  });

  it("project desk allows CA or PA on that project", () => {
    expect(canManageProjectDesk(ca, "proj-1", [])).toBe(true);
    expect(canManageProjectDesk(pm, "proj-1", [paAssignment])).toBe(true);
    expect(canManageProjectDesk(pm, "proj-1", [])).toBe(false);
    expect(canManageProjectDesk(worker, "proj-1", [paAssignment])).toBe(false);
  });

  it("detects PA assignment", () => {
    expect(isPaOnProject(pm, "proj-1", [paAssignment])).toBe(true);
    expect(isPaOnProject(pm, "proj-2", [paAssignment])).toBe(false);
  });

  it("dispatches everyone to Desk home after login", () => {
    expect(defaultWebPathAfterLogin(ca)).toBe("/desk");
    expect(defaultWebPathAfterLogin(pm)).toBe("/desk");
    expect(defaultWebPathAfterLogin(worker)).toBe("/desk");
  });
});

