import { Alert } from "react-native";
import { isManagerOrAdmin, type User } from "../types/buildtrack";

/** Route param / chooser outcome for peer Report vs Assign entry. */
export type CreateTaskRouteIntent = "report" | "create";

export type NewInformationChooserLabels = {
  title: string;
  /** Up-arrow Report (worker → PM). */
  report: string;
  /** Side-to-side Update (existing task). */
  update: string;
  /** Down-arrow Assign (create for self / subordinates). */
  assign: string;
  cancel: string;
  /** Shown when PM taps Report (multi-company later). */
  reportComingSoon?: string;
};

/** Unicode arrows — native Alert cannot render Ionicons. */
export const DEFAULT_NEW_INFORMATION_CHOOSER_LABELS: NewInformationChooserLabels = {
  title: "What would you like to do?",
  report: "↑ Report",
  update: "↔ Update",
  assign: "↓ Assign",
  cancel: "Cancel",
  reportComingSoon: "Report - Coming soon",
};

export function canShowReportInChooser(user: User | null | undefined): boolean {
  // Active Report for workers; PMs still see Report but greyed / Coming soon elsewhere.
  return Boolean(user) && !isManagerOrAdmin(user);
}

export function isReportComingSoonForUser(user: User | null | undefined): boolean {
  return Boolean(user) && isManagerOrAdmin(user);
}

/**
 * Camera post-capture peer chooser: Report (↑) | Update (↔) | Assign (↓) | Cancel.
 * PM Report → "Report - Coming soon" (still listed so the fork is teachable).
 */
export function promptNewInformationChooser({
  user,
  includeUpdate = true,
  labels = DEFAULT_NEW_INFORMATION_CHOOSER_LABELS,
  onReport,
  onAssign,
  onUpdate,
  onCancel,
}: {
  user?: User | null;
  includeUpdate?: boolean;
  labels?: NewInformationChooserLabels;
  onReport?: () => void;
  /** Create / assign-down path. */
  onAssign: () => void;
  onUpdate?: () => void;
  onCancel?: () => void;
}): void {
  const buttons: Array<{
    text: string;
    style?: "cancel" | "destructive" | "default";
    onPress?: () => void;
  }> = [];

  buttons.push({
    text: labels.report,
    onPress: () => {
      if (isReportComingSoonForUser(user)) {
        Alert.alert(labels.reportComingSoon || "Report - Coming soon");
        return;
      }
      onReport?.();
    },
  });

  if (includeUpdate && onUpdate) {
    buttons.push({
      text: labels.update,
      onPress: onUpdate,
    });
  }

  buttons.push({
    text: labels.assign,
    onPress: onAssign,
  });

  buttons.push({
    text: labels.cancel,
    style: "cancel",
    onPress: onCancel,
  });

  Alert.alert(labels.title, undefined, buttons);
}
