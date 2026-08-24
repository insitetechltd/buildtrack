import { useCallback, useEffect, useState } from "react";
import { Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { createCompanyCheckoutSession } from "@/api/createCheckoutSession";
import { fetchCompanyEntitlementView } from "@/api/fetchCompanyEntitlements";
import { fetchSellablePlanCatalog } from "@/api/fetchSellablePlanCatalog";
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
    setHasLoadedOnce(true);
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
      dismissStatusBanner: () => setStatusBanner(null),
    },
  };
}
