/**
 * R6 paper SKUs for the R7 payment hook.
 * Profile checkout prefers create-checkout-session (BILL-E); Payment Link is legacy fallback only.
 */
import { SUPPORT_EMAIL, SUPPORT_MAILTO_URL } from "@/legal/legalLinks";

export const ORG_PLAN_GROWTH_USD = "19.99";
export const ORG_PLAN_UNLIMITED_USD = "199.99";
export const ORG_ADDON_WORKER_PACK_USD = "4.99";
export const ORG_ADDON_PM_SEAT_USD = "9.99";

export type OrgCheckoutPlanTierSlug = "growth" | "unlimited";

export function getStripeCheckoutUrl(): string | undefined {
  const raw = process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL?.trim();
  return raw ? raw : undefined;
}

export function buildOrgPlanSummary(): string {
  return [
    "Company subscription (not personal).",
    "Trial: 1 month, 1 company, 1 project, 1 PM + 5 workers, under 100 entries. Card on file; auto-charge after 30 days.",
    `Growth US$${ORG_PLAN_GROWTH_USD}/mo — 5 projects, under 200 entries/month, 1 PM + 5 workers.`,
    `Unlimited US$${ORG_PLAN_UNLIMITED_USD}/mo — unlimited projects/entries, max 5 GB storage, same included seats.`,
    `Add-ons: +5 workers US$${ORG_ADDON_WORKER_PACK_USD}/mo · +1 PM US$${ORG_ADDON_PM_SEAT_USD}/mo.`,
  ].join("\n\n");
}

export function getOrgCheckoutMailtoUrl(): string {
  const subject = encodeURIComponent("Taskr company subscription checkout");
  const body = encodeURIComponent(
    `Please send Stripe Checkout for our company.\n\n${buildOrgPlanSummary()}`,
  );
  return `${SUPPORT_MAILTO_URL}?subject=${subject}&body=${body}`;
}

export function resolveOrgCheckoutUrl(): string {
  return getStripeCheckoutUrl() ?? getOrgCheckoutMailtoUrl();
}

export { SUPPORT_EMAIL };
