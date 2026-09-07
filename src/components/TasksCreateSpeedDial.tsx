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
import { useAuthStore } from "../state/authStore";
import { isManagerOrAdmin } from "../types/buildtrack";
import { useTranslation } from "../utils/useTranslation";
import {
  setTasksCreateDialExpanded,
  useTasksCreateDialExpanded,
} from "../navigation/tasksCreateSpeedDialStore";
import type { CreateTaskRouteIntent } from "../navigation/newInformationChooser";

type TasksCreateSpeedDialProps = {
  onChoose: (intent: CreateTaskRouteIntent) => void;
};

/**
 * Tasks-tab "+" speed dial: ↑ Report / ↓ Assign (no Update).
 * PM: Report visible but greyed → "Report - Coming soon".
 */
export function TasksCreateSpeedDial({ onChoose }: TasksCreateSpeedDialProps) {
  const expanded = useTasksCreateDialExpanded();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const t = useTranslation();
  const reportEnabled = !isManagerOrAdmin(user);

  const collapse = useCallback(() => {
    setTasksCreateDialExpanded(false);
  }, []);

  const handleReport = useCallback(() => {
    if (!reportEnabled) {
      Alert.alert(
        t.createTask.reportComingSoonTitle || "Report - Coming soon",
        t.createTask.reportComingSoonBody || undefined,
      );
      return;
    }
    collapse();
    onChoose("report");
  }, [collapse, onChoose, reportEnabled, t.createTask.reportComingSoonBody, t.createTask.reportComingSoonTitle]);

  const handleAssign = useCallback(() => {
    collapse();
    onChoose("create");
  }, [collapse, onChoose]);

  if (!expanded) {
    return null;
  }

  const bottomOffset = Math.max(insets.bottom, 8) + 56;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={collapse}
      statusBarTranslucent
    >
      <View style={styles.root} testID="tasks-create-speed-dial">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={collapse}
          style={styles.backdrop}
          testID="tasks-create-speed-dial__backdrop"
        />
        <View
          pointerEvents="box-none"
          style={[styles.dialColumn, { bottom: bottomOffset }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !reportEnabled }}
            accessibilityLabel={
              reportEnabled
                ? t.createTask.dialReportUp || "Report up"
                : t.createTask.reportComingSoonTitle || "Report - Coming soon"
            }
            onPress={handleReport}
            style={[styles.satellite, !reportEnabled ? styles.satelliteDisabled : null]}
            testID="tasks-create-speed-dial__report"
          >
            <Text
              style={[
                styles.satelliteLabel,
                !reportEnabled ? styles.satelliteLabelDisabled : null,
              ]}
              numberOfLines={1}
            >
              {t.createTask.dialReportUp || "Report up"}
            </Text>
            <View
              style={[
                styles.satelliteIcon,
                !reportEnabled ? styles.satelliteIconDisabled : null,
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={22}
                color={reportEnabled ? "#ffffff" : "#94a3b8"}
              />
            </View>
            <View style={styles.satelliteLabelSpacer} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.createTask.dialAssignWork || "Assign work"}
            onPress={handleAssign}
            style={styles.satellite}
            testID="tasks-create-speed-dial__assign"
          >
            <Text style={styles.satelliteLabel} numberOfLines={1}>
              {t.createTask.dialAssignWork || "Assign work"}
            </Text>
            <View style={styles.satelliteIcon}>
              <Ionicons name="arrow-down" size={22} color="#ffffff" />
            </View>
            <View style={styles.satelliteLabelSpacer} />
          </Pressable>
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
    backgroundColor: "rgba(15, 23, 42, 0.52)",
  },
  dialColumn: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 14,
  },
  satellite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  satelliteDisabled: {
    opacity: 0.85,
  },
  satelliteIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#08576E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  satelliteIconDisabled: {
    backgroundColor: "#cbd5e1",
  },
  satelliteLabel: {
    width: 132,
    textAlign: "right",
    fontSize: 19,
    fontWeight: "700",
    color: "#ffffff",
    textShadowColor: "rgba(15, 23, 42, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  satelliteLabelSpacer: {
    width: 132,
  },
  satelliteLabelDisabled: {
    color: "#cbd5e1",
  },
});
