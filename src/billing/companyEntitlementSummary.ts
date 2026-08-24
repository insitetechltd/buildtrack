import type { PlanTierSlug, SellablePlanCatalog } from "./planCatalog";
import {
  findBaseTier,
  formatMeterLimitValue,
  normalizePlanTierSlug,
  tierSortRank,
} from "./planCatalog";
import { metersFromLegacyEntitlementRow } from "./entitlementMeters";

export type CompanyEntitlementRow = {
  pm_seat_limit: number;
  worker_seat_limit: number;
  project_limit: number | null;
  entries_limit: number | null;
  entries_limit_kind: string;
  storage_limit_bytes: number | null;
  subscription_status: string;
  billing_phase: string;
  source_plan_price_id: string | null;
  entitlements_snapshot?: Record<string, unknown> | null;
};

export type CompanySubscriptionRow = {
  stripe_subscription_id: string | null;
  status: string;
  trial_ends_at: string | null;
  locked_plan_price_id: string;
  plan_prices?: {
    plan_tiers?: {
      slug: string;
      display_name: string;
      kind: string;
      sort_order?: number | null;
    } | null;
  } | null;
};

export type CompanyEntitlementView = {
  tierSlug: PlanTierSlug | "pilot" | null;
  tierDisplayName: string;
  subscriptionStatus: string;
  billingPhase: string;
  hasStripeSubscription: boolean;
  meterLimits: Record<string, number | null>;
  trialEndsAt: string | null;
};

/** @deprecated Use normalizePlanTierSlug */
export function parseBaseTierSlug(
  slug: string | null | undefined,
): PlanTierSlug | null {
  return normalizePlanTierSlug(slug);
}

function snapshotMeters(
  entitlements: CompanyEntitlementRow,
): Record<string, number | null> {
  return metersFromLegacyEntitlementRow(entitlements);
}

export function buildCompanyEntitlementView(
  entitlements: CompanyEntitlementRow | null,
  subscription: CompanySubscriptionRow | null,
): CompanyEntitlementView | null {
  if (!entitlements) {
    return null;
  }

  const tierFromPrice = subscription?.plan_prices?.plan_tiers;
  const parsedSlug = normalizePlanTierSlug(tierFromPrice?.slug);
  const tierSlug = parsedSlug ?? (subscription?.stripe_subscription_id ? null : "pilot");
  const tierDisplayName =
    tierFromPrice?.display_name ??
    (tierSlug === "pilot" ? "Pilot" : parsedSlug ?? "Company plan");

  return {
    tierSlug,
    tierDisplayName,
    subscriptionStatus: entitlements.subscription_status,
    billingPhase: entitlements.billing_phase,
    hasStripeSubscription: Boolean(subscription?.stripe_subscription_id),
    meterLimits: snapshotMeters(entitlements),
    trialEndsAt: subscription?.trial_ends_at ?? null,
  };
}

export function formatEntitlementStatusLabel(view: CompanyEntitlementView): string {
  const status = view.subscriptionStatus.replace(/_/g, " ");
  const phase =
    view.billingPhase === "trial" && view.subscriptionStatus !== "trialing"
      ? "trial"
      : view.billingPhase;
  const phaseLabel = phase ? phase.charAt(0).toUpperCase() + phase.slice(1) : "";
  if (phaseLabel && phaseLabel.toLowerCase() !== status) {
    return `${view.tierDisplayName} · ${phaseLabel}`;
  }
  return `${view.tierDisplayName} · ${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

export function formatEntitlementLimitsLabel(
  view: CompanyEntitlementView,
  catalog?: SellablePlanCatalog | null,
): string {
  const slugs = Object.keys(view.meterLimits).sort();
  const parts = slugs
    .map((slug) => {
      const value = view.meterLimits[slug];
      if (value == null && catalog?.metersBySlug[slug] == null) {
        return null;
      }
      return formatMeterLimitValue(
        slug,
        value,
        catalog?.metersBySlug[slug],
      );
    })
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" · ") : "Limits unavailable";
}

export type CheckoutTierAvailability =
  | "available"
  | "current"
  | "upgrade"
  | "downgrade_blocked";

export function overlayCheckoutPlanOnView(
  view: CompanyEntitlementView | null,
  checkoutPlan: PlanTierSlug | null | undefined,
  catalog?: SellablePlanCatalog | null,
): CompanyEntitlementView | null {
  const plan = normalizePlanTierSlug(checkoutPlan);
  if (!plan) {
    return view;
  }

  const live = normalizePlanTierSlug(view?.tierSlug ?? undefined);
  if (view?.hasStripeSubscription && live === plan) {
    return view;
  }

  const displayName =
    findBaseTier(catalog, plan)?.displayName ?? plan;

  if (!view) {
    const catalogTier = findBaseTier(catalog, plan);
    return {
      tierSlug: plan,
      tierDisplayName: displayName,
      subscriptionStatus: "trialing",
      billingPhase: "trial",
      hasStripeSubscription: true,
      meterLimits: catalogTier?.meters ?? {},
      trialEndsAt: null,
    };
  }

  return {
    ...view,
    tierSlug: plan,
    tierDisplayName: displayName,
    hasStripeSubscription: true,
  };
}

export function resolveCheckoutTierAvailability(
  view: CompanyEntitlementView | null,
  target: PlanTierSlug,
  catalog?: SellablePlanCatalog | null,
): CheckoutTierAvailability {
  if (!view?.hasStripeSubscription || !view.tierSlug || view.tierSlug === "pilot") {
    return "available";
  }

  const current = normalizePlanTierSlug(view.tierSlug);
  const normalizedTarget = normalizePlanTierSlug(target);
  if (!current || !normalizedTarget) {
    return "available";
  }

  if (current === normalizedTarget) {
    return "current";
  }

  const currentRank = tierSortRank(catalog, current);
  const targetRank = tierSortRank(catalog, normalizedTarget);

  if (currentRank != null && targetRank != null) {
    if (targetRank > currentRank) {
      return "upgrade";
    }
    if (targetRank < currentRank) {
      return "downgrade_blocked";
    }
  }

  return "available";
}

export function buildCompanyPlanDialogMessage(
  view: CompanyEntitlementView | null,
  catalogSummary: string,
): string {
  if (!view) {
    return catalogSummary;
  }

  return [
    `Current: ${formatEntitlementStatusLabel(view)}`,
    formatEntitlementLimitsLabel(view),
    "",
    catalogSummary,
  ].join("\n");
}
