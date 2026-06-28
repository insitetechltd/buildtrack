import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { runStorageUploadDiagnostic } from "@/api/storageUploadDiagnostic";
import { supabase } from "@/api/supabase";
import { useCompanyStore } from "@/state/companyStore";
import { useAuthStore } from "@/state/authStore";
import { useDevToggleStore } from "@/state/devToggleStore";
import { useProjectStoreWithInit } from "@/state/projectStore.supabase";
import { useTaskStore } from "@/state/taskStore.supabase";
import { useUserStore } from "@/state/userStore.supabase";
import type {
  DeveloperSettingsActionColor,
  DeveloperSettingsActionId,
  DeveloperSettingsActionItem,
  DeveloperSettingsScenarioPreset,
  DeveloperSettingsScreenViewAdapterOutput,
} from "@/ui/contracts/viewAdapters";
import {
  initializeSprint7RuntimeSandbox,
  isSprint7RuntimeSandboxLoaded,
  loadScenarioAPreset,
  loadScenarioBPreset,
  loadScenarioCPreset,
  switchSprint7RuntimeSandboxActor,
} from "@/test-utils/sprint7RuntimeSandbox";

export interface DeveloperSettingsViewAdapterProps {
  onNavigateBack: () => void;
}

export interface DeveloperSettingsViewAdapterHookResult {
  output: DeveloperSettingsScreenViewAdapterOutput;
  actions: {
    handleNavigateBack: () => void;
    handleToggleUiMode: () => void;
    handleForceSyncAll: () => void;
    handleClearTaskCache: () => void;
    handleClearProjectCache: () => void;
    handleClearUserCache: () => void;
    handleViewStorageKeys: () => void;
    handleInitializeSprint7Sandbox: () => void;
    handleScenarioPresetPress: (preset: DeveloperSettingsScenarioPreset) => void;
    handleTestUpload: () => void;
    handleClearAllLocalData: () => void;
  };
}

function createActionItem(
  actionId: DeveloperSettingsActionId,
  label: string,
  description: string,
  icon: string,
  color: DeveloperSettingsActionColor,
  isDisabled = false,
): DeveloperSettingsActionItem {
  return {
    id: `developer-settings-action:${actionId}`,
    actionId,
    label,
    description,
    icon,
    color,
    isDisabled,
    density: "standard",
    structuralState: "stale",
  };
}

export function useDeveloperSettingsViewAdapter(
  props: DeveloperSettingsViewAdapterProps,
): DeveloperSettingsViewAdapterHookResult {
  const { onNavigateBack } = props;
  const { user, logout } = useAuthStore();
  const { uiModernizationMode, toggleUiMode } = useDevToggleStore();
  const taskStore = useTaskStore();
  const projectStore = useProjectStoreWithInit();
  const userStore = useUserStore();
  const companyStore = useCompanyStore();

  const [isClearing, setIsClearing] = useState(false);
  const [isTestingUpload, setIsTestingUpload] = useState(false);
  const [isInitializingSprint7Sandbox, setIsInitializingSprint7Sandbox] = useState(false);

  const sprint7SandboxLoaded = isSprint7RuntimeSandboxLoaded();

  const handleNavigateBack = useCallback(() => {
    onNavigateBack();
  }, [onNavigateBack]);

  const handleToggleUiMode = useCallback(() => {
    toggleUiMode();
    Alert.alert(
      "UI Mode Updated",
      `Now running: ${uiModernizationMode === "modern" ? "Legacy" : "Modern"}`,
      [{ text: "OK" }],
    );
  }, [toggleUiMode, uiModernizationMode]);

  const handleClearAllLocalData = useCallback(() => {
    Alert.alert(
      "⚠️ Clear All Local Data",
      "This will:\n\n• Clear all cached tasks, projects, users, and companies\n• Log you out\n• Force you to login again\n\nThe data in Supabase will NOT be affected.\n\nAre you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear & Logout",
          style: "destructive",
          onPress: async () => {
            setIsClearing(true);

            try {
              const keys = await AsyncStorage.getAllKeys();
              await AsyncStorage.multiRemove(keys);

              Alert.alert("Success", "All local data has been cleared. The app will now logout.", [
                {
                  text: "OK",
                  onPress: () => {
                    logout();
                  },
                },
              ]);
            } catch (error) {
              console.error("❌ [Developer] Error clearing local data:", error);
              Alert.alert("Error", "Failed to clear local data. Please try again.");
            } finally {
              setIsClearing(false);
            }
          },
        },
      ],
    );
  }, [logout]);

  const handleClearTaskCache = useCallback(() => {
    Alert.alert(
      "Clear Task Cache",
      "This will clear all cached tasks and force a refresh from Supabase.\n\nContinue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("insite-tasks-supabase-v1");
              await taskStore.fetchTasks();
              Alert.alert("Success", "Task cache cleared and refreshed from Supabase.");
            } catch (error) {
              console.error("❌ [Developer] Error clearing task cache:", error);
              Alert.alert("Error", "Failed to clear task cache.");
            }
          },
        },
      ],
    );
  }, [taskStore]);

  const handleClearProjectCache = useCallback(() => {
    Alert.alert(
      "Clear Project Cache",
      "This will clear all cached projects and force a refresh from Supabase.\n\nContinue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("buildtrack-projects");
              await AsyncStorage.removeItem("buildtrack-projects-legacy");
              await projectStore.fetchProjects(true);

              if (user) {
                await projectStore.fetchUserProjectAssignments(user.id, true);
              }

              Alert.alert("Success", "Project cache cleared and refreshed from Supabase.");
            } catch (error) {
              console.error("❌ [Developer] Error clearing project cache:", error);
              Alert.alert("Error", "Failed to clear project cache.");
            }
          },
        },
      ],
    );
  }, [projectStore, user]);

  const handleClearUserCache = useCallback(() => {
    Alert.alert(
      "Clear User Cache",
      "This will clear all cached users and force a refresh from Supabase.\n\nContinue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("insite-users-supabase-v1");
              await userStore.fetchUsers();
              Alert.alert("Success", "User cache cleared and refreshed from Supabase.");
            } catch (error) {
              console.error("❌ [Developer] Error clearing user cache:", error);
              Alert.alert("Error", "Failed to clear user cache.");
            }
          },
        },
      ],
    );
  }, [userStore]);

  const handleForceSyncAll = useCallback(() => {
    void (async () => {
      try {
        await Promise.all([
          taskStore.fetchTasks(),
          projectStore.fetchProjects(),
          user ? projectStore.fetchUserProjectAssignments(user.id) : Promise.resolve(),
          userStore.fetchUsers(),
          companyStore.fetchCompanies(),
        ]);

        Alert.alert("Success", "All data synced from Supabase successfully!");
      } catch (error) {
        console.error("❌ [Developer] Error syncing data:", error);
        Alert.alert("Error", "Failed to sync data from Supabase.");
      }
    })();
  }, [companyStore, projectStore, taskStore, user, userStore]);

  const handleViewStorageKeys = useCallback(() => {
    void (async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const keyList = keys.length > 0 ? keys.join("\n• ") : "No keys found";

        Alert.alert("AsyncStorage Keys", `Found ${keys.length} keys:\n\n• ${keyList}`, [
          { text: "OK" },
        ]);
      } catch (error) {
        console.error("❌ [Developer] Error getting storage keys:", error);
        Alert.alert("Error", "Failed to get storage keys.");
      }
    })();
  }, []);

  const handleTestUpload = useCallback(() => {
    void (async () => {
      if (!user) {
        Alert.alert("Error", "You must be logged in to test uploads.");
        return;
      }

      setIsTestingUpload(true);

      try {
        const results = await runStorageUploadDiagnostic(supabase as never);
        Alert.alert("Upload Test Results", results.join("\n"));
      } catch (error: any) {
        console.error("❌ [Developer] Upload test error:", error);
        Alert.alert("Upload Test Results", `\n❌ Test error: ${error.message}`);
      } finally {
        setIsTestingUpload(false);
      }
    })();
  }, [user]);

  const runSprint7SandboxAction = useCallback(
    async (mode: "initialize" | "switch", actor: "tristan" | "herman") => {
      setIsInitializingSprint7Sandbox(true);

      try {
        if (mode === "initialize") {
          await initializeSprint7RuntimeSandbox({ activeActor: actor });
        } else {
          await switchSprint7RuntimeSandboxActor(actor);
        }

        const actorLabel = actor === "tristan" ? "Tristan" : "Herman";
        const actionLabel = mode === "initialize" ? "initialized" : "switched";

        Alert.alert(
          "Sprint 7 Sandbox Ready",
          `Sprint 7 staging sandbox ${actionLabel} for ${actorLabel}.`,
        );
      } catch (error: any) {
        console.error("❌ [Developer] Sprint 7 sandbox error:", error);
        Alert.alert(
          "Sprint 7 Sandbox Error",
          error.message || "Failed to load the Sprint 7 sandbox.",
        );
      } finally {
        setIsInitializingSprint7Sandbox(false);
      }
    },
    [],
  );

  const handleInitializeSprint7Sandbox = useCallback(() => {
    Alert.alert(
      "Initialize Sprint 7 Staging Sandbox",
      sprint7SandboxLoaded
        ? "Choose whether to reset the canonical Sprint 7 dataset or switch the active sandbox user."
        : "Load the canonical Tristan/Herman dataset and choose which user to open first.",
      [
        {
          text: "Reset as Tristan",
          onPress: () => {
            void runSprint7SandboxAction("initialize", "tristan");
          },
        },
        {
          text: "Reset as Herman",
          onPress: () => {
            void runSprint7SandboxAction("initialize", "herman");
          },
        },
        {
          text: "Switch to Tristan",
          onPress: () => {
            void runSprint7SandboxAction("switch", "tristan");
          },
        },
        {
          text: "Switch to Herman",
          onPress: () => {
            void runSprint7SandboxAction("switch", "herman");
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }, [runSprint7SandboxAction, sprint7SandboxLoaded]);

  const handleScenarioPresetPress = useCallback(
    (preset: DeveloperSettingsScenarioPreset) => {
      void (async () => {
        if (!sprint7SandboxLoaded) {
          Alert.alert(
            "Initialize Sprint 7 First",
            "Load the Sprint 7 staging sandbox before applying a scenario preset.",
          );
          return;
        }

        setIsInitializingSprint7Sandbox(true);

        try {
          if (preset === "A") {
            await loadScenarioAPreset();
          } else if (preset === "B") {
            await loadScenarioBPreset();
          } else {
            await loadScenarioCPreset();
          }

          const presetLabel =
            preset === "A"
              ? "Preset A: Rejection Loop"
              : preset === "B"
                ? "Preset B: Overdue Crunch"
                : "Preset C: Isolation Wall";

          Alert.alert("Sprint 7 Preset Loaded", `${presetLabel} is ready for validation.`);
        } catch (error: any) {
          console.error("❌ [Developer] Sprint 7 preset error:", error);
          Alert.alert(
            "Sprint 7 Preset Error",
            error.message || "Failed to load the Sprint 7 preset.",
          );
        } finally {
          setIsInitializingSprint7Sandbox(false);
        }
      })();
    },
    [sprint7SandboxLoaded],
  );

  const output = useMemo<DeveloperSettingsScreenViewAdapterOutput>(() => {
    const statistics = [
      { id: "tasks", label: "Tasks", count: taskStore.tasks.length },
      { id: "projects", label: "Projects", count: projectStore.projects.length },
      { id: "users", label: "Users", count: userStore.users.length },
      { id: "companies", label: "Companies", count: companyStore.companies.length },
    ];

    return {
      screenId: "DeveloperSettingsScreen",
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
        isAuthenticated: Boolean(user),
      },
      title: "Developer Settings",
      warningTitle: "Developer Tools",
      warningMessage: "These tools are for testing and development. Use with caution!",
      statistics,
      uiMode: {
        currentMode: uiModernizationMode,
        currentModeLabel: uiModernizationMode === "modern" ? "Modern" : "Legacy",
        description: "Long-press to toggle between legacy and modern screens",
      },
      loadingState: {
        isClearing,
        isTestingUpload,
        isInitializingSprint7Sandbox,
      },
      actionGroups: [
        {
          id: "sync-actions",
          title: "Sync Actions",
          actions: [
            createActionItem(
              "force-sync-all",
              "Force Sync All Data",
              "Re-fetch all data from Supabase",
              "sync",
              "blue",
            ),
          ],
        },
        {
          id: "clear-cache",
          title: "Clear Cache",
          actions: [
            createActionItem(
              "clear-task-cache",
              "Clear Task Cache",
              "Clear cached tasks only",
              "trash-outline",
              "orange",
            ),
            createActionItem(
              "clear-project-cache",
              "Clear Project Cache",
              "Clear cached projects only",
              "trash-outline",
              "orange",
            ),
            createActionItem(
              "clear-user-cache",
              "Clear User Cache",
              "Clear cached users only",
              "trash-outline",
              "orange",
            ),
          ],
        },
        {
          id: "debug-tools",
          title: "Debug Tools",
          supplementaryLabel: "Sprint 7 Quick Presets",
          actions: [
            createActionItem(
              "view-storage-keys",
              "View Storage Keys",
              "See all AsyncStorage keys",
              "key-outline",
              "purple",
            ),
            createActionItem(
              "initialize-sprint7-sandbox",
              "Initialize Sprint 7 Staging Sandbox",
              "Load or switch the canonical Tristan/Herman QA dataset",
              "flask-outline",
              "blue",
              isInitializingSprint7Sandbox,
            ),
            createActionItem(
              "test-file-upload",
              "Test File Upload",
              "Test Supabase storage upload functionality",
              "cloud-upload-outline",
              "green",
              isTestingUpload,
            ),
          ],
        },
        {
          id: "danger-zone",
          title: "⚠️ Danger Zone",
          actions: [
            createActionItem(
              "clear-all-local-data",
              "Clear All Local Data & Logout",
              "Wipe everything and start fresh",
              "nuclear",
              "red",
              isClearing,
            ),
          ],
        },
      ],
      scenarioPresets: [
        {
          id: "developer-settings-preset:A",
          preset: "A",
          label: "Preset A: Rejection Loop",
          isDisabled: !sprint7SandboxLoaded || isInitializingSprint7Sandbox,
          testID: "developer-settings__preset_a",
          density: "compact",
          structuralState: sprint7SandboxLoaded ? "stale" : "disabled",
        },
        {
          id: "developer-settings-preset:B",
          preset: "B",
          label: "Preset B: Overdue Crunch",
          isDisabled: !sprint7SandboxLoaded || isInitializingSprint7Sandbox,
          testID: "developer-settings__preset_b",
          density: "compact",
          structuralState: sprint7SandboxLoaded ? "stale" : "disabled",
        },
        {
          id: "developer-settings-preset:C",
          preset: "C",
          label: "Preset C: Isolation Wall",
          isDisabled: !sprint7SandboxLoaded || isInitializingSprint7Sandbox,
          testID: "developer-settings__preset_c",
          density: "compact",
          structuralState: sprint7SandboxLoaded ? "stale" : "disabled",
        },
      ],
      scenarioPresetHint: sprint7SandboxLoaded
        ? null
        : "Initialize the Sprint 7 sandbox first to enable these presets.",
      infoMessage:
        "ℹ️ Note: Clearing local data does NOT affect your Supabase database. All data will be re-downloaded when you login again.",
    };
  }, [
    companyStore.companies.length,
    isClearing,
    isInitializingSprint7Sandbox,
    isTestingUpload,
    projectStore.projects.length,
    sprint7SandboxLoaded,
    taskStore.tasks.length,
    uiModernizationMode,
    user,
    userStore.users.length,
  ]);

  return {
    output,
    actions: {
      handleNavigateBack,
      handleToggleUiMode,
      handleForceSyncAll,
      handleClearTaskCache,
      handleClearProjectCache,
      handleClearUserCache,
      handleViewStorageKeys,
      handleInitializeSprint7Sandbox,
      handleScenarioPresetPress,
      handleTestUpload,
      handleClearAllLocalData,
    },
  };
}
