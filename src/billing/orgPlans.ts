/**
 * Org checkout helpers. List prices, caps, tier cards, and meters come from
 * `plan_prices` + `meter_definitions` via fetchSellablePlanCatalog.
 */
import { SUPPORT_EMAIL, SUPPORT_MAILTO_URL } from "@/legal/legalLinks";
import {
  buildOfferedPlanNamesLabel,
  listBaseTiers,
  resolveAddonPriceLabels,
  resolveTierDisplay,
  type PlanTierSlug,
  type SellablePlanCatalog,
} from "./planCatalog";

export type { PlanTierSlug, OrgCheckoutPlanTierSlug } from "./planCatalog";

export function displayNameForPlanSlug(
  slug: PlanTierSlug,
  catalog?: SellablePlanCatalog | null,
): string {
  return resolveTierDisplay(slug, catalog).displayName;
}

export function listPriceLabelForPlanSlug(
  slug: PlanTierSlug,
  catalog?: SellablePlanCatalog | null,
): string {
  return resolveTierDisplay(slug, catalog).priceLabel;
}

export function getStripeCheckoutUrl(): string | undefined {
  const raw = process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL?.trim();
  return raw ? raw : undefined;
}

export function buildOrgPlanSummary(
  catalog?: SellablePlanCatalog | null,
): string {
  const lines = ["Company subscription (not personal)."];
  lines.push(
    "Free time: owner-issued promotion code only (no default Stripe trial). Card on file at subscribe.",
  );

  for (const tier of listBaseTiers(catalog)) {
    const display = resolveTierDisplay(tier.slug, catalog);
    lines.push(
      `${display.displayName} ${display.priceLabel} — ${display.capsLine.replace(/ · /g, ", ")}.`,
    );
  }

  const addons = resolveAddonPriceLabels(catalog);
  const addonParts = Object.entries(addons).map(
    ([slug, label]) => `${slug.replace(/_/g, " ")} ${label}`,
  );
  if (addonParts.length > 0) {
    lines.push(`Add-ons: ${addonParts.join(" · ")}.`);
  }

  return lines.join("\n\n");
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

export { buildOfferedPlanNamesLabel, SUPPORT_EMAIL };
