import type { OrgCheckoutPlanTierSlug } from "./orgPlans";

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
    } | null;
  } | null;
};

export type CompanyEntitlementView = {
  tierSlug: OrgCheckoutPlanTierSlug | "pilot" | null;
  tierDisplayName: string;
  subscriptionStatus: string;
  billingPhase: string;
  hasStripeSubscription: boolean;
  pmSeatLimit: number;
  workerSeatLimit: number;
  projectLimit: number | null;
  entriesLimit: number | null;
  entriesLimitKind: string;
  storageLimitBytes: number | null;
  trialEndsAt: string | null;
};

const BASE_TIER_RANK: Record<OrgCheckoutPlanTierSlug, number> = {
  growth: 1,
  unlimited: 2,
};

export function parseBaseTierSlug(
  slug: string | null | undefined,
): OrgCheckoutPlanTierSlug | null {
  if (slug === "growth" || slug === "unlimited") {
    return slug;
  }
  return null;
}

export function buildCompanyEntitlementView(
  entitlements: CompanyEntitlementRow | null,
  subscription: CompanySubscriptionRow | null,
): CompanyEntitlementView | null {
  if (!entitlements) {
    return null;
  }

  const tierFromPrice = subscription?.plan_prices?.plan_tiers;
  const parsedSlug = parseBaseTierSlug(tierFromPrice?.slug);
  const tierSlug = parsedSlug ?? (subscription?.stripe_subscription_id ? null : "pilot");
  const tierDisplayName =
    tierFromPrice?.display_name ??
    (tierSlug === "pilot" ? "Pilot" : "Company plan");

  return {
    tierSlug,
    tierDisplayName,
    subscriptionStatus: entitlements.subscription_status,
    billingPhase: entitlements.billing_phase,
    hasStripeSubscription: Boolean(subscription?.stripe_subscription_id),
    pmSeatLimit: entitlements.pm_seat_limit,
    workerSeatLimit: entitlements.worker_seat_limit,
    projectLimit: entitlements.project_limit,
    entriesLimit: entitlements.entries_limit,
    entriesLimitKind: entitlements.entries_limit_kind,
    storageLimitBytes: entitlements.storage_limit_bytes,
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

export function formatEntitlementLimitsLabel(view: CompanyEntitlementView): string {
  const parts: string[] = [
    `${view.pmSeatLimit} PM`,
    `${view.workerSeatLimit} workers`,
  ];

  if (view.projectLimit == null) {
    parts.push("Unlimited projects");
  } else {
    parts.push(`${view.projectLimit} project${view.projectLimit === 1 ? "" : "s"}`);
  }

  if (view.entriesLimit == null) {
    parts.push("Unlimited entries");
  } else if (view.entriesLimitKind === "trial_total") {
    parts.push(`${view.entriesLimit} entries (trial)`);
  } else {
    parts.push(`${view.entriesLimit} entries/mo`);
  }

  return parts.join(" · ");
}

export type CheckoutTierAvailability =
  | "available"
  | "current"
  | "upgrade"
  | "downgrade_blocked";

export function resolveCheckoutTierAvailability(
  view: CompanyEntitlementView | null,
  target: OrgCheckoutPlanTierSlug,
): CheckoutTierAvailability {
  if (!view?.hasStripeSubscription || !view.tierSlug || view.tierSlug === "pilot") {
    return "available";
  }

  const current = parseBaseTierSlug(view.tierSlug);
  if (!current) {
    return "available";
  }

  if (current === target) {
    return "current";
  }

  if (BASE_TIER_RANK[target] > BASE_TIER_RANK[current]) {
    return "upgrade";
  }

  return "downgrade_blocked";
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
