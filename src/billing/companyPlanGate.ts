import type { CompanyEntitlementView } from "./companyEntitlementSummary";

/** Paid Stripe subscription in a usable billing state — unlocks the app after signup plan selection. */
export function companyHasPaidStripePlan(
  view: CompanyEntitlementView | null | undefined,
): boolean {
  if (view?.hasStripeSubscription !== true) {
    return false;
  }
  const status = (view.subscriptionStatus || "").toLowerCase();
  return status === "active" || status === "trialing";
}
