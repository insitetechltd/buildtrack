import { useCallback, useEffect, useState } from "react";
import { Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { createCompanyCheckoutSession } from "@/api/createCheckoutSession";
import { fetchCompanyEntitlementView } from "@/api/fetchCompanyEntitlements";
import { fetchSellablePlanCatalog } from "@/api/fetchSellablePlanCatalog";
import { updateCompanyAddons } from "@/api/updateCompanyAddons";
import {
  overlayCheckoutPlanOnView,
} from "@/billing/companyEntitlementSummary";
import {
  normalizePlanTierSlug,
  resolveBillingDisplayCurrency,
  findAddonTier,
  findBaseTier,
  resolveAddonPriceLabels,
  type SellablePlanCatalog,
} from "@/billing/planCatalog";
import { companyHasPaidStripePlan } from "@/billing/companyPlanGate";
import {
  clearRememberedCheckoutPlan,
  rememberCheckoutPlan,
  resolveCheckoutReturnPlan,
} from "@/billing/checkoutReturnPlan";
import {
  buildCompanyPlanLimitRows,
  buildCompanyPlanOptions,
  buildCompanyPlanPhaseLabel,
  buildCompanyPlanTierName,
  buildCompanyPlanTrialEndsLabel,
  buildOfferedPlanNamesLabel,
  buildPlansSectionSubtitle,
} from "@/billing/companyPlanOptions";
import {
  displayNameForPlanSlug,
  type PlanTierSlug,
} from "@/billing/orgPlans";
import { SUPPORT_EMAIL } from "@/legal/legalLinks";
import { useAuthStore } from "@/state/authStore";
import type {
  CompanyPlanScreenViewAdapterOutput,
  CompanyPlanOptionModel,
  CompanyPlanStatusBannerModel,
} from "@/ui/contracts/viewAdapters";
import { useTranslation } from "@/utils/useTranslation";

export interface CompanyPlanViewAdapterProps {
  onNavigateBack?: () => void;
  forceSelection?: boolean;
  checkoutResult?: "success" | "cancel";
  checkoutPlan?: PlanTierSlug;
}

export interface CompanyPlanViewAdapterHookResult {
  output: CompanyPlanScreenViewAdapterOutput;
  actions: {
    handleRefresh: () => Promise<void>;
    handlePlanAction: (planId: PlanTierSlug) => Promise<void>;
    handleUpdateAddons: (
      nextWorkerPackQty: number,
      nextPmSeatQty: number,
    ) => Promise<void>;
    dismissStatusBanner: () => void;
  };
}

export function useCompanyPlanViewAdapter(
  props: CompanyPlanViewAdapterProps,
): CompanyPlanViewAdapterHookResult {
  const { checkoutResult, checkoutPlan } = props;
  const t = useTranslation();
  const { user } = useAuthStore();
  const clearRequiresCompanyPlanSelection = useAuthStore(
    (state) => state.clearRequiresCompanyPlanSelection,
  );
  const [entitlement, setEntitlement] =
    useState<Awaited<ReturnType<typeof fetchCompanyEntitlementView>>>(null);
  const [catalog, setCatalog] = useState<SellablePlanCatalog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [activeActionPlanId, setActiveActionPlanId] =
    useState<PlanTierSlug | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [statusBanner, setStatusBanner] =
    useState<CompanyPlanStatusBannerModel | null>(null);
  const [optimisticCheckoutPlan, setOptimisticCheckoutPlan] =
    useState<PlanTierSlug | null>(null);

  const loadEntitlement = useCallback(async () => {
    try {
      const [nextCatalog, view] = await Promise.all([
        fetchSellablePlanCatalog({
          currency: resolveBillingDisplayCurrency(),
        }),
        user?.companyId
          ? fetchCompanyEntitlementView(user.companyId)
          : Promise.resolve(null),
      ]);
      setCatalog(nextCatalog);
      setEntitlement(view);
    } catch {
      // Catalog/entitlement fetch failure must not crash the screen.
    } finally {
      setHasLoadedOnce(true);
    }
  }, [user?.companyId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading((current) => (hasLoadedOnce ? current : true));

      void (async () => {
        await loadEntitlement();
        if (!cancelled) {
          setIsLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [hasLoadedOnce, loadEntitlement]),
  );

  useEffect(() => {
    if (!checkoutResult) {
      return;
    }

    if (checkoutResult !== "success") {
      setStatusBanner({
        id: "company-plan:checkout-cancel",
        tone: "info",
        message: "Checkout was canceled. No changes were made to your subscription.",
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const chosenPlan =
          (await resolveCheckoutReturnPlan(checkoutPlan)) ?? optimisticCheckoutPlan;
        if (cancelled) {
          return;
        }
        if (chosenPlan) {
          setOptimisticCheckoutPlan(chosenPlan);
          clearRememberedCheckoutPlan();
        }

        const planLabel = chosenPlan
          ? displayNameForPlanSlug(chosenPlan, catalog)
          : null;
        setStatusBanner({
          id: "company-plan:checkout-success",
          tone: "success",
          message: chosenPlan
            ? `Checkout complete. You're on ${planLabel}. Plan limits stay in place until your billing phase updates.`
            : "Checkout complete. Your company subscription will appear here once Stripe confirms payment.",
        });

        for (let attempt = 0; attempt < 6; attempt += 1) {
          if (cancelled) {
            return;
          }
          const view = user?.companyId
            ? await fetchCompanyEntitlementView(user.companyId)
            : null;
          if (cancelled) {
            return;
          }
          if (view) {
            setEntitlement(view);
            setHasLoadedOnce(true);
            setIsLoading(false);
          }
          const live = normalizePlanTierSlug(view?.tierSlug ?? undefined);
          if (view?.hasStripeSubscription && (!chosenPlan || live === chosenPlan)) {
            if (companyHasPaidStripePlan(view)) {
              clearRequiresCompanyPlanSelection();
            }
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } catch {
        if (!cancelled) {
          setStatusBanner({
            id: "company-plan:checkout-success",
            tone: "success",
            message:
              "Checkout complete. Your company subscription will appear here once Stripe confirms payment.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [catalog, checkoutPlan, checkoutResult, clearRequiresCompanyPlanSelection, optimisticCheckoutPlan, user?.companyId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadEntitlement();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadEntitlement]);

  const handlePlanAction = useCallback(
    async (planId: PlanTierSlug) => {
      if (!user?.companyId) {
        Alert.alert(
          t.profile.companyPlan,
          `Unable to start checkout. Email ${SUPPORT_EMAIL}.`,
        );
        return;
      }

      const option = buildCompanyPlanOptions(
        overlayCheckoutPlanOnView(
          entitlement,
          checkoutResult === "success"
            ? optimisticCheckoutPlan ?? checkoutPlan ?? null
            : null,
          catalog,
        ),
        catalog,
      ).find((item) => item.id === planId);
      if (!option || option.disabled) {
        return;
      }

      if (option.state === "downgrade_blocked") {
        setStatusBanner({
          id: "company-plan:downgrade-blocked",
          tone: "info",
          message: `Downgrades are not self-serve yet. Email ${SUPPORT_EMAIL}.`,
        });
        return;
      }

      setIsActionInFlight(true);
      setActiveActionPlanId(planId);
      try {
        const result = await createCompanyCheckoutSession({
          companyId: user.companyId,
          planTierSlug: planId,
          planPriceId: option.planPriceId,
        });

        if (result.success && result.upgraded) {
          await loadEntitlement();
          clearRequiresCompanyPlanSelection();
          setStatusBanner({
            id: "company-plan:upgrade-success",
            tone: "success",
            message: `Upgraded to ${displayNameForPlanSlug(planId, catalog)}. Promo or paid period limits stay in place until your billing phase changes.`,
          });
          return;
        }

        if (result.success && result.url) {
          rememberCheckoutPlan(planId, option.planPriceId);
          await Linking.openURL(result.url).catch(() => {
            rememberCheckoutPlan(null);
            setStatusBanner({
              id: "company-plan:checkout-open-failed",
              tone: "error",
              message: `Unable to open checkout. Email ${SUPPORT_EMAIL}.`,
            });
          });
          return;
        }

        if (result.error) {
          setStatusBanner({
            id: "company-plan:checkout-error",
            tone: "error",
            message: result.error,
          });
        }
      } finally {
        setIsActionInFlight(false);
        setActiveActionPlanId(null);
      }
    },
    [catalog, checkoutPlan, checkoutResult, clearRequiresCompanyPlanSelection, entitlement, loadEntitlement, optimisticCheckoutPlan, t.profile.companyPlan, user?.companyId],
  );

  const addonSteppers = (() => {
    if (!catalog || !entitlement) {
      return null;
    }
    if (!entitlement.hasStripeSubscription) {
      return null;
    }
    if (!entitlement.tierSlug || entitlement.tierSlug === "pilot") {
      return null;
    }

    const baseTier = findBaseTier(catalog, entitlement.tierSlug);
    const workerAddon = findAddonTier(catalog, "addon_worker_pack");
    const pmAddon = findAddonTier(catalog, "addon_pm_seat");
    if (!baseTier || !workerAddon || !pmAddon) {
      return null;
    }

    const currentWorkerTotal = entitlement.meterLimits?.worker_seats;
    const currentPmTotal = entitlement.meterLimits?.pm_seats;
    const baseWorkerTotal = baseTier.meters.worker_seats ?? 0;
    const basePmTotal = baseTier.meters.pm_seats ?? 0;
    const workerSeatsPerPack = workerAddon.meters.worker_seats;
    const pmSeatsPerSeat = pmAddon.meters.pm_seats;

    if (
      typeof currentWorkerTotal !== "number" ||
      typeof currentPmTotal !== "number" ||
      typeof workerSeatsPerPack !== "number" ||
      typeof pmSeatsPerSeat !== "number" ||
      workerSeatsPerPack <= 0 ||
      pmSeatsPerSeat <= 0
    ) {
      return null;
    }

    const additionalWorker = Math.max(0, currentWorkerTotal - baseWorkerTotal);
    const additionalPm = Math.max(0, currentPmTotal - basePmTotal);

    const workerPackQty = Math.max(
      0,
      Math.floor(additionalWorker / workerSeatsPerPack),
    );
    const pmSeatQty = Math.max(0, Math.floor(additionalPm / pmSeatsPerSeat));

    const addonPricesBySlug = resolveAddonPriceLabels(catalog);

    return {
      workerPackQty,
      pmSeatQty,
      workerPackUnitPrice: addonPricesBySlug["addon_worker_pack"] ?? "—",
      pmSeatUnitPrice: addonPricesBySlug["addon_pm_seat"] ?? "—",
      workerSeatsPerPack,
      pmSeatsPerSeat,
    };
  })();

  const handleUpdateAddons = useCallback(
    async (nextWorkerPackQty: number, nextPmSeatQty: number) => {
      if (!user?.companyId) {
        Alert.alert(
          t.profile.companyPlan,
          `Unable to update add-ons. Email ${SUPPORT_EMAIL}.`,
        );
        return;
      }
      if (!catalog || !addonSteppers) {
        return;
      }

      const baseTier = findBaseTier(catalog, entitlement?.tierSlug ?? "");
      const workerAddon = findAddonTier(catalog, "addon_worker_pack");
      const pmAddon = findAddonTier(catalog, "addon_pm_seat");
      if (!baseTier || !workerAddon || !pmAddon) {
        return;
      }

      const baseWorkerTotal = baseTier.meters.worker_seats ?? 0;
      const basePmTotal = baseTier.meters.pm_seats ?? 0;
      const workerSeatsPerPack = workerAddon.meters.worker_seats ?? 0;
      const pmSeatsPerSeat = pmAddon.meters.pm_seats ?? 0;

      const expectedWorkerTotal =
        baseWorkerTotal + nextWorkerPackQty * workerSeatsPerPack;
      const expectedPmTotal = basePmTotal + nextPmSeatQty * pmSeatsPerSeat;

      setIsActionInFlight(true);
      try {
        const result = await updateCompanyAddons({
          companyId: user.companyId,
          addonWorkerPacks: Math.max(0, Math.floor(nextWorkerPackQty)),
          addonPmSeats: Math.max(0, Math.floor(nextPmSeatQty)),
        });

        if (!result.success) {
          setStatusBanner({
            id: "company-plan:addons-error",
            tone: "error",
            message: result.error || "Unable to update add-ons.",
          });
          return;
        }

        setStatusBanner({
          id: "company-plan:addons-updating",
          tone: "info",
          message: "Updating add-ons…",
        });

        for (let attempt = 0; attempt < 6; attempt += 1) {
          const latest = await fetchCompanyEntitlementView(user.companyId);
          if (!latest) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }

          const workerNow = latest.meterLimits?.worker_seats;
          const pmNow = latest.meterLimits?.pm_seats;
          const workerOk =
            typeof workerNow === "number" && workerNow === expectedWorkerTotal;
          const pmOk = typeof pmNow === "number" && pmNow === expectedPmTotal;
          if (workerOk && pmOk) {
            setEntitlement(latest);
            setHasLoadedOnce(true);
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        setStatusBanner({
          id: "company-plan:addons-success",
          tone: "success",
          message: "Add-ons updated. Your limits will refresh shortly.",
        });
      } finally {
        setIsActionInFlight(false);
      }
    },
    [addonSteppers, catalog, entitlement?.tierSlug, isActionInFlight, loadEntitlement, t.profile.companyPlan, user?.companyId],
  );

  const displayEntitlement = overlayCheckoutPlanOnView(
    entitlement,
    checkoutResult === "success" ? optimisticCheckoutPlan ?? checkoutPlan : null,
    catalog,
  );

  const planOptions: CompanyPlanOptionModel[] = buildCompanyPlanOptions(
    displayEntitlement,
    catalog,
  ).map((option) => ({
    id: option.id,
    planPriceId: option.planPriceId,
    title: option.title,
    priceLabel: option.priceLabel,
    summary: option.summary,
    state: option.state,
    actionLabel: option.actionLabel,
    disabled: option.disabled || isActionInFlight,
  }));

  const output: CompanyPlanScreenViewAdapterOutput = {
    screenId: "CompanyPlanScreen",
    readiness: {
      hasInitialFrame: hasLoadedOnce,
      hasUsableData: hasLoadedOnce,
      isBackgroundRefreshing: isRefreshing,
      isNavigationTransitionActive: false,
    },
    continuity: {
      isInitialLoading: isLoading && !hasLoadedOnce,
      isBackgroundRefreshing: isRefreshing,
      hasCachedFrame: hasLoadedOnce,
      shouldRenderSkeletonShell: false,
      shouldRenderEmptyState: hasLoadedOnce && !displayEntitlement,
      freshnessLabel: isRefreshing ? "Refreshing" : isLoading && !hasLoadedOnce ? "Loading" : "Ready",
    },
    currentPlan: displayEntitlement
      ? {
          tierName: buildCompanyPlanTierName(displayEntitlement),
          statusLabel: buildCompanyPlanPhaseLabel(displayEntitlement),
          trialEndsLabel: buildCompanyPlanTrialEndsLabel(displayEntitlement),
          phaseLabel: displayEntitlement.billingPhase,
          limitRows: buildCompanyPlanLimitRows(displayEntitlement, catalog),
        }
      : null,
    planOptions,
    addonSteppers,
    statusBanner,
    activeActionPlanId,
    isLoading: isLoading && !hasLoadedOnce,
    isRefreshing,
    isActionInFlight,
    supportEmail: SUPPORT_EMAIL,
    offeredPlanNames: buildOfferedPlanNamesLabel(catalog),
    plansSectionSubtitle: buildPlansSectionSubtitle(catalog),
    displayCurrency: catalog?.currency ?? resolveBillingDisplayCurrency(),
  };

  return {
    output,
    actions: {
      handleRefresh,
      handlePlanAction,
      handleUpdateAddons,
      dismissStatusBanner: () => setStatusBanner(null),
    },
  };
}
