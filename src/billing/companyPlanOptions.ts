import type {
  MeterDefinition,
  PlanTierSlug,
  SellablePlanCatalog,
} from "./planCatalog";
import {
  buildOfferedPlanNamesLabel,
  formatMeterLimitValue,
  listBaseTiers,
  resolveAddonPriceLabels,
  resolveTierDisplay,
} from "./planCatalog";
import {
  resolveCheckoutTierAvailability,
  type CheckoutTierAvailability,
  type CompanyEntitlementView,
} from "./companyEntitlementSummary";

export type CompanyPlanOptionDraft = {
  id: PlanTierSlug;
  planPriceId: string;
  title: string;
  priceLabel: string;
  summary: string;
  state: CheckoutTierAvailability;
  actionLabel: string;
  disabled: boolean;
};

/**
 * Quantity-only values for the allocated-resources card.
 * Label already names the meter; do not repeat "1 pm seats".
 */
function formatAllocatedResourceValue(
  slug: string,
  value: number | null | undefined,
  definition?: MeterDefinition,
): string {
  if (value == null) {
    return "Unlimited";
  }

  const unit = definition?.unit ?? "count";
  if (unit === "bytes") {
    return formatMeterLimitValue(slug, value, definition);
  }

  if (definition?.aggregation === "counter_monthly") {
    return `${value}/mo`;
  }

  return String(value);
}

/**
 * Live entitlement totals (base plan + add-ons), not the catalog base SKU alone.
 */
export function buildCompanyPlanLimitRows(
  view: CompanyEntitlementView,
  catalog?: SellablePlanCatalog | null,
): Array<{ id: string; label: string; value: string }> {
  const slugs = Object.keys(view.meterLimits ?? {}).sort((a, b) => {
    const labelA = catalog?.metersBySlug?.[a]?.displayName ?? a;
    const labelB = catalog?.metersBySlug?.[b]?.displayName ?? b;
    return labelA.localeCompare(labelB);
  });

  return slugs.map((slug) => {
    const definition = catalog?.metersBySlug?.[slug];
    return {
      id: slug,
      label: definition?.displayName ?? slug.replace(/_/g, " "),
      value: formatAllocatedResourceValue(
        slug,
        view.meterLimits[slug],
        definition,
      ),
    };
  });
}

function optionCopy(
  tier: PlanCatalogTierRef,
  state: CheckoutTierAvailability,
  catalog: SellablePlanCatalog | null | undefined,
): Pick<CompanyPlanOptionDraft, "actionLabel" | "disabled" | "summary"> {
  const { displayName, capsLine } = resolveTierDisplay(tier.slug, catalog);

  switch (state) {
    case "current":
      return { summary: capsLine, actionLabel: "Current plan", disabled: true };
    case "downgrade_blocked":
      return {
        summary: capsLine,
        actionLabel: "Contact support to change plan",
        disabled: true,
      };
    case "upgrade": {
      const upgradeTargetName = displayName;
      return {
        summary: capsLine,
        actionLabel: `Upgrade to ${upgradeTargetName}`,
        disabled: false,
      };
    }
    default:
      return {
        summary: capsLine,
        actionLabel: `Subscribe to ${displayName}`,
        disabled: false,
      };
  }
}

type PlanCatalogTierRef = { slug: string; displayName: string };

export function buildCompanyPlanOptions(
  view: CompanyEntitlementView | null,
  catalog?: SellablePlanCatalog | null,
): CompanyPlanOptionDraft[] {
  const baseTiers = listBaseTiers(catalog);
  if (baseTiers.length === 0) {
    return [];
  }

  return baseTiers.map((tier) => {
    const state = resolveCheckoutTierAvailability(view, tier.slug, catalog);
    const { priceLabel } = resolveTierDisplay(tier.slug, catalog);

    return {
      id: tier.slug,
      planPriceId: tier.planPriceId,
      title: tier.displayName,
      priceLabel,
      state,
      ...optionCopy(tier, state, catalog),
    };
  });
}

export function buildCompanyPlanTierName(view: CompanyEntitlementView): string {
  return view.tierDisplayName;
}

export function buildCompanyPlanPhaseLabel(view: CompanyEntitlementView): string {
  const status = view.subscriptionStatus.replace(/_/g, " ");
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function buildCompanyPlanTrialEndsLabel(
  view: CompanyEntitlementView,
): string | undefined {
  if (!view.trialEndsAt || view.subscriptionStatus !== "trialing") {
    return undefined;
  }

  const date = new Date(view.trialEndsAt);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function buildAddonPriceLabels(
  catalog?: SellablePlanCatalog | null,
): Record<string, string> {
  return resolveAddonPriceLabels(catalog);
}

export function buildPlansSectionSubtitle(
  catalog?: SellablePlanCatalog | null,
): string {
  const names = buildOfferedPlanNamesLabel(catalog);
  return `Choose ${names} for your company.`;
}

export { buildOfferedPlanNamesLabel };
