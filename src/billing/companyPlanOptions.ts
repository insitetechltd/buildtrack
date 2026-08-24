import type { OrgCheckoutPlanTierSlug } from "./orgPlans";
import {
  resolveAddonPriceLabels,
  resolveBaseTierDisplay,
  type SellablePlanCatalog,
} from "./planCatalog";
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

function optionCopy(
  tier: OrgCheckoutPlanTierSlug,
  state: CheckoutTierAvailability,
  catalog: SellablePlanCatalog | null | undefined,
): Pick<CompanyPlanOptionDraft, "actionLabel" | "disabled" | "summary"> {
  const { displayName, capsLine } = resolveBaseTierDisplay(tier, catalog);
  const proName = resolveBaseTierDisplay("unlimited", catalog).displayName;

  switch (state) {
    case "current":
      return { summary: capsLine, actionLabel: "Current plan", disabled: true };
    case "downgrade_blocked":
      return {
        summary: capsLine,
        actionLabel: "Contact support to change plan",
        disabled: true,
      };
    case "upgrade":
      return {
        summary: capsLine,
        actionLabel: `Upgrade to ${proName}`,
        disabled: false,
      };
    default:
      return {
        summary: capsLine,
        actionLabel: `Subscribe to ${displayName}`,
        disabled: false,
      };
  }
}

export function buildCompanyPlanOptions(
  view: CompanyEntitlementView | null,
  catalog?: SellablePlanCatalog | null,
): CompanyPlanOptionDraft[] {
  const starterState = resolveCheckoutTierAvailability(view, "growth");
  const proState = resolveCheckoutTierAvailability(view, "unlimited");
  const starter = resolveBaseTierDisplay("growth", catalog);
  const pro = resolveBaseTierDisplay("unlimited", catalog);

  return [
    {
      id: "growth",
      title: starter.displayName,
      priceLabel: starter.priceLabel,
      state: starterState,
      ...optionCopy("growth", starterState, catalog),
    },
    {
      id: "unlimited",
      title: pro.displayName,
      priceLabel: pro.priceLabel,
      state: proState,
      ...optionCopy("unlimited", proState, catalog),
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

export function buildAddonPriceLabels(
  catalog?: SellablePlanCatalog | null,
): {
  workerPack: string;
  pmSeat: string;
} {
  return resolveAddonPriceLabels(catalog);
}
