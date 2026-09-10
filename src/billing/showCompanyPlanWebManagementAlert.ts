import { Alert, Linking } from "react-native";

import {
  COMPANY_PLAN_MANAGEMENT_URL,
  SUPPORT_EMAIL,
} from "@/legal/legalLinks";

const TITLE = "Manage plan on the web";
const MESSAGE =
  "Plan changes and extra seats are managed on the Insite website. Open the site to view plans and complete billing there. When you're done, return to the app and refresh.";

/**
 * ASC 3.1.1: do not start Stripe checkout or paid seat mutations from the app.
 * Point company admins at the public marketing/pricing page instead.
 */
export function showCompanyPlanWebManagementAlert(): void {
  Alert.alert(TITLE, MESSAGE, [
    { text: "Not now", style: "cancel" },
    {
      text: "Open website",
      onPress: () => {
        void Linking.openURL(COMPANY_PLAN_MANAGEMENT_URL).catch(() => {
          Alert.alert(
            TITLE,
            `Unable to open the website. Visit ${COMPANY_PLAN_MANAGEMENT_URL} or email ${SUPPORT_EMAIL}.`,
          );
        });
      },
    },
  ]);
}
