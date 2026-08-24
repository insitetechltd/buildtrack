/**
 * Org checkout helpers. List prices/caps for Company Plan UI come from
 * `plan_prices` via fetchSellablePlanCatalog — constants here are fallback only.
 */
import { SUPPORT_EMAIL, SUPPORT_MAILTO_URL } from "@/legal/legalLinks";
import {
  FALLBACK_LIST_PRICES_HKD,
  resolveAddonPriceLabels,
  resolveBaseTierDisplay,
  type OrgCheckoutPlanTierSlug,
  type SellablePlanCatalog,
} from "./planCatalog";

export type { OrgCheckoutPlanTierSlug } from "./planCatalog";

/** @deprecated Prefer catalog; kept as offline/fallback list price. */
export const ORG_PLAN_STARTER_HKD = FALLBACK_LIST_PRICES_HKD.growth.amountHkd;
/** @deprecated Prefer catalog; kept as offline/fallback list price. */
export const ORG_PLAN_PRO_HKD = FALLBACK_LIST_PRICES_HKD.unlimited.amountHkd;
/** @deprecated Prefer catalog. */
export const ORG_ADDON_WORKER_PACK_HKD =
  FALLBACK_LIST_PRICES_HKD.addon_worker_pack.amountHkd;
/** @deprecated Prefer catalog. */
export const ORG_ADDON_PM_SEAT_HKD =
  FALLBACK_LIST_PRICES_HKD.addon_pm_seat.amountHkd;

export const ORG_PLAN_STARTER_DISPLAY =
  FALLBACK_LIST_PRICES_HKD.growth.displayName;
export const ORG_PLAN_PRO_DISPLAY =
  FALLBACK_LIST_PRICES_HKD.unlimited.displayName;

export function formatHkdMonthlyPrice(amount: string): string {
  return `HK$${amount}/mo`;
}

export function displayNameForPlanSlug(
  slug: OrgCheckoutPlanTierSlug,
  catalog?: SellablePlanCatalog | null,
): string {
  return resolveBaseTierDisplay(slug, catalog).displayName;
}

export function listPriceForPlanSlug(
  slug: OrgCheckoutPlanTierSlug,
  catalog?: SellablePlanCatalog | null,
): string {
  const fromCatalog = catalog?.baseBySlug[slug];
  if (fromCatalog) {
    return String(fromCatalog.amountCents / 100);
  }
  return slug === "unlimited" ? ORG_PLAN_PRO_HKD : ORG_PLAN_STARTER_HKD;
}

export function getStripeCheckoutUrl(): string | undefined {
  const raw = process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL?.trim();
  return raw ? raw : undefined;
}

export function buildOrgPlanSummary(
  catalog?: SellablePlanCatalog | null,
): string {
  const starter = resolveBaseTierDisplay("growth", catalog);
  const pro = resolveBaseTierDisplay("unlimited", catalog);
  const addons = resolveAddonPriceLabels(catalog);
  return [
    "Company subscription (not personal).",
    "Free time: owner-issued promotion code only (no default Stripe trial). Card on file at subscribe.",
    `${starter.displayName} ${starter.priceLabel} — ${starter.capsLine.replace(/ · /g, ", ")}.`,
    `${pro.displayName} ${pro.priceLabel} — ${pro.capsLine.replace(/ · /g, ", ")}.`,
    `Add-ons: +5 workers ${addons.workerPack} · +1 PM ${addons.pmSeat}.`,
  ].join("\n\n");
}

export function getOrgCheckoutMailtoUrl(
  catalog?: SellablePlanCatalog | null,
): string {
  const subject = encodeURIComponent("Taskr company subscription checkout");
  const body = encodeURIComponent(
    `Please send Stripe Checkout for our company.\n\n${buildOrgPlanSummary(catalog)}`,
  );
  return `${SUPPORT_MAILTO_URL}?subject=${subject}&body=${body}`;
}

export function resolveOrgCheckoutUrl(
  catalog?: SellablePlanCatalog | null,
): string {
  return getStripeCheckoutUrl() ?? getOrgCheckoutMailtoUrl(catalog);
}

export { SUPPORT_EMAIL };
