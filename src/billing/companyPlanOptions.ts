import type { OrgCheckoutPlanTierSlug } from "./orgPlans";
import {
  ORG_ADDON_PM_SEAT_USD,
  ORG_ADDON_WORKER_PACK_USD,
  ORG_PLAN_GROWTH_USD,
  ORG_PLAN_UNLIMITED_USD,
} from "./orgPlans";
import {
  formatEntitlementLimitsLabel,
  formatEntitlementStatusLabel,
  resolveCheckoutTierAvailability,
  type CheckoutTierAvailability,
  type CompanyEntitlementView,
} from "./companyEntitlementSummary";

export type CompanyPlanOptionDraft = {
  id: OrgCheckoutPlanTierSlug;
  title: string;
  priceLabel: string;
  summary: string;
  state: CheckoutTierAvailability;
  actionLabel: string;
  disabled: boolean;
};

function formatStorageLimit(bytes: number | null): string {
  if (bytes == null) {
    return "Unlimited";
  }
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(0)} GB`;
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function buildCompanyPlanLimitRows(
  view: CompanyEntitlementView,
): Array<{ id: string; label: string; value: string }> {
  return [
    { id: "pm", label: "PM seats", value: String(view.pmSeatLimit) },
    { id: "workers", label: "Worker seats", value: String(view.workerSeatLimit) },
    {
      id: "projects",
      label: "Projects",
      value: view.projectLimit == null ? "Unlimited" : String(view.projectLimit),
    },
    {
      id: "entries",
      label: "Entries",
      value:
        view.entriesLimit == null
          ? "Unlimited"
          : view.entriesLimitKind === "trial_total"
            ? `${view.entriesLimit} (trial total)`
            : `${view.entriesLimit} / month`,
    },
    {
      id: "storage",
      label: "Storage",
      value: formatStorageLimit(view.storageLimitBytes),
    },
  ];
}

function optionCopy(
  tier: OrgCheckoutPlanTierSlug,
  state: CheckoutTierAvailability,
): Pick<CompanyPlanOptionDraft, "actionLabel" | "disabled" | "summary"> {
  if (tier === "growth") {
    const summary = `5 projects, up to 200 entries/month, 1 PM + 5 workers included. Add-ons: +5 workers US$${ORG_ADDON_WORKER_PACK_USD}/mo, +1 PM US$${ORG_ADDON_PM_SEAT_USD}/mo.`;
    switch (state) {
      case "current":
        return { summary, actionLabel: "Current plan", disabled: true };
      case "downgrade_blocked":
        return {
          summary,
          actionLabel: "Contact support to downgrade",
          disabled: true,
        };
      case "upgrade":
        return { summary, actionLabel: "Subscribe to Growth", disabled: false };
      default:
        return { summary, actionLabel: "Subscribe to Growth", disabled: false };
    }
  }

  const summary =
    "Unlimited projects and entries, max 5 GB storage, 1 PM + 5 workers included.";
  switch (state) {
    case "current":
      return { summary, actionLabel: "Current plan", disabled: true };
    case "upgrade":
      return { summary, actionLabel: "Upgrade to Unlimited", disabled: false };
    case "downgrade_blocked":
      return {
        summary,
        actionLabel: "Contact support to downgrade",
        disabled: true,
      };
    default:
      return { summary, actionLabel: "Subscribe to Unlimited", disabled: false };
  }
}

export function buildCompanyPlanOptions(
  view: CompanyEntitlementView | null,
): CompanyPlanOptionDraft[] {
  const growthState = resolveCheckoutTierAvailability(view, "growth");
  const unlimitedState = resolveCheckoutTierAvailability(view, "unlimited");

  return [
    {
      id: "growth",
      title: "Growth",
      priceLabel: `US$${ORG_PLAN_GROWTH_USD}/mo`,
      state: growthState,
      ...optionCopy("growth", growthState),
    },
    {
      id: "unlimited",
      title: "Unlimited",
      priceLabel: `US$${ORG_PLAN_UNLIMITED_USD}/mo`,
      state: unlimitedState,
      ...optionCopy("unlimited", unlimitedState),
    },
  ];
}

export function buildCompanyPlanTierName(view: CompanyEntitlementView): string {
  return view.tierDisplayName;
}

export function buildCompanyPlanStatusLabel(view: CompanyEntitlementView): string {
  return formatEntitlementStatusLabel(view);
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

export function buildCompanyPlanLimitsSummary(view: CompanyEntitlementView): string {
  return formatEntitlementLimitsLabel(view);
}
