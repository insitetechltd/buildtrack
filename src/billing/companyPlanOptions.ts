import type { OrgCheckoutPlanTierSlug } from "./orgPlans";
import {
  ORG_ADDON_PM_SEAT_HKD,
  ORG_ADDON_WORKER_PACK_HKD,
  ORG_PLAN_PRO_HKD,
  ORG_PLAN_STARTER_HKD,
  displayNameForPlanSlug,
  formatHkdMonthlyPrice,
} from "./orgPlans";
import {
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

function tierCapsLine(slug: OrgCheckoutPlanTierSlug): string {
  if (slug === "growth") {
    return "3 projects · 300 entries/mo · 10 GB · 1 PM + 5 workers";
  }
  return "12 projects · 800 entries/mo · 30 GB · 2 PM + 10 workers";
}

function optionCopy(
  tier: OrgCheckoutPlanTierSlug,
  state: CheckoutTierAvailability,
): Pick<CompanyPlanOptionDraft, "actionLabel" | "disabled" | "summary"> {
  const name = displayNameForPlanSlug(tier);
  const summary = tierCapsLine(tier);

  switch (state) {
    case "current":
      return { summary, actionLabel: "Current plan", disabled: true };
    case "downgrade_blocked":
      return {
        summary,
        actionLabel: "Contact support to change plan",
        disabled: true,
      };
    case "upgrade":
      return {
        summary,
        actionLabel: `Upgrade to ${displayNameForPlanSlug("unlimited")}`,
        disabled: false,
      };
    default:
      return {
        summary,
        actionLabel: `Subscribe to ${name}`,
        disabled: false,
      };
  }
}

export function buildCompanyPlanOptions(
  view: CompanyEntitlementView | null,
): CompanyPlanOptionDraft[] {
  const starterState = resolveCheckoutTierAvailability(view, "growth");
  const proState = resolveCheckoutTierAvailability(view, "unlimited");

  return [
    {
      id: "growth",
      title: displayNameForPlanSlug("growth"),
      priceLabel: formatHkdMonthlyPrice(ORG_PLAN_STARTER_HKD),
      state: starterState,
      ...optionCopy("growth", starterState),
    },
    {
      id: "unlimited",
      title: displayNameForPlanSlug("unlimited"),
      priceLabel: formatHkdMonthlyPrice(ORG_PLAN_PRO_HKD),
      state: proState,
      ...optionCopy("unlimited", proState),
    },
  ];
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

export function buildAddonPriceLabels(): {
  workerPack: string;
  pmSeat: string;
} {
  return {
    workerPack: formatHkdMonthlyPrice(ORG_ADDON_WORKER_PACK_HKD),
    pmSeat: formatHkdMonthlyPrice(ORG_ADDON_PM_SEAT_HKD),
  };
}
