import type { CompanyEntitlementView } from "./companyEntitlementSummary";

/**
 * Paid Stripe subscription in a usable billing state — unlocks the app after
 * signup / Create Company plan selection (founder FAIL-CLOSED gate).
 *
 * Product law: `documentation/ENTITLEMENT_PRODUCT_LAW.md`.
 * Does **not** gate ongoing MainTabs task access for non-founder sessions.
 */
export function companyHasPaidStripePlan(
  view: CompanyEntitlementView | null | undefined,
): boolean {
  if (view?.hasStripeSubscription !== true) {
    return false;
  }
  const status = (view.subscriptionStatus || "").toLowerCase();
  return status === "active" || status === "trialing";
}

/** Statuses that keep a founding CA on Company Plan (do not unlock). */
export function isFounderBillingBlockedStatus(
  subscriptionStatus: string | null | undefined,
): boolean {
  const status = (subscriptionStatus || "").toLowerCase();
  if (!status) return true;
  return status !== "active" && status !== "trialing";
}
