/**
 * HK launch company SKUs (locked 2026-08-24).
 * Stripe/DB slugs remain `growth` / `unlimited` until catalog Human Gate renames tiers.
 */
import { SUPPORT_EMAIL, SUPPORT_MAILTO_URL } from "@/legal/legalLinks";

/** Display + checkout anchor: Starter tier (`growth` slug). */
export const ORG_PLAN_STARTER_HKD = "160";
/** Display + checkout anchor: Pro tier (`unlimited` slug). */
export const ORG_PLAN_PRO_HKD = "400";
/** Add-on list prices (HKD/mo) — locked 2026-08-24. */
export const ORG_ADDON_WORKER_PACK_HKD = "20";
export const ORG_ADDON_PM_SEAT_HKD = "100";

export const ORG_PLAN_STARTER_DISPLAY = "Starter";
export const ORG_PLAN_PRO_DISPLAY = "Pro";

export type OrgCheckoutPlanTierSlug = "growth" | "unlimited";

export function formatHkdMonthlyPrice(amount: string): string {
  return `HK$${amount}/mo`;
}

export function displayNameForPlanSlug(
  slug: OrgCheckoutPlanTierSlug,
): string {
  return slug === "unlimited" ? ORG_PLAN_PRO_DISPLAY : ORG_PLAN_STARTER_DISPLAY;
}

export function listPriceForPlanSlug(slug: OrgCheckoutPlanTierSlug): string {
  return slug === "unlimited" ? ORG_PLAN_PRO_HKD : ORG_PLAN_STARTER_HKD;
}

export function getStripeCheckoutUrl(): string | undefined {
  const raw = process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL?.trim();
  return raw ? raw : undefined;
}

export function buildOrgPlanSummary(): string {
  return [
    "Company subscription (not personal).",
    "Free time: owner-issued promotion code only (no default Stripe trial). Card on file at subscribe.",
    `${ORG_PLAN_STARTER_DISPLAY} ${formatHkdMonthlyPrice(ORG_PLAN_STARTER_HKD)} — 3 projects, 300 entries/month, 10 GB, 1 PM + 5 workers.`,
    `${ORG_PLAN_PRO_DISPLAY} ${formatHkdMonthlyPrice(ORG_PLAN_PRO_HKD)} — 12 projects, 800 entries/month, 30 GB, 2 PM + 10 workers.`,
    `Add-ons: +5 workers ${formatHkdMonthlyPrice(ORG_ADDON_WORKER_PACK_HKD)} · +1 PM ${formatHkdMonthlyPrice(ORG_ADDON_PM_SEAT_HKD)}.`,
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
