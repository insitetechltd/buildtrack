import {
  getUserSystemPermission,
  type User,
} from "@/types/buildtrack";
import { userAccountIsDeleted } from "@/types/userAccountRetention";

export type SeatUsageCounts = {
  pmCount: number;
  workerCount: number;
};

export type SeatUsageLimits = {
  pmSeatLimit: number;
  workerSeatLimit: number;
};

/**
 * Pre-checkout / missing entitlements defaults (Starter product law).
 * Matches DB `company_seat_limits` + `bootstrap_company_starter_entitlements`.
 */
export const STARTER_DEFAULT_SEAT_LIMITS: SeatUsageLimits = {
  pmSeatLimit: 1,
  workerSeatLimit: 5,
};

/** Resolve seat caps; null/undefined entitlements → Starter defaults (founding CA safe). */
export function resolveSeatLimits(
  limits: SeatUsageLimits | null | undefined,
): SeatUsageLimits {
  if (
    !limits ||
    !Number.isFinite(limits.pmSeatLimit) ||
    !Number.isFinite(limits.workerSeatLimit)
  ) {
    return { ...STARTER_DEFAULT_SEAT_LIMITS };
  }
  return limits;
}

export type SeatClass = "pm" | "worker" | "none";

/**
 * Optional deployable-seat override on a user row.
 * Used when CA (company role `admin`) is upgraded to a PM seat while remaining CA.
 * Absent/undefined → derive from company role (CA defaults to worker).
 */
export type DeployableSeat = "pm" | "worker";

export type SeatUserFields = Pick<
  User,
  "id" | "role" | "systemPermission" | "isPending" | "isActive"
> & {
  is_pending?: boolean | null;
  is_active?: boolean | null;
  /** Explicit PM/Worker deployable seat; CA default is worker when unset. */
  deployableSeat?: DeployableSeat | null;
  deployable_seat?: DeployableSeat | null;
};

/**
 * Map company role / system permission to seat class.
 *
 * Law (2026-08-25): CA is company authority, not a PM seat by default.
 * - CA (`admin` / `company_admin`) → worker seat (deployable default)
 * - PM (`manager` / `supervisor`) → pm seat
 * - Worker (`member` / `worker` / `foreman`) → worker seat
 */
export function seatClassForRole(
  role: string | null | undefined,
): SeatClass {
  const key = (role || "").toLowerCase();
  if (!key) {
    return "none";
  }
  if (key === "manager" || key === "supervisor") {
    return "pm";
  }
  if (
    key === "admin" ||
    key === "company_admin" ||
    key === "worker" ||
    key === "member" ||
    key === "foreman"
  ) {
    return "worker";
  }
  return "worker";
}

function readDeployableSeat(
  user: SeatUserFields,
): DeployableSeat | null {
  const raw = user.deployableSeat ?? user.deployable_seat;
  if (raw === "pm" || raw === "worker") {
    return raw;
  }
  return null;
}

/**
 * Seat bucket for one user: explicit deployable seat wins; else role mapping.
 * CA without override → worker. CA with deployableSeat=pm → pm (entitlement-gated).
 */
export function seatClassForUser(user: SeatUserFields): SeatClass {
  const override = readDeployableSeat(user);
  if (override === "pm") {
    return "pm";
  }
  if (override === "worker") {
    return "worker";
  }
  const permission = getUserSystemPermission(user as User);
  return seatClassForRole(permission || user.role);
}

/**
 * Count active seat holders. Soft-inactive users free their seat.
 * Pending invites hold a seat. CA defaults to worker unless deployableSeat=pm.
 */
export function countCompanySeatUsage(
  users: Array<SeatUserFields>,
): SeatUsageCounts {
  let pmCount = 0;
  let workerCount = 0;

  for (const user of users) {
    if (userAccountIsDeleted(user as User)) {
      continue;
    }
    const isActive =
      user.isActive !== false &&
      (user as { is_active?: boolean | null }).is_active !== false;
    if (!isActive) {
      continue;
    }

    const seatClass = seatClassForUser(user);
    if (seatClass === "pm") {
      pmCount += 1;
      continue;
    }
    if (seatClass === "worker") {
      workerCount += 1;
    }
  }

  return { pmCount, workerCount };
}

export function seatLimitReached(
  seatType: "pm" | "worker",
  usage: SeatUsageCounts,
  limits: SeatUsageLimits,
): boolean {
  if (seatType === "pm") {
    return usage.pmCount >= limits.pmSeatLimit;
  }
  return usage.workerCount >= limits.workerSeatLimit;
}

/**
 * Project seat usage after changing one user's company role / active flag /
 * deployable seat. Used before role assignment so entitlement is checked.
 */
export function projectSeatUsageAfterChange(
  users: Array<SeatUserFields>,
  change: {
    userId: string;
    nextRole?: string | null;
    nextIsActive?: boolean;
    nextDeployableSeat?: DeployableSeat | null;
  },
): SeatUsageCounts {
  const projected = users.map((user) => {
    if (user.id !== change.userId) {
      return user;
    }
    const nextRole = change.nextRole ?? user.role;
    const nextIsActive =
      change.nextIsActive !== undefined
        ? change.nextIsActive
        : user.isActive !== false &&
          (user as { is_active?: boolean | null }).is_active !== false;
    const nextDeployable =
      change.nextDeployableSeat !== undefined
        ? change.nextDeployableSeat
        : readDeployableSeat(user);
    return {
      ...user,
      role: nextRole as User["role"],
      systemPermission: undefined,
      isActive: nextIsActive,
      is_active: nextIsActive,
      deployableSeat: nextDeployable,
      deployable_seat: nextDeployable,
    };
  });

  const existing = users.some((user) => user.id === change.userId);
  if (!existing && change.nextRole) {
    projected.push({
      id: change.userId,
      role: change.nextRole as User["role"],
      isActive: change.nextIsActive !== false,
      is_active: change.nextIsActive !== false,
      isPending: true,
      deployableSeat: change.nextDeployableSeat ?? null,
      deployable_seat: change.nextDeployableSeat ?? null,
    });
  }

  return countCompanySeatUsage(projected);
}

export function roleChangeExceedsSeatLimit(
  users: Array<SeatUserFields>,
  limits: SeatUsageLimits,
  change: {
    userId: string;
    nextRole?: string | null;
    nextIsActive?: boolean;
    nextDeployableSeat?: DeployableSeat | null;
  },
): { exceeds: boolean; seatType: "pm" | "worker" | null; usage: SeatUsageCounts } {
  const usage = projectSeatUsageAfterChange(users, change);
  if (usage.pmCount > limits.pmSeatLimit) {
    return { exceeds: true, seatType: "pm", usage };
  }
  if (usage.workerCount > limits.workerSeatLimit) {
    return { exceeds: true, seatType: "worker", usage };
  }
  return { exceeds: false, seatType: null, usage };
}

export function formatSeatUsageSummary(
  usage: SeatUsageCounts,
  limits: SeatUsageLimits,
): string {
  return `PM ${usage.pmCount}/${limits.pmSeatLimit} · Worker ${usage.workerCount}/${limits.workerSeatLimit}`;
}
