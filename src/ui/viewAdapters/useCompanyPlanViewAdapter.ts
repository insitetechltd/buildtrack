import { useCallback, useEffect, useState } from "react";
import { Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { createCompanyCheckoutSession } from "@/api/createCheckoutSession";
import { fetchCompanyEntitlementView } from "@/api/fetchCompanyEntitlements";
import {
  overlayCheckoutPlanOnView,
  parseBaseTierSlug,
} from "@/billing/companyEntitlementSummary";
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
} from "@/billing/companyPlanOptions";
import {
  displayNameForPlanSlug,
  type OrgCheckoutPlanTierSlug,
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
  onNavigateBack: () => void;
  checkoutResult?: "success" | "cancel";
  checkoutPlan?: OrgCheckoutPlanTierSlug;
}

export interface CompanyPlanViewAdapterHookResult {
  output: CompanyPlanScreenViewAdapterOutput;
  actions: {
    handleRefresh: () => Promise<void>;
    handlePlanAction: (planId: OrgCheckoutPlanTierSlug) => Promise<void>;
    dismissStatusBanner: () => void;
  };
}

export function useCompanyPlanViewAdapter(
  props: CompanyPlanViewAdapterProps,
): CompanyPlanViewAdapterHookResult {
  const { checkoutResult, checkoutPlan } = props;
  const t = useTranslation();
  const { user } = useAuthStore();
  const [entitlement, setEntitlement] =
    useState<Awaited<ReturnType<typeof fetchCompanyEntitlementView>>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionInFlight, setIsActionInFlight] = useState(false);
  const [activeActionPlanId, setActiveActionPlanId] =
    useState<OrgCheckoutPlanTierSlug | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [statusBanner, setStatusBanner] =
    useState<CompanyPlanStatusBannerModel | null>(null);
  const [optimisticCheckoutPlan, setOptimisticCheckoutPlan] =
    useState<OrgCheckoutPlanTierSlug | null>(null);

  const loadEntitlement = useCallback(async () => {
    if (!user?.companyId) {
      setEntitlement(null);
      setHasLoadedOnce(true);
      return;
    }

    const view = await fetchCompanyEntitlementView(user.companyId);
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
        ? displayNameForPlanSlug(chosenPlan)
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
        const live = parseBaseTierSlug(view?.tierSlug);
        if (view?.hasStripeSubscription && (!chosenPlan || live === chosenPlan)) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkoutPlan, checkoutResult, user?.companyId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadEntitlement();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadEntitlement]);

  const handlePlanAction = useCallback(
    async (planId: OrgCheckoutPlanTierSlug) => {
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
        ),
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
        });

        if (result.success && result.upgraded) {
          await loadEntitlement();
          setStatusBanner({
            id: "company-plan:upgrade-success",
            tone: "success",
            message: `Upgraded to ${displayNameForPlanSlug(planId)}. Promo or paid period limits stay in place until your billing phase changes.`,
          });
          return;
        }

        if (result.success && result.url) {
          rememberCheckoutPlan(planId);
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
    [checkoutPlan, checkoutResult, entitlement, loadEntitlement, optimisticCheckoutPlan, t.profile.companyPlan, user?.companyId],
  );

  const displayEntitlement = overlayCheckoutPlanOnView(
    entitlement,
    checkoutResult === "success" ? optimisticCheckoutPlan ?? checkoutPlan : null,
  );

  const planOptions: CompanyPlanOptionModel[] = buildCompanyPlanOptions(
    displayEntitlement,
  ).map((option) => ({
    id: option.id,
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
          limitRows: buildCompanyPlanLimitRows(displayEntitlement),
        }
      : null,
    planOptions,
    statusBanner,
    activeActionPlanId,
    isLoading: isLoading && !hasLoadedOnce,
    isRefreshing,
    isActionInFlight,
    supportEmail: SUPPORT_EMAIL,
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
