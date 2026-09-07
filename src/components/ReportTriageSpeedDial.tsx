import React, { useCallback } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../utils/useTranslation";
import {
  setReportTriageDialExpanded,
  useReportTriageDialExpanded,
} from "../navigation/reportTriageSpeedDialStore";

/** Reply lives in the Unified Triage Dock — dial is Create task / Resolve only. */
export type ReportTriageDialAction = "create_task" | "resolve";

export type ReportSpeedDialVariant = "pm_triage" | "worker_report";

type ReportTriageSpeedDialProps = {
  onChoose: (action: ReportTriageDialAction) => void;
  /**
   * Worker report dial: Resolve with the dock comment (required).
   * Opens when worker taps leading +.
   */
  onResolveWithComment?: () => void;
  variant?: ReportSpeedDialVariant;
  /**
   * Height of the Unified Triage Dock above the home indicator so satellites
   * stack from the dock's leading "+" rather than the (hidden) root FAB.
   */
  dockHeight?: number;
};

/**
 * Reported Task Detail speed dial.
 * PM: Create task / Resolve. Worker: Resolve with comment.
 * Anchored above the dock's leading "+" control.
 */
export function ReportTriageSpeedDial({
  onChoose,
  onResolveWithComment,
  variant = "pm_triage",
  dockHeight = 56,
}: ReportTriageSpeedDialProps) {
  const expanded = useReportTriageDialExpanded();
  const insets = useSafeAreaInsets();
  const t = useTranslation();

  const collapse = useCallback(() => {
    setReportTriageDialExpanded(false);
  }, []);

  const handleCreateTask = useCallback(() => {
    collapse();
    onChoose("create_task");
  }, [collapse, onChoose]);

  const handleResolve = useCallback(() => {
    collapse();
    Alert.alert(
      t.createTask?.resolveReportConfirmTitle || "Resolve without reply?",
      t.createTask?.resolveReportConfirmBody ||
        "Closes this report for triage. The report and full history stay in the project forever.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: t.createTask?.resolveReportConfirmAction || "Resolve without reply",
          onPress: () => onChoose("resolve"),
        },
      ],
    );
  }, [collapse, onChoose, t.createTask]);

  const handleWorkerResolve = useCallback(() => {
    collapse();
    onResolveWithComment?.();
  }, [collapse, onResolveWithComment]);

  if (!expanded) {
    return null;
  }

  const bottomOffset = Math.max(insets.bottom, 8) + dockHeight + 10;
  const isWorker = variant === "worker_report";

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={collapse}
      statusBarTranslucent
    >
      <View style={styles.root} testID="report-triage-speed-dial">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={collapse}
          style={styles.backdrop}
          testID="report-triage-speed-dial__backdrop"
        />
        <View
          pointerEvents="box-none"
          style={[styles.dialColumn, { bottom: bottomOffset }]}
        >
          {isWorker ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                t.createTask?.resolveReport || "Resolve with comment"
              }
              onPress={handleWorkerResolve}
              style={styles.satellite}
              testID="report-triage-speed-dial__resolve"
            >
              <View style={styles.satelliteIcon}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#08576E"
                />
              </View>
              <Text style={styles.satelliteLabel} numberOfLines={1}>
                {t.createTask?.resolveReport || "Resolve"}
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  t.createTask?.createTaskFromReport || "Create task"
                }
                onPress={handleCreateTask}
                style={styles.satellite}
                testID="report-triage-speed-dial__create-task"
              >
                <View style={styles.satelliteIcon}>
                  <Ionicons name="person-add-outline" size={20} color="#08576E" />
                </View>
                <Text style={styles.satelliteLabel} numberOfLines={1}>
                  {t.createTask?.createTaskFromReport || "Create task"}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.createTask?.resolveReport || "Resolve"}
                onPress={handleResolve}
                style={styles.satellite}
                testID="report-triage-speed-dial__resolve"
              >
                <View style={styles.satelliteIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#08576E"
                  />
                </View>
                <Text style={styles.satelliteLabel} numberOfLines={1}>
                  {t.createTask?.resolveReport || "Resolve"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  dialColumn: {
    position: "absolute",
    left: 12,
    alignItems: "flex-start",
    gap: 10,
  },
  satellite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  satelliteIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  satelliteLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    paddingRight: 4,
  },
});
