import { useEffect } from "react";

import { useAuthStore } from "@/state/authStore";
import { navigateToCompanyManagementFromRoot } from "@/navigation/rootNavigationHelpers";

/**
 * After Stripe checkout success, land CA on Company management (not Company Plan).
 * Runs inside NavigationContainer once the plan gate clears.
 */
export default function PostCheckoutManagementRedirect() {
  const landOnCompanyManagementAfterCheckout = useAuthStore(
    (state) => state.landOnCompanyManagementAfterCheckout,
  );
  const clearLandOnCompanyManagementAfterCheckout = useAuthStore(
    (state) => state.clearLandOnCompanyManagementAfterCheckout,
  );

  useEffect(() => {
    if (!landOnCompanyManagementAfterCheckout) {
      return;
    }

    const attemptNavigate = () => {
      if (navigateToCompanyManagementFromRoot()) {
        clearLandOnCompanyManagementAfterCheckout();
        return true;
      }
      return false;
    };

    if (attemptNavigate()) {
      return;
    }

    const retryId = setInterval(() => {
      if (attemptNavigate()) {
        clearInterval(retryId);
      }
    }, 100);

    return () => clearInterval(retryId);
  }, [
    clearLandOnCompanyManagementAfterCheckout,
    landOnCompanyManagementAfterCheckout,
  ]);

  return null;
}
