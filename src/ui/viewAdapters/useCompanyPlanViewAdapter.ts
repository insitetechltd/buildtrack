import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { NavigationContext } from "@react-navigation/native";

import { fetchCompanyEntitlementView } from "@/api/fetchCompanyEntitlements";
import { fetchSellablePlanCatalog } from "@/api/fetchSellablePlanCatalog";
import { reconcileCompanyAddonsFromStripe } from "@/api/updateCompanyAddons";
import {
  overlayCheckoutPlanOnView,
} from "@/billing/companyEntitlementSummary";
import {
  normalizePlanTierSlug,
  resolveBillingDisplayCurrency,
  type SellablePlanCatalog,
} from "@/billing/planCatalog";
import { companyHasPaidStripePlan } from "@/billing/companyPlanGate";
import {
  clearRememberedCheckoutPlan,
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
import { showCompanyPlanWebManagementAlert } from "@/billing/showCompanyPlanWebManagementAlert";
import {
  clearPendingAddonHold,
  computeServerAddonBaseline,
  getPendingAddonHold,
  overlayPendingAddonSeatsOnView,
  resolveDraftSeatQty,
  shouldResetAddonDraftsOnTierChange,
} from "@/billing/serverAddonBaseline";
import { SUPPORT_EMAIL } from "@/legal/legalLinks";
import { useAuthStore } from "@/state/authStore";
import type {
  CompanyPlanScreenViewAdapterOutput,
  CompanyPlanOptionModel,
  CompanyPlanStatusBannerModel,
} from "@/ui/contracts/viewAdapters";
import { useTranslation } from "@/utils/useTranslation";

/**
 * Company Plan is shown both inside ProfileStack and outside NavigationContainer
 * (post–create-company gate). useFocusEffect throws without a navigator — use this.
 */
function useFocusOrMountEffect(effect: () => void | (() => void)) {
  const navigation =
    NavigationContext && typeof NavigationContext === "object"
      ? useContext(NavigationContext)
      : undefined;

  useEffect(() => {
    let cleanup: void | (() => void);

    const run = () => {
      if (typeof cleanup === "function") {
        cleanup();
      }
      cleanup = effect();
    };

    run();

    if (!navigation) {
      return () => {
        if (typeof cleanup === "function") {
          cleanup();
        }
      };
    }

    const unsubscribe = navigation.addListener("focus", run);
    return () => {
      unsubscribe();
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }, [effect, navigation]);
}
export interface CompanyPlanViewAdapterProps {
  onNavigateBack?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  onNavigateToCompanyManagement?: () => void;
  onNavigateToTaskDashboard?: () => void;
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
      nextWorkerSeatQty: number,
      nextPmSeatQty: number,
    ) => Promise<void>;
    dismissStatusBanner: () => void;
  };
}

export function useCompanyPlanViewAdapter(
  props: CompanyPlanViewAdapterProps,
): CompanyPlanViewAdapterHookResult {
  const { checkoutResult, checkoutPlan, forceSelection } = props;
  const t = useTranslation();
  const { user } = useAuthStore();
  const clearRequiresCompanyPlanSelection = useAuthStore(
    (state) => state.clearRequiresCompanyPlanSelection,
  );
  const requestLandOnCompanyManagementAfterCheckout = useAuthStore(
    (state) => state.requestLandOnCompanyManagementAfterCheckout,
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
  const [draftWorkerSeatQty, setDraftWorkerSeatQty] = useState<number | null>(
    null,
  );
  const [draftPmSeatQty, setDraftPmSeatQty] = useState<number | null>(null);
  const [busySeatType, setBusySeatType] = useState<"worker" | "pm" | null>(
    null,
  );
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

  const loadOnFocusOrMount = useCallback(() => {
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
  }, [hasLoadedOnce, loadEntitlement]);

  useFocusOrMountEffect(loadOnFocusOrMount);

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
              requestLandOnCompanyManagementAfterCheckout();
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
  }, [catalog, checkoutPlan, checkoutResult, clearRequiresCompanyPlanSelection, optimisticCheckoutPlan, requestLandOnCompanyManagementAfterCheckout, user?.companyId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Do not clear drafts / pending hold — pull-to-refresh during webhook lag
      // must not snap Extra people counts back to 0.
      if (user?.companyId) {
        await reconcileCompanyAddonsFromStripe(user.companyId).catch(() => null);
      }
      await loadEntitlement();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadEntitlement, user?.companyId]);

  const handlePlanAction = useCallback(
    async (planId: PlanTierSlug) => {
      if (!user?.companyId) {
        Alert.alert(
          t.profile.companyPlan,
          `Unable to manage plan. Email ${SUPPORT_EMAIL}.`,
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

      // ASC 3.1.1: no in-app Stripe checkout — website only.
      showCompanyPlanWebManagementAlert();
    },
    [
      catalog,
      checkoutPlan,
      checkoutResult,
      entitlement,
      optimisticCheckoutPlan,
      t.profile.companyPlan,
      user?.companyId,
    ],
  );

  const serverAddonBaseline = computeServerAddonBaseline(catalog, entitlement);
  const lastAddonTierSlugRef = useRef<string | null>(null);

  // Seed / sync drafts. Never clear on brief baseline null; hold pending target
  // while entitlement lags after Stripe success.
  useEffect(() => {
    if (!serverAddonBaseline) {
      return;
    }
    if (busySeatType) {
      return;
    }

    const companyId = user?.companyId;
    const pending = getPendingAddonHold(companyId);

    setDraftWorkerSeatQty((prev) =>
      resolveDraftSeatQty({
        prev,
        serverQty: serverAddonBaseline.workerSeatQty,
        pendingQty: pending?.workerSeatQty ?? null,
      }),
    );
    setDraftPmSeatQty((prev) =>
      resolveDraftSeatQty({
        prev,
        serverQty: serverAddonBaseline.pmSeatQty,
        pendingQty: pending?.pmSeatQty ?? null,
      }),
    );

    if (
      companyId &&
      pending &&
      pending.workerSeatQty === serverAddonBaseline.workerSeatQty &&
      pending.pmSeatQty === serverAddonBaseline.pmSeatQty
    ) {
      clearPendingAddonHold(companyId);
    }
  }, [
    busySeatType,
    serverAddonBaseline?.workerSeatQty,
    serverAddonBaseline?.pmSeatQty,
    user?.companyId,
  ]);

  // Plan change only: real tier switch (growth→unlimited), not undefined→tier.
  useEffect(() => {
    if (!serverAddonBaseline) {
      return;
    }
    const nextTier = serverAddonBaseline.tierSlug;
    const previousTier = lastAddonTierSlugRef.current;
    if (shouldResetAddonDraftsOnTierChange(previousTier, nextTier)) {
      clearPendingAddonHold(user?.companyId);
      setDraftWorkerSeatQty(serverAddonBaseline.workerSeatQty);
      setDraftPmSeatQty(serverAddonBaseline.pmSeatQty);
    }
    lastAddonTierSlugRef.current = nextTier;
  }, [
    serverAddonBaseline?.tierSlug,
    serverAddonBaseline?.workerSeatQty,
    serverAddonBaseline?.pmSeatQty,
    user?.companyId,
  ]);

  const pendingHold = getPendingAddonHold(user?.companyId);
  const addonSteppers = serverAddonBaseline
    ? {
        workerSeatQty:
          draftWorkerSeatQty ??
          pendingHold?.workerSeatQty ??
          serverAddonBaseline.workerSeatQty,
        pmSeatQty:
          draftPmSeatQty ??
          pendingHold?.pmSeatQty ??
          serverAddonBaseline.pmSeatQty,
        workerUnitPrice: serverAddonBaseline.workerUnitPrice,
        pmUnitPrice: serverAddonBaseline.pmUnitPrice,
        busySeatType,
      }
    : null;

  const handleUpdateAddons = useCallback(
    async (_nextWorkerSeatQty: number, _nextPmSeatQty: number) => {
      if (busySeatType) {
        return;
      }
      if (!user?.companyId) {
        Alert.alert(
          t.profile.companyPlan,
          `Unable to update seats. Email ${SUPPORT_EMAIL}.`,
        );
        return;
      }

      // ASC 3.1.1: no in-app seat pack billing — website only.
      showCompanyPlanWebManagementAlert();
    },
    [busySeatType, t.profile.companyPlan, user?.companyId],
  );

  const displayEntitlement = overlayPendingAddonSeatsOnView(
    overlayCheckoutPlanOnView(
      entitlement,
      checkoutResult === "success" ? optimisticCheckoutPlan ?? checkoutPlan : null,
      catalog,
    ),
    pendingHold,
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
