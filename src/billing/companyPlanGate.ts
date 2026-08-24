import type { CompanyEntitlementView } from "./companyEntitlementSummary";

/** Paid Stripe subscription — unlocks the app after signup plan selection. */
export function companyHasPaidStripePlan(
  view: CompanyEntitlementView | null | undefined,
): boolean {
  return view?.hasStripeSubscription === true;
}
