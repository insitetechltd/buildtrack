/**
 * M-WEB-01 desk access — CA / PM / Worker + PA (grilled 2026-10-16).
 * UX hiding only; RLS remains the enforcement layer.
 */
import {
  getUserSystemPermission,
  type User,
  type UserProjectAssignment,
} from "@/types/buildtrack";
import { isProjectAdminAssignment } from "@/ui/contracts/projectMembership";

export type WebSeatBand = "ca" | "pm" | "worker";

export function webSeatBand(user: User | null | undefined): WebSeatBand | null {
  if (!user) return null;
  const perm = getUserSystemPermission(user);
  if (perm === "admin") return "ca";
  if (perm === "manager") return "pm";
  return "worker";
}

export function isCompanyAdminUser(user: User | null | undefined): boolean {
  return webSeatBand(user) === "ca";
}

/** Company Users + Projects admin list — CA only. */
export function canAccessCompanyAdmin(user: User | null | undefined): boolean {
  return isCompanyAdminUser(user);
}

export function isPaOnProject(
  user: User | null | undefined,
  projectId: string,
  assignments: UserProjectAssignment[],
): boolean {
  if (!user || !projectId) return false;
  return assignments.some(
    (a) =>
      a.userId === user.id &&
      a.projectId === projectId &&
      a.isActive &&
      isProjectAdminAssignment(a),
  );
}

/**
 * Project workspace / team / tasks / CSV import — CA (any project) or PA on that project.
 */
export function canManageProjectDesk(
  user: User | null | undefined,
  projectId: string,
  assignments: UserProjectAssignment[],
): boolean {
  if (isCompanyAdminUser(user)) return true;
  return isPaOnProject(user, projectId, assignments);
}

export function defaultWebPathAfterLogin(_user: User): string {
  // Landing = Desk (per-project KPI overview). Company account overview is CA-only at /a/company.
  return "/desk";
}
