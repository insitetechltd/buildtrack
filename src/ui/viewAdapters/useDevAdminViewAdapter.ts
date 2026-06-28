import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import { useAuthStore } from "@/state/authStore";
import { useDatabaseConfig } from "@/state/databaseConfigStore";
import { getUserSystemPermission } from "@/types/buildtrack";
import type {
  DevAdminEnvironmentTone,
  DevAdminScreenViewAdapterOutput,
  DevAdminToolActionId,
  DevAdminToolActionItem,
} from "@/ui/contracts/viewAdapters";
import * as databaseUtils from "@/utils/databaseUtils";

const AUTHORIZED_DEV_ADMIN_EMAIL = "admin_tristan@insitetech.com";

export interface DevAdminViewAdapterProps {
  onNavigateBack: () => void;
}

export interface DevAdminViewAdapterHookResult {
  output: DevAdminScreenViewAdapterOutput;
  actions: {
    handleNavigateBack: () => void;
    handleToolActionPress: (actionId: DevAdminToolActionId) => void;
    handleEnvironmentPress: (envName: string) => void;
    handleRemoveEnvironment: (envName: string) => void;
    handleToggleAddEnvironment: () => void;
    handleSubmitNewEnvironment: () => void;
    setNewEnvironmentName: (value: string) => void;
    setNewEnvironmentUrl: (value: string) => void;
    setNewEnvironmentKey: (value: string) => void;
  };
}

function getEnvironmentTone(envName: string): DevAdminEnvironmentTone {
  if (envName === "production") {
    return "production";
  }

  if (envName === "testing") {
    return "testing";
  }

  return "custom";
}

function createToolAction(
  actionId: DevAdminToolActionId,
  title: string,
  description: string,
  icon: string,
  color: string,
): DevAdminToolActionItem {
  return {
    id: `dev-admin-tool:${actionId}`,
    actionId,
    title,
    description,
    icon,
    color,
    density: "standard",
    structuralState: "stale",
  };
}

export function useDevAdminViewAdapter(
  props: DevAdminViewAdapterProps,
): DevAdminViewAdapterHookResult {
  const { onNavigateBack } = props;
  const { user } = useAuthStore();
  const {
    activeEnvironment,
    environments,
    switchEnvironment,
    addEnvironment,
    removeEnvironment,
  } = useDatabaseConfig();

  const [isBusy, setIsBusy] = useState(false);
  const [showAddEnvironment, setShowAddEnvironment] = useState(false);
  const [newEnvironmentName, setNewEnvironmentName] = useState("");
  const [newEnvironmentUrl, setNewEnvironmentUrl] = useState("");
  const [newEnvironmentKey, setNewEnvironmentKey] = useState("");

  const isAllowed = user?.email === AUTHORIZED_DEV_ADMIN_EMAIL;

  const runBusyAction = useCallback(async (task: () => Promise<void>) => {
    setIsBusy(true);

    try {
      await task();
    } finally {
      setIsBusy(false);
    }
  }, []);

  const handleNavigateBack = useCallback(() => {
    onNavigateBack();
  }, [onNavigateBack]);

  const handleEnvironmentPress = useCallback(
    (envName: string) => {
      const switchTask = async () => {
        try {
          await switchEnvironment(envName);
          Alert.alert("Success", `Switched to ${envName}`);
        } catch (error: any) {
          Alert.alert("Error", error.message);
        }
      };

      if (envName === "production") {
        Alert.alert(
          "Switch to Production?",
          "You are about to switch to the production database. Be careful!",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Switch",
              onPress: () => {
                void runBusyAction(switchTask);
              },
            },
          ],
        );
        return;
      }

      void runBusyAction(switchTask);
    },
    [runBusyAction, switchEnvironment],
  );

  const handleToggleAddEnvironment = useCallback(() => {
    setShowAddEnvironment((current) => !current);
  }, []);

  const handleSubmitNewEnvironment = useCallback(() => {
    if (!newEnvironmentName || !newEnvironmentUrl || !newEnvironmentKey) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    try {
      addEnvironment(newEnvironmentName, newEnvironmentUrl, newEnvironmentKey);
      setShowAddEnvironment(false);
      setNewEnvironmentName("");
      setNewEnvironmentUrl("");
      setNewEnvironmentKey("");
      Alert.alert("Success", `Environment "${newEnvironmentName}" added`);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  }, [addEnvironment, newEnvironmentKey, newEnvironmentName, newEnvironmentUrl]);

  const handleRemoveEnvironment = useCallback(
    (envName: string) => {
      if (envName === "production") {
        Alert.alert("Error", "Cannot remove production environment");
        return;
      }

      Alert.alert("Remove Environment", `Remove "${envName}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            try {
              removeEnvironment(envName);
              Alert.alert("Success", "Environment removed");
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]);
    },
    [removeEnvironment],
  );

  const handleToolActionPress = useCallback(
    (actionId: DevAdminToolActionId) => {
      const runToolAction = async () => {
        try {
          switch (actionId) {
            case "generate-mock":
              await databaseUtils.generateMockTasks(50);
              Alert.alert("Success", "50 mock tasks generated");
              return;
            case "seed-db":
              await databaseUtils.seedDatabase();
              Alert.alert("Success", "Database seeded with sample data");
              return;
            case "run-tests": {
              const results = await databaseUtils.runComprehensiveTests();
              Alert.alert(
                "Test Results",
                `Passed: ${results.passed}\nFailed: ${results.failed}\nTotal: ${results.total}`,
              );
              return;
            }
            case "check-health": {
              const health = await databaseUtils.checkDatabaseHealth();
              Alert.alert(
                "Database Health",
                `Status: ${health.status}\n` +
                  `Tables: ${health.tables}\n` +
                  `Users: ${health.users}\n` +
                  `Projects: ${health.projects}\n` +
                  `Tasks: ${health.tasks}\n` +
                  `Response Time: ${health.responseTime}ms`,
              );
              return;
            }
            default:
              return;
          }
        } catch (error: any) {
          Alert.alert("Error", error.message);
        }
      };

      if (actionId === "cleanup-mock") {
        Alert.alert("Confirm Cleanup", "This will remove all mock tasks. Continue?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void runBusyAction(async () => {
                try {
                  await databaseUtils.cleanupMockTasks();
                  Alert.alert("Success", "Mock tasks deleted");
                } catch (error: any) {
                  Alert.alert("Error", error.message);
                }
              });
            },
          },
        ]);
        return;
      }

      if (actionId === "reset-db") {
        Alert.alert(
          "DANGER: Reset Database",
          "This will DELETE ALL DATA in the current environment. This cannot be undone!",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "RESET",
              style: "destructive",
              onPress: () => {
                void runBusyAction(async () => {
                  try {
                    await databaseUtils.resetDatabase();
                    Alert.alert("Success", "Database reset complete");
                  } catch (error: any) {
                    Alert.alert("Error", error.message);
                  }
                });
              },
            },
          ],
        );
        return;
      }

      void runBusyAction(runToolAction);
    },
    [runBusyAction],
  );

  const output = useMemo<DevAdminScreenViewAdapterOutput>(() => {
    const activeEnvironmentRecord =
      activeEnvironment && environments[activeEnvironment] ? environments[activeEnvironment] : null;
    const environmentItems = Object.keys(environments).map((envName) => ({
      id: `dev-admin-environment:${envName}`,
      envName,
      label: envName,
      url: environments[envName].url,
      isActive: activeEnvironment === envName,
      isRemovable: envName !== "production",
      tone: getEnvironmentTone(envName),
      density: "standard" as const,
      structuralState: "stale" as const,
    }));

    return {
      screenId: "DevAdminScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: Boolean(user),
        isBackgroundRefreshing: false,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: false,
        hasCachedFrame: Boolean(user),
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: false,
        freshnessLabel: "Ready",
      },
      access: {
        isAllowed,
        deniedMessage: isAllowed
          ? null
          : "Dev Admin Tools are restricted to authorized personnel only.",
        displayName: isAllowed ? user?.name || null : null,
        email: isAllowed ? user?.email || null : null,
        roleLabel: isAllowed && user ? getUserSystemPermission(user).toUpperCase() : null,
      },
      title: "Dev Admin",
      userInfoLabel: "LOGGED IN AS",
      activeEnvironment: activeEnvironmentRecord
        ? {
            name: activeEnvironmentRecord.name,
            badgeLabel: activeEnvironmentRecord.name.toUpperCase(),
            url: activeEnvironmentRecord.url,
            tone: getEnvironmentTone(activeEnvironmentRecord.name),
          }
        : null,
      environmentSection: {
        title: "DATABASE ENVIRONMENTS",
        addActionLabel: showAddEnvironment ? "Close" : "Add",
        environments: environmentItems,
      },
      addEnvironmentForm: {
        isVisible: showAddEnvironment,
        name: newEnvironmentName,
        url: newEnvironmentUrl,
        anonKey: newEnvironmentKey,
        canSubmit: Boolean(newEnvironmentName && newEnvironmentUrl && newEnvironmentKey),
      },
      toolSection: {
        title: "TESTING TOOLS",
        actions: [
          createToolAction(
            "generate-mock",
            "Generate Mock Tasks",
            "Create test tasks for current environment",
            "create-outline",
            "#4CAF50",
          ),
          createToolAction(
            "cleanup-mock",
            "Cleanup Mock Tasks",
            "Remove all mock/test tasks",
            "trash-outline",
            "#FF9800",
          ),
          createToolAction(
            "reset-db",
            "Reset Database",
            "Clear all data and reset to initial state",
            "refresh-outline",
            "#F44336",
          ),
          createToolAction(
            "seed-db",
            "Seed Database",
            "Populate with sample data",
            "bulb-outline",
            "#2196F3",
          ),
          createToolAction(
            "run-tests",
            "Run Comprehensive Tests",
            "Execute full test suite",
            "checkmark-done-outline",
            "#9C27B0",
          ),
          createToolAction(
            "check-health",
            "Database Health Check",
            "Verify database connection and integrity",
            "medkit-outline",
            "#00BCD4",
          ),
        ],
      },
      productionWarning:
        activeEnvironment === "production"
          ? "You are connected to PRODUCTION database. Be extremely careful!"
          : null,
      loadingState: {
        isBusy,
        loadingMessage: "Processing...",
      },
    };
  }, [
    activeEnvironment,
    environments,
    isAllowed,
    isBusy,
    newEnvironmentKey,
    newEnvironmentName,
    newEnvironmentUrl,
    showAddEnvironment,
    user,
  ]);

  return {
    output,
    actions: {
      handleNavigateBack,
      handleToolActionPress,
      handleEnvironmentPress,
      handleRemoveEnvironment,
      handleToggleAddEnvironment,
      handleSubmitNewEnvironment,
      setNewEnvironmentName,
      setNewEnvironmentUrl,
      setNewEnvironmentKey,
    },
  };
}
