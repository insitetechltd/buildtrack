import type { CompanyEntitlementView } from "./companyEntitlementSummary";
import { fetchCompanyEntitlementView } from "@/api/fetchCompanyEntitlements";

export type SeatLimitSnapshot = {
  pmSeatLimit: number;
  workerSeatLimit: number;
};

export function readSeatLimitsFromEntitlement(
  view: CompanyEntitlementView | null,
): SeatLimitSnapshot | null {
  const pm = view?.meterLimits?.pm_seats;
  const worker = view?.meterLimits?.worker_seats;
  if (typeof pm !== "number" || typeof worker !== "number") {
    return null;
  }
  return { pmSeatLimit: pm, workerSeatLimit: worker };
}

/**
 * Poll entitlements until seat caps rise past a baseline (Stripe webhook lag).
 * Returns null if the increase never appears within the timeout.
 */
export async function waitForSeatLimitIncrease(options: {
  companyId: string;
  baseline: SeatLimitSnapshot;
  seatType: "pm" | "worker";
  timeoutMs?: number;
  intervalMs?: number;
  fetchView?: typeof fetchCompanyEntitlementView;
}): Promise<SeatLimitSnapshot | null> {
  const {
    companyId,
    baseline,
    seatType,
    timeoutMs = 20000,
    intervalMs = 1000,
    fetchView = fetchCompanyEntitlementView,
  } = options;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const view = await fetchView(companyId);
    const limits = readSeatLimitsFromEntitlement(view);
    if (limits) {
      const grew =
        seatType === "pm"
          ? limits.pmSeatLimit > baseline.pmSeatLimit
          : limits.workerSeatLimit > baseline.workerSeatLimit;
      if (grew) {
        return limits;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
