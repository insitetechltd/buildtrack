import React, { useEffect, useMemo, useState } from "react";
import {
  NavigationContainer,
  CommonActions,
  getFocusedRouteNameFromRoute,
  type LinkingOptions,
} from "@react-navigation/native";

import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
  type BottomTabNavigationProp,
} from "@react-navigation/bottom-tabs";
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  ActivityIndicator,
  Alert,
  Text,
  StyleSheet,
  Pressable,
  type StyleProp,
  type ViewStyle,
  Dimensions,
  Linking,
} from "react-native";
import { useAuthStore } from "../state/authStore";
import { isPlatformSuperuser } from "../config/platformSuperusers";
import { useProjectFilterStore } from "../state/projectFilterStore";
import { useActivityTabBadgeCount } from "../ui/viewAdapters/useActivityTabBadgeCount";
import { DataRefreshManager } from "../utils/DataRefreshManager";
import { NetworkSyncManager } from "../utils/NetworkSyncManager";
import { RealtimeSyncManager } from "../utils/RealtimeSyncManager";
import LoginScreen from "../screens/LoginScreen";
import CreateCompanyScreen from "../screens/CreateCompanyScreen";
import SetPasswordScreen from "../screens/SetPasswordScreen";
// Legacy RegisterScreen kept in tree; corp Create Company is the RC path.
// import RegisterScreen from "../screens/RegisterScreen";
import { DashboardRoute, TasksRoute } from "./uiModeRoutes";
import { buildDefaultStackScreenOptions, buildTaskDetailStackScreenOptions } from "./nativeStackOptions";
import CreateTaskScreen from "../screens/CreateTaskScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CompanyPlanScreen from "../screens/CompanyPlanScreen";
import CompanyPlanSelectionGate from "./CompanyPlanSelectionGate";
import PostCheckoutManagementRedirect from "./PostCheckoutManagementRedirect";
import TaskDetailScreen from "../screens/TaskDetailScreen";
import ProjectsScreen from "../screens/ProjectsScreen";
import CreateProjectScreen from "../screens/CreateProjectScreen";
import UserManagementScreen from "../screens/UserManagementScreen";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import ProjectDetailScreen from "../screens/ProjectDetailScreen";
import DevAdminScreen from "../screens/DevAdminScreen";
import ProjectPickerScreen from "../screens/ProjectPickerScreen";
import DeveloperSettingsScreen from "../screens/DeveloperSettingsScreen";
import CaptureSessionSmokeScreen from "../screens/CaptureSessionSmokeScreen";
import CaptureSessionFlowScreen from "../screens/CaptureSessionFlowScreen";
import OwnerConsoleScreen from "../screens/OwnerConsoleScreen";
import OwnerMonitoringScreen from "../screens/OwnerMonitoringScreen";
import OwnerEconomicsScreen from "../screens/OwnerEconomicsScreen";
import OwnerTenantOpsScreen from "../screens/OwnerTenantOpsScreen";
import WorkflowGapsScreen from "../screens/WorkflowGapsScreen";
import PendingUsersScreen from "../screens/PendingUsersScreen";
import PhotoViewerScreen from "../screens/PhotoViewerScreen";
import PhotoSelectionScreen from "../screens/PhotoSelectionScreen";
import InAppLibraryPickerScreen from "../screens/InAppLibraryPickerScreen";
import UpdateProgressScreen from "../screens/UpdateProgressScreen";
import AddCommentScreen from "../screens/AddCommentScreen";
import RejectTaskScreen from "../screens/RejectTaskScreen";
import ReassignTaskScreen from "../screens/ReassignTaskScreen";
import {
  buildPhotoShortcutCreateTaskParams,
  resolveTaskDetailCameraTabParams,
  resolveTaskDetailUpdateShortcut,
  shouldReturnToCreateTaskShortcut,
} from "./photoShortcutRoutes";
import { resolveStandaloneTaskAction } from "./taskActionRouting";
import {
  buildCreateTaskPhotoReturnParams,
  normalizeCreateTaskSelectedPhotos,
  resolveCreateTaskEntryParams,
} from "./createTaskRouteParams";
import {
  navigateToCreateTaskRoute,
  navigateToProjectPicker,
  navigateToRootProfile,
  navigateToRootTabScreen,
  type StackBackNavigation,
} from "./rootNavigationHelpers";
import { rootNavigationRef } from "./rootNavigationRef";
import {
  ROOT_TAB_BAR_STYLE,
  ROOT_TAB_CENTER_FAB_LAYOUT,
  ROOT_TAB_CENTER_FAB_SLOT,
  buildRootTabBarStyleForRoute,
  shouldCollapseRootSideTabsOnTaskDetailRoute,
  shouldHideRootSideTabsForTabState,
} from "./rootTabVisibility";
import {
  handleCameraTabPress,
  handleDashboardTaskDetailBack,
  handleTasksTaskDetailBack,
  handleUpdateProgressBack,
  returnToCreateTaskRoute,
} from "./taskDetailBackNavigation";

export {
  shouldCollapseRootSideTabsOnTaskDetailRoute,
  shouldHideRootSideTabsForTabState,
  shouldHideTabBarOnCreateTaskRoute,
} from "./rootTabVisibility";
export {
  handleCameraTabPress,
  handleDashboardTaskDetailBack,
  handleTasksTaskDetailBack,
  handleUpdateProgressBack,
  returnToCreateTaskRoute,
} from "./taskDetailBackNavigation";
import {
  cancelInAppLibraryPicker,
  returnToPhotoSelectionFlat,
} from "./photoFlowNavigation";
import {
  exitCaptureFirstFlow,
  handOffCaptureFirstToUpdateProgress,
  promptCaptureFirstDestination,
} from "./captureFirstCameraFlow";
import CaptureTaskPickerScreen from "../screens/CaptureTaskPickerScreen";
import {
  buildTaskDetailVerificationUrl,
  TASK_DETAIL_VERIFICATION_PATH,
} from "./screenVerification";
import {
  initializeSprint7RuntimeSandbox,
  switchSprint7RuntimeSandboxActor,
  isSprint7RuntimeSandboxLoaded,
  loadScenarioAPreset,
  loadScenarioBPreset,
  loadScenarioCPreset,
} from "@/test-utils/sprint7RuntimeSandbox";
import {
  SPRINT7_USER_IDS,
  type Sprint7SandboxActor,
} from "@/test-utils/sprint7Seeds";
import type {
  AdminDashboardStackParamList,
  CreateTaskParams,
  CreateTaskStackParamList,
  DashboardStackParamList,
  PhotoSelectionParams,
  InAppLibraryPickerParams,
  PhotoViewerParams,
  ProfileStackParamList,
  RootStackParamList,
  RootTabParamList,
  SelectedPhoto,
  TasksStackParamList,
  UpdateProgressParams,
} from "./navigationTypes";

const Tab = createBottomTabNavigator<RootTabParamList>();
const RootStackNavigator = createNativeStackNavigator<RootStackParamList>();
const DashboardStackNavigator = createNativeStackNavigator<DashboardStackParamList>();
const TasksStackNavigator = createNativeStackNavigator<TasksStackParamList>();
const ProfileStackNavigator = createNativeStackNavigator<ProfileStackParamList>();
const CreateTaskStackNavigator = createNativeStackNavigator<CreateTaskStackParamList>();
const AdminDashboardStackNavigator = createNativeStackNavigator<AdminDashboardStackParamList>();

// Bottom-tab geometry is intentionally tuned and should only change with
// matching test updates plus simulator verification.
// Center FAB layout SoT: ROOT_TAB_CENTER_FAB_* in rootTabVisibility.ts
const ROOT_TAB_SIDE_CENTER_OFFSET = Dimensions.get("window").width / 12;

const SPRINT7_AUTOMATION_PATH_RE =
  /^automation\/sprint7\/(tristan|herman)(?:\/preset\/([abcABC])?)?$/;

type Sprint7AutomationLinkMatch = {
  actor: Sprint7SandboxActor;
  preset?: "A" | "B" | "C";
};

function parseSprint7AutomationLink(
  path: string,
): Sprint7AutomationLinkMatch | null {
  const normalized = path.replace(/^\/+/, "");
  const m = normalized.match(SPRINT7_AUTOMATION_PATH_RE);
  if (!m) {
    return null;
  }
  const actor = m[1] as Sprint7SandboxActor;
  const rawPreset = m[2];
  let preset: "A" | "B" | "C" | undefined;
  if (rawPreset) {
    const upper = rawPreset.toUpperCase();
    if (upper === "A" || upper === "B" || upper === "C") {
      preset = upper;
    }
  }
  return { actor, preset };
}

async function applySprint7AutomationLink(
  match: Sprint7AutomationLinkMatch,
): Promise<void> {
  if (typeof __DEV__ !== "undefined" && !__DEV__) {
    return;
  }

  const { actor, preset } = match;
  const alreadyLoaded = isSprint7RuntimeSandboxLoaded();
  const currentAuthUser = useAuthStore.getState().user;
  const currentActorId = currentAuthUser?.id ?? null;
  const targetUserId =
    actor === "tristan" ? SPRINT7_USER_IDS.tristan : SPRINT7_USER_IDS.herman;
  const alreadyCurrentActor = currentActorId === targetUserId;

  if (alreadyLoaded && alreadyCurrentActor) {
    // no-op: same dataset, no reset needed
  } else if (alreadyLoaded && !alreadyCurrentActor) {
    await switchSprint7RuntimeSandboxActor(actor);
  } else {
    await initializeSprint7RuntimeSandbox({ activeActor: actor });
  }

  if (!preset) {
    return;
  }

  switch (preset) {
    case "A":
      await loadScenarioAPreset();
      break;
    case "B":
      await loadScenarioBPreset();
      break;
    case "C":
      await loadScenarioCPreset();
      break;
  }
}

export const appLinking: LinkingOptions<RootStackParamList> = {
  prefixes: ["taskr://"],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Tasks: {
            screens: {
              TaskDetail: {
                path: TASK_DETAIL_VERIFICATION_PATH,
              },
            },
          },
        },
      },
    },
  },
  getStateFromPath(path, options) {
    const automationMatch = parseSprint7AutomationLink(path);
    const inviteMatch = path.includes("auth/invite");
    void (async () => {
      if (automationMatch) {
        try {
          await applySprint7AutomationLink(automationMatch);
        } catch (error) {
          console.error("[Linking] Sprint7 automation link failed:", error);
        }
      }
    })();

    if (inviteMatch) {
      return {
        routes: [
          {
            name: "MainTabs",
            state: {
              routes: [{ name: "Activity" }],
            },
          },
        ],
      };
    }

    const [profilePath, profileQuery = ""] = path.split("?");
    if (profilePath === "profile") {
      const checkout = new URLSearchParams(profileQuery).get("checkout");
      if (checkout === "success" || checkout === "cancel") {
        const planParam = new URLSearchParams(profileQuery).get("plan");
        const checkoutPlan = planParam?.trim() ? planParam.trim().toLowerCase() : undefined;
        return {
          routes: [
            {
              name: "Profile",
              state: {
                routes: [
                  {
                    name: "CompanyPlan",
                    params: {
                      checkoutResult: checkout,
                      ...(checkout === "success" && checkoutPlan
                        ? { checkoutPlan }
                        : {}),
                    },
                  },
                ],
              },
            },
          ],
        };
      }

      return {
        routes: [
          {
            name: "Profile",
            state: {
              routes: [{ name: "ProfileMain" }],
            },
          },
        ],
      };
    }

    if (automationMatch) {
      return {
        routes: [
          {
            name: "MainTabs",
            state: {
              routes: [{ name: "Activity" }],
            },
          },
        ],
      };
    }

    const { getStateFromPath: defaultGetStateFromPath } =
      require("@react-navigation/native") as typeof import("@react-navigation/native");
    return defaultGetStateFromPath(path, appLinking.config);
  },
};

function CenterCameraTabButton({
  accessibilityLabel,
  accessibilityState,
  disabled = false,
  onLongPress,
  onPress,
  icon,
  style,
  affordance = "camera",
}: BottomTabBarButtonProps & {
  icon: React.ReactNode;
  disabled?: boolean;
  affordance?: "camera" | "update";
}) {
  const isFocused = accessibilityState?.selected === true;
  const tabButtonStyle = style as StyleProp<ViewStyle>;
  const isUpdate = affordance === "update";

  return (
    <View
      pointerEvents="box-none"
      style={styles.rootTabSlot}
      testID="root-tab__camera"
    >
      <View
        pointerEvents="box-none"
        style={[styles.centerCameraTabButtonSlot, tabButtonStyle]}
        testID="root-tab__camera_slot"
      >
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ ...accessibilityState, disabled }}
          disabled={disabled}
          onLongPress={onLongPress}
          onPress={onPress}
          testID="root-tab__camera_button"
          style={[
            styles.centerCameraTabButton,
            isUpdate ? styles.centerUpdateTabButton : null,
            isFocused
              ? isUpdate
                ? styles.centerUpdateTabButtonFocused
                : styles.centerCameraTabButtonFocused
              : null,
            disabled ? { opacity: 0.5 } : null,
          ]}
        >
          <View
            pointerEvents="none"
            style={styles.centerCameraTabIconSurface}
            testID="root-tab__camera_icon_surface"
          >
            {icon}
          </View>
        </Pressable>
        {/* Omit default tab children so RN does not paint a second camera glyph. */}
      </View>
    </View>
  );
}

function RootTabButton({
  accessibilityLabel,
  accessibilityState,
  children,
  onLongPress,
  onPress,
  style,
  testID,
  alignTowardsCamera,
  hidden = false,
}: BottomTabBarButtonProps & {
  testID: string;
  alignTowardsCamera: "left" | "right";
  hidden?: boolean;
}) {
  const tabButtonStyle = style as StyleProp<ViewStyle>;
  const pressableTestID = `${testID}_pressable`;

  if (hidden) {
    return (
      <View
        pointerEvents="none"
        style={[
          tabButtonStyle,
          styles.rootTabSideSlot,
          alignTowardsCamera === "right"
            ? styles.rootTabSideSlotTowardCameraRight
            : styles.rootTabSideSlotTowardCameraLeft,
        ]}
        testID={testID}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        tabButtonStyle,
        styles.rootTabSideSlot,
        alignTowardsCamera === "right"
          ? styles.rootTabSideSlotTowardCameraRight
          : styles.rootTabSideSlotTowardCameraLeft,
      ]}
      testID={testID}
    >
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        onLongPress={onLongPress}
        onPress={onPress}
        testID={pressableTestID}
        style={styles.rootTabButton}
      >
        {children}
      </Pressable>
    </View>
  );
}

function AuthScreens() {
  const [showCreateCompany, setShowCreateCompany] = useState(false);

  if (showCreateCompany) {
    return (
      <CreateCompanyScreen onToggleLogin={() => setShowCreateCompany(false)} />
    );
  }

  return (
    <LoginScreen onToggleCreateCompany={() => setShowCreateCompany(true)} />
  );
}

// Dashboard Stack to handle navigation to other screens
function DashboardStack() {
  return (
    <DashboardStackNavigator.Navigator screenOptions={buildDefaultStackScreenOptions()}>
      <DashboardStackNavigator.Screen name="DashboardMain" component={DashboardMainScreen} />
      <DashboardStackNavigator.Screen 
        name="TaskDetailFromDashboard" 
        component={TaskDetailFromDashboardWrapper}
        options={buildTaskDetailStackScreenOptions()}
      />
      <DashboardStackNavigator.Screen 
        name="ProjectPicker" 
        component={ProjectPickerScreenWrapper}
      />
      <DashboardStackNavigator.Screen 
        name="UpdateProgress" 
        component={UpdateProgressScreenWrapper}
      />
      <DashboardStackNavigator.Screen 
        name="AddComment" 
        component={AddCommentScreenWrapper}
      />
      <DashboardStackNavigator.Screen 
        name="RejectTask" 
        component={RejectTaskScreenWrapper}
      />
      <DashboardStackNavigator.Screen 
        name="ReassignTask" 
        component={ReassignTaskScreenWrapper}
      />
      <DashboardStackNavigator.Screen 
        name="CreateTask" 
        component={CreateTaskScreenWrapper}
      />
      <DashboardStackNavigator.Screen 
        name="PhotoSelection" 
        component={PhotoSelectionScreenWrapper}
      />
      <DashboardStackNavigator.Screen 
        name="PhotoViewer" 
        component={PhotoViewerScreenWrapper}
      />
      <DashboardStackNavigator.Screen
        name="InAppLibraryPicker"
        component={InAppLibraryPickerScreenWrapper}
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
      <DashboardStackNavigator.Screen
        name="CaptureSession"
        component={CaptureSessionScreenWrapper}
        options={{ headerShown: false, animation: "fade" }}
      />
    </DashboardStackNavigator.Navigator>
  );
}

function DashboardMainScreen({
  navigation,
}: NativeStackScreenProps<DashboardStackParamList, "DashboardMain">) {
  return (
    <DashboardRoute
      onNavigateToTasks={(params) =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Tasks",
          params
            ? {
                screen: "TasksList",
                params: {
                  ...params,
                  launchNonce: Date.now(),
                },
              }
            : undefined,
        )
      }
      onNavigateToCreateTask={(params) => {
        navigateToRootTabScreen(navigation, "Camera", {
          screen: "CreateTaskMain",
          params: {
            parentTaskId: params?.parentTaskId,
            parentSubTaskId: params?.parentSubTaskId,
            editTaskId: params?.editTaskId,
            localDraftId: params?.localDraftId,
            actionType: params?.actionType,
            updateTargetSubTaskId: params?.updateTargetSubTaskId,
            sourceTaskId: params?.sourceTaskId,
            sourceSubTaskId: params?.sourceSubTaskId,
            sourceScreen: params?.sourceScreen,
            selectedPhotos: params?.selectedPhotos,
            uploadedPhotoUrls: params?.uploadedPhotoUrls,
            cameraLaunchContext: params?.cameraLaunchContext,
            postCaptureDefault: params?.postCaptureDefault,
            clearForm: params?.clearForm ?? !(params?.editTaskId || params?.localDraftId),
            _timestamp: params?._timestamp ?? Date.now(), // Force navigation by adding unique param
          },
        });
      }}
      onNavigateToProfile={() => navigateToRootProfile(navigation)}
      onNavigateToDeveloperSettings={() =>
        navigateToRootProfile(navigation, "DeveloperSettings")
      }
      onNavigateToTaskDetail={(taskId: string, subTaskId?: string) => 
        navigation.navigate("TaskDetailFromDashboard", { taskId, subTaskId })
      }
      onNavigateToProjectPicker={(allowBack: boolean = true) => 
        navigation.navigate("ProjectPicker", { allowBack })
      }
    />
  );
}

function ProjectPickerScreenWrapper({
  route,
  navigation,
}: NativeStackScreenProps<DashboardStackParamList, "ProjectPicker">) {
  const { allowBack = true } = route.params || {};
  return (
    <ProjectPickerScreen
      onNavigateBack={() => navigation.goBack()}
      allowBack={allowBack}
      onNavigateToProfile={() => navigateToRootProfile(navigation)}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigation.navigate("ProjectPicker", { allowBack });
      }}
    />
  );
}

function TaskDetailFromDashboardWrapper({
  route,
  navigation,
}: NativeStackScreenProps<DashboardStackParamList, "TaskDetailFromDashboard">) {
  const { taskId, subTaskId } = route.params;
  return (
    <TaskDetailScreen
      taskId={taskId}
      subTaskId={subTaskId}
      onNavigateBack={() => handleDashboardTaskDetailBack(navigation)}
      onNavigateToTaskDetail={(taskId, subTaskId) => {
        // Navigate to another TaskDetailScreen for sub-tasks
        navigation.navigate("TaskDetailFromDashboard", { taskId, subTaskId });
      }}
      onNavigateToCreateTask={(parentTaskId, parentSubTaskId, editTaskId, actionType, updateTargetSubTaskId) => {
        const resolved = resolveStandaloneTaskAction({
          editTaskId,
          actionType,
          updateTargetSubTaskId,
          sourceScreen: "dashboard",
        });
        if (resolved?.kind === "updateProgress") {
          navigation.navigate("UpdateProgress", resolved.params);
          return;
        }
        if (resolved?.kind === "addComment") {
          navigation.navigate("AddComment", resolved.params);
          return;
        }
        if (resolved?.kind === "reassign") {
          navigation.navigate("ReassignTask", resolved.params);
          return;
        }
        navigation.navigate("CreateTask", {
          parentTaskId,
          parentSubTaskId,
          editTaskId,
          actionType,
          updateTargetSubTaskId,
        });
      }}
      onNavigateToRejectTask={(taskId, subTaskId) => {
        navigation.navigate("RejectTask", { taskId, subTaskId });
      }}
      onNavigateToProfile={() => navigateToRootProfile(navigation)}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
  );
}

// Tasks Stack Navigator to include Task Detail screen and Create Task
function TasksStack() {
  return (
    <TasksStackNavigator.Navigator screenOptions={buildDefaultStackScreenOptions()}>
      <TasksStackNavigator.Screen name="TasksList" component={ProjectsTasksListScreen} />
      <TasksStackNavigator.Screen 
        name="TaskDetail" 
        component={TaskDetailScreenWrapper}
        options={buildTaskDetailStackScreenOptions()}
      />
      <TasksStackNavigator.Screen 
        name="CreateTaskFromTask" 
        component={CreateTaskFromTaskWrapper}
      />
      <TasksStackNavigator.Screen 
        name="PhotoViewer" 
        component={PhotoViewerScreenWrapper}
      />
      <TasksStackNavigator.Screen 
        name="PhotoSelection" 
        component={PhotoSelectionScreenWrapper}
      />
      <TasksStackNavigator.Screen 
        name="UpdateProgress" 
        component={UpdateProgressScreenWrapper}
      />
      <TasksStackNavigator.Screen 
        name="AddComment" 
        component={AddCommentScreenWrapper}
      />
      <TasksStackNavigator.Screen 
        name="RejectTask" 
        component={RejectTaskScreenWrapper}
      />
      <TasksStackNavigator.Screen 
        name="ReassignTask" 
        component={ReassignTaskScreenWrapper}
      />
      <TasksStackNavigator.Screen 
        name="CreateTask" 
        component={CreateTaskScreenWrapper}
      />
      <TasksStackNavigator.Screen
        name="InAppLibraryPicker"
        component={InAppLibraryPickerScreenWrapper}
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
      <TasksStackNavigator.Screen
        name="CaptureSession"
        component={CaptureSessionScreenWrapper}
        options={{ headerShown: false, animation: "fade" }}
      />
    </TasksStackNavigator.Navigator>
  );
}

function ProjectsTasksListScreen({
  navigation,
  route,
}: NativeStackScreenProps<TasksStackParamList, "TasksList">) {
  const setTasksLaunchPreset = useProjectFilterStore((state) => state.setTasksLaunchPreset);

  useEffect(() => {
    if (!route.params?.launchQueue || !route.params?.launchBucket || !route.params?.launchSource) {
      return;
    }

    setTasksLaunchPreset({
      queue: route.params.launchQueue,
      bucket: route.params.launchBucket,
      source: route.params.launchSource,
    });
  }, [
    route.params?.launchBucket,
    route.params?.launchNonce,
    route.params?.launchQueue,
    route.params?.launchSource,
    setTasksLaunchPreset,
  ]);

  return (
    <TasksRoute
      onNavigateToTaskDetail={(taskId: string, subTaskId?: string) => {
        navigation.navigate("TaskDetail", { taskId, subTaskId });
      }}
      onNavigateToCreateTask={(params) => {
        navigateToRootTabScreen(navigation, "Camera", {
          screen: "CreateTaskMain",
          params: {
            parentTaskId: params?.parentTaskId,
            parentSubTaskId: params?.parentSubTaskId,
            editTaskId: params?.editTaskId,
            localDraftId: params?.localDraftId,
            actionType: params?.actionType,
            updateTargetSubTaskId: params?.updateTargetSubTaskId,
            sourceTaskId: params?.sourceTaskId,
            sourceSubTaskId: params?.sourceSubTaskId,
            sourceScreen: params?.sourceScreen,
            selectedPhotos: params?.selectedPhotos,
            uploadedPhotoUrls: params?.uploadedPhotoUrls,
            cameraLaunchContext: params?.cameraLaunchContext,
            postCaptureDefault: params?.postCaptureDefault,
            clearForm: params?.clearForm ?? !(params?.editTaskId || params?.localDraftId),
            _timestamp: params?._timestamp ?? Date.now(), // Force navigation by adding unique param
          },
        });
      }}
      onNavigateToUpdateProgress={(taskId) => {
        navigation.navigate("UpdateProgress", {
          taskId,
          sourceScreen: "tasks",
          sourceTaskId: taskId,
        });
      }}
      onNavigateBack={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Activity",
        )
      }
      onNavigateToProfile={() => navigateToRootProfile(navigation)}
      onNavigateToDeveloperSettings={() =>
        navigateToRootProfile(navigation, "DeveloperSettings")
      }
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
  );
}

function TaskDetailScreenWrapper({
  route,
  navigation,
}: NativeStackScreenProps<TasksStackParamList, "TaskDetail">) {
  const { taskId, subTaskId } = route.params;
  return (
    <TaskDetailScreen
      taskId={taskId}
      subTaskId={subTaskId}
      onNavigateBack={() => handleTasksTaskDetailBack(navigation)}
      onNavigateToTaskDetail={(taskId, subTaskId) => {
        // Navigate to another TaskDetailScreen for sub-tasks
        navigation.navigate("TaskDetail", { taskId, subTaskId });
      }}
      onNavigateToCreateTask={(parentTaskId, parentSubTaskId, editTaskId, actionType, updateTargetSubTaskId) => {
        const resolved = resolveStandaloneTaskAction({
          editTaskId,
          actionType,
          updateTargetSubTaskId,
          sourceScreen: "tasks",
        });
        if (resolved?.kind === "updateProgress") {
          navigation.navigate("UpdateProgress", resolved.params);
          return;
        }
        if (resolved?.kind === "addComment") {
          navigation.navigate("AddComment", resolved.params);
          return;
        }
        if (resolved?.kind === "reassign") {
          navigation.navigate("ReassignTask", resolved.params);
          return;
        }
        navigation.navigate("CreateTask", {
          parentTaskId,
          parentSubTaskId,
          editTaskId,
          actionType,
          updateTargetSubTaskId,
        });
      }}
      onNavigateToRejectTask={(taskId, subTaskId) => {
        navigation.navigate("RejectTask", { taskId, subTaskId });
      }}
      onNavigateToProfile={() => navigateToRootProfile(navigation)}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
  );
}

function CreateTaskFromTaskWrapper({
  route,
  navigation,
}: NativeStackScreenProps<TasksStackParamList, "CreateTaskFromTask">) {
  const { parentTaskId, parentSubTaskId, editTaskId } = route.params || {};
  const handleCreateSuccess = React.useCallback(() => {
    navigation.navigate("TasksList");
  }, [navigation]);

  return (
    <CreateTaskScreen
      onNavigateBack={() => navigation.goBack()}
      onCreateSuccess={handleCreateSuccess}
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
      editTaskId={editTaskId}
    />
  );
}

type PhotoViewerScreenWrapperProps =
  | NativeStackScreenProps<DashboardStackParamList, "PhotoViewer">
  | NativeStackScreenProps<TasksStackParamList, "PhotoViewer">
  | NativeStackScreenProps<CreateTaskStackParamList, "PhotoViewer">;

function PhotoViewerScreenWrapper({
  route,
  navigation,
}: PhotoViewerScreenWrapperProps) {
  const { photos, initialIndex, activityInfo } = route.params || {};
  return (
    <PhotoViewerScreen
      photos={photos || []}
      initialIndex={initialIndex || 0}
      activityInfo={activityInfo}
      onNavigateBack={() => navigation.goBack()}
    />
  );
}

type InAppLibraryPickerScreenWrapperProps =
  | NativeStackScreenProps<DashboardStackParamList, "InAppLibraryPicker">
  | NativeStackScreenProps<TasksStackParamList, "InAppLibraryPicker">
  | NativeStackScreenProps<CreateTaskStackParamList, "InAppLibraryPicker">;

function InAppLibraryPickerScreenWrapper({
  route,
  navigation,
}: InAppLibraryPickerScreenWrapperProps) {
  const params = route.params || {};
  const captureFirstFlow = Boolean(params.captureFirstFlow);

  return (
    <InAppLibraryPickerScreen
      // Cancel: return to Select Photos when add-more; otherwise leave the photo flow.
      onCancel={() => {
        if (captureFirstFlow) {
          const state = (navigation as any).getState?.();
          const routes = state?.routes ?? [];
          const index = state?.index ?? routes.length - 1;
          const parentIsPhotoSelection =
            index > 0 && routes[index - 1]?.name === "PhotoSelection";
          if (parentIsPhotoSelection) {
            cancelInAppLibraryPicker(navigation as any);
            return;
          }
          exitCaptureFirstFlow(navigation as any);
          return;
        }
        cancelInAppLibraryPicker(navigation as any);
      }}
      initiallySelectedPhotos={params.existingPhotos ?? []}
      onSave={(libraryPhotos) => {
        // Picker returns the full library selection (including pre-highlighted).
        // Keep non-library drafts (e.g. camera) that cannot appear in the picker.
        const localOnly = (params.existingPhotos ?? []).filter(
          (photo) => !photo.mediaLibraryAssetId,
        );
        const nextPhotos = [...localOnly, ...libraryPhotos];
        if (captureFirstFlow && nextPhotos.length === 0) {
          exitCaptureFirstFlow(navigation as any);
          return;
        }
        const photoParams: PhotoSelectionParams = {
          taskId: params.taskId,
          subTaskId: params.subTaskId,
          projectId: params.projectId,
          companyId: params.companyId,
          userId: params.userId,
          initialCompletionPercentage: params.initialCompletionPercentage ?? 0,
          initialPhotos: nextPhotos,
          returnScreen: params.returnScreen ?? "CreateTask",
          actionType: params.actionType,
          parentTaskId: params.parentTaskId,
          parentSubTaskId: params.parentSubTaskId,
          editTaskId: params.editTaskId,
          localDraftId: params.localDraftId,
          entityType: params.entityType,
          uploadImmediately: params.uploadImmediately ?? false,
          sourceScreen: params.sourceScreen,
          sourceTaskId: params.sourceTaskId,
          sourceSubTaskId: params.sourceSubTaskId,
          selectedTaskId: params.selectedTaskId,
          saveIntent: params.saveIntent,
          originRouteName: params.originRouteName,
          selectionRevision: Date.now(),
          captureFirstFlow: params.captureFirstFlow,
        };

        returnToPhotoSelectionFlat(navigation as any, photoParams);
      }}
    />
  );
}

type PhotoSelectionScreenWrapperProps =
  | NativeStackScreenProps<DashboardStackParamList, "PhotoSelection">
  | NativeStackScreenProps<TasksStackParamList, "PhotoSelection">
  | NativeStackScreenProps<CreateTaskStackParamList, "PhotoSelection">;

function PhotoSelectionScreenWrapper({
  route,
  navigation,
}: PhotoSelectionScreenWrapperProps) {
  const { taskId, subTaskId, projectId: routeProjectId, companyId: routeCompanyId, userId: routeUserId, initialCompletionPercentage, initialPhotos, returnScreen, actionType, entityType, uploadImmediately, sourceScreen, sourceTaskId, sourceSubTaskId, selectedTaskId: routeSelectedTaskId, saveIntent: routeSaveIntent, originRouteName: originRouteNameParam, selectionRevision, captureFirstFlow } = route.params || {};
  const originRouteName = originRouteNameParam || route.name;
  const uploadedUrlsRef = React.useRef<string[] | null>(null);

  const authUser = useAuthStore((s) => s.user);
  const filterProjectId = useProjectFilterStore((s) => s.selectedProjectId);

  const effectiveCompanyId = routeCompanyId ?? authUser?.companyId;
  const effectiveUserId = routeUserId ?? authUser?.id;
  const effectiveProjectId = routeProjectId ?? filterProjectId;

  // For UpdateProgress and CreateTask, default uploadImmediately to false if not specified
  // This ensures photos are stored locally until submit
  const effectiveUploadImmediately = uploadImmediately !== undefined 
    ? uploadImmediately 
    : (returnScreen === 'UpdateProgress' || returnScreen === 'CreateTask' ? false : true);
  
  // Listen for when we return from PhotoSelectionScreen with uploaded URLs
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const uploadedUrls = route.params?.uploadedPhotoUrls;
      if (uploadedUrls && uploadedUrls.length > 0 && returnScreen) {
        uploadedUrlsRef.current = uploadedUrls;
        // Clear the params to prevent re-triggering
        navigation.setParams({ uploadedPhotoUrls: undefined });
      }
    });
    return unsubscribe;
  }, [navigation, route.params, returnScreen]);

  const handlePhotosUploaded = (photoUrls: string[]) => {
    if (returnScreen === 'CreateTask') {
      navigation.goBack();

      setTimeout(() => {
        navigateToCreateTaskRoute(
          navigation,
          buildCreateTaskPhotoReturnParams({
            routeParams: route.params as unknown as CreateTaskParams,
            uploadedPhotoUrls: photoUrls,
          }),
        );
      }, 150);
    } else if ((returnScreen === 'UpdateProgress' || returnScreen === 'AddComment') && actionType) {
      navigation.goBack();

      setTimeout(() => {
        const updateProgressNavigation =
          navigation as NativeStackNavigationProp<
            DashboardStackParamList | TasksStackParamList
          >;

        updateProgressNavigation.navigate("UpdateProgress", {
          taskId: taskId as string,
          subTaskId,
          uploadedPhotoUrls: photoUrls,
          sourceScreen,
          sourceTaskId: sourceTaskId || (taskId as string),
          sourceSubTaskId: sourceSubTaskId || subTaskId,
        });
      }, 150);
    } else if (returnScreen === 'UpdateProgress' || returnScreen === 'AddComment') {
      const updateProgressNavigation =
        navigation as NativeStackNavigationProp<
          DashboardStackParamList | TasksStackParamList
        >;

      updateProgressNavigation.navigate("UpdateProgress", {
        taskId: taskId as string,
        subTaskId,
        initialCompletionPercentage,
        uploadedPhotoUrls: photoUrls, // Pass uploaded URLs
        actionType: actionType,
        sourceScreen: sourceScreen, // Pass source screen info for navigation back
        sourceTaskId: sourceTaskId || (taskId as string),
        sourceSubTaskId: sourceSubTaskId || subTaskId,
      });
    } else {
      const updateProgressNavigation =
        navigation as NativeStackNavigationProp<
          DashboardStackParamList | TasksStackParamList
        >;

      updateProgressNavigation.navigate("UpdateProgress", {
        taskId: taskId as string,
        subTaskId,
        initialCompletionPercentage,
        uploadedPhotoUrls: photoUrls, // Also pass URLs in default case
        sourceScreen: sourceScreen, // Pass source screen info for navigation back
        sourceTaskId: sourceTaskId || (taskId as string),
        sourceSubTaskId: sourceSubTaskId || subTaskId,
      });
    }
  };

  const handlePhotosSelected = (photos: unknown[]) => {
    const normalizedPhotos: SelectedPhoto[] = photos.map((photo) => {
      const candidate = photo as Partial<SelectedPhoto> | null;
      return {
        uri: candidate?.uri ?? "",
        fileName: candidate?.fileName ?? "",
        isAnnotated: Boolean(candidate?.isAnnotated),
        annotatedUri: candidate?.annotatedUri,
        caption: candidate?.caption,
        mediaLibraryAssetId: candidate?.mediaLibraryAssetId,
      };
    });

    if (captureFirstFlow) {
      promptCaptureFirstDestination({
        navigation: navigation as any,
        photos: normalizedPhotos,
      });
      return;
    }

    // For CreateTaskScreen or UpdateProgressScreen: go back and update params on the previous screen
    if (returnScreen === 'CreateTask') {
      const navParams = buildCreateTaskPhotoReturnParams({
        routeParams: route.params as unknown as CreateTaskParams,
        selectedPhotos: normalizedPhotos,
      });

      returnToCreateTaskRoute(navigation, navParams);
    } else if (returnScreen === 'UpdateProgress') {
      if (shouldReturnToCreateTaskShortcut({ returnScreen, actionType })) {
        navigation.goBack();

        setTimeout(() => {
          navigateToCreateTaskRoute(
            navigation,
            buildPhotoShortcutCreateTaskParams({
              taskId: taskId as string,
              subTaskId,
              actionType: "update",
              sourceScreen,
              sourceTaskId: sourceTaskId || (taskId as string),
              sourceSubTaskId: sourceSubTaskId || subTaskId,
              selectedPhotos: normalizedPhotos,
            }),
          );
        }, 150);
        return;
      }

      // Navigate to UpdateProgress with selected photos
      // PhotoSelection and UpdateProgress are in the same stack, so navigate directly
      // First go back to remove PhotoSelection from stack, then navigate to UpdateProgress
      navigation.goBack();
      
      // Use setTimeout to ensure goBack completes before navigating
      setTimeout(() => {
        // Navigate within the same stack (TasksStack or DashboardStack)
        const updateProgressNavigation =
          navigation as NativeStackNavigationProp<
            DashboardStackParamList | TasksStackParamList
          >;

        updateProgressNavigation.navigate("UpdateProgress", {
          taskId: taskId as string,
          subTaskId,
          initialCompletionPercentage,
          selectedPhotos: normalizedPhotos, // Pass photo objects, not URLs
          sourceScreen: sourceScreen,
          sourceTaskId: sourceTaskId || (taskId as string),
          sourceSubTaskId: sourceSubTaskId || subTaskId,
        });
      }, 150);
    } else {
      // Fallback: just go back
      navigation.goBack();
    }
  };

  const handleAttachedToExistingTask = (attachedTaskId: string, uploadedPhotoUrls: string[]) => {
    const popThenNavigate = () => {
      const parentNav = navigation.getParent();
      if (parentNav) {
        parentNav.navigate("Tasks", {
          screen: "TasksList",
        });
        return;
      }
      navigation.goBack();
    };
    const photoSelectionNav = navigation as unknown as StackBackNavigation;
    if (photoSelectionNav.canGoBack?.()) {
      photoSelectionNav.pop();
      setTimeout(popThenNavigate, 50);
    } else {
      popThenNavigate();
    }
  };

  const handleSaveUnattachedDone = () => {
    const navigateAfterPop = () => {
      const parentNav = navigation.getParent();
      if (parentNav) {
        if (originRouteName && originRouteName !== 'PhotoSelection' && originRouteName !== 'Camera' && originRouteName !== 'CreateTaskMain') {
          const navState = navigation.getState?.();
          const currentRouteNames = (navState?.routeNames || []) as string[];
          if (currentRouteNames.includes(originRouteName)) {
            (navigation as any).navigate(originRouteName);
            return;
          }
        }
        parentNav.navigate("Camera", {
          screen: "CreateTaskMain",
        });
        return;
      }
      navigation.goBack();
    };
    const photoSelectionNav = navigation as unknown as StackBackNavigation;
    if (photoSelectionNav.canGoBack?.()) {
      photoSelectionNav.pop();
      setTimeout(navigateAfterPop, 50);
    } else {
      navigateAfterPop();
    }
  };
  
  return (
    <PhotoSelectionScreen
      taskId={(taskId as string) ?? ""}
      subTaskId={subTaskId}
      projectId={effectiveProjectId ?? undefined}
      companyId={(effectiveCompanyId as string) ?? ""}
      userId={(effectiveUserId as string) ?? ""}
      initialCompletionPercentage={initialCompletionPercentage || 0}
      initialPhotos={initialPhotos}
      entityType={entityType}
      uploadImmediately={effectiveUploadImmediately}
      saveIntent={routeSaveIntent}
      selectedTaskId={routeSelectedTaskId}
      selectionRevision={selectionRevision}
      onOpenInAppLibrary={(currentPhotos) => {
        (
          navigation as {
            navigate: (name: "InAppLibraryPicker", params: InAppLibraryPickerParams) => void;
          }
        ).navigate("InAppLibraryPicker", {
          taskId,
          subTaskId,
          projectId: effectiveProjectId ?? undefined,
          companyId: effectiveCompanyId,
          userId: effectiveUserId,
          initialCompletionPercentage: initialCompletionPercentage || 0,
          returnScreen,
          actionType,
          entityType,
          uploadImmediately: effectiveUploadImmediately,
          sourceScreen,
          sourceTaskId,
          sourceSubTaskId,
          selectedTaskId: routeSelectedTaskId,
          saveIntent: routeSaveIntent,
          originRouteName,
          captureFirstFlow,
          existingPhotos: currentPhotos.map(
            (photo): SelectedPhoto => ({
              uri: photo.uri,
              fileName: photo.fileName,
              isAnnotated: Boolean(photo.isAnnotated),
              annotatedUri: photo.annotatedUri,
              caption: photo.caption,
              mediaLibraryAssetId: photo.mediaLibraryAssetId,
            }),
          ),
        });
      }}
      onNavigateBack={() => {
        if (captureFirstFlow) {
          exitCaptureFirstFlow(navigation as any);
          return;
        }
        navigation.goBack();
      }}
      onNavigateToUpdateProgress={(taskId: string, subTaskId?: string, initialCompletionPercentage?: number, uploadedPhotoUrls?: string[]) => {
        const updateProgressNavigation =
          navigation as NativeStackNavigationProp<
            DashboardStackParamList | TasksStackParamList
          >;

        updateProgressNavigation.navigate("UpdateProgress", {
          taskId,
          subTaskId,
          initialCompletionPercentage,
          uploadedPhotoUrls, // Pass uploaded URLs if provided
          sourceScreen: sourceScreen, // Pass source screen info for navigation back
          sourceTaskId: sourceTaskId || taskId,
          sourceSubTaskId: sourceSubTaskId || subTaskId,
        });
      }}
      onPhotosUploaded={returnScreen && effectiveUploadImmediately !== false ? handlePhotosUploaded : undefined}
      onAttachedToExistingTask={handleAttachedToExistingTask}
      onSaveUnattachedDone={handleSaveUnattachedDone}
      onPhotosSelected={(() => {
        // Capture-first checkmark prompts Create vs Update (not return to a form).
        if (captureFirstFlow && effectiveUploadImmediately === false) {
          return handlePhotosSelected;
        }
        // Check if we should use onPhotosSelected (when uploadImmediately is false)
        const shouldUsePhotosSelected = (returnScreen === 'CreateTask' || returnScreen === 'UpdateProgress') && effectiveUploadImmediately === false;
        if (shouldUsePhotosSelected) {
          return handlePhotosSelected;
        }
        return undefined;
      })()}
    />
  );
}

type CreateTaskScreenWrapperProps =
  | NativeStackScreenProps<DashboardStackParamList, "CreateTask">
  | NativeStackScreenProps<TasksStackParamList, "CreateTask">;

function CreateTaskScreenWrapper({
  route,
  navigation,
}: CreateTaskScreenWrapperProps) {
  const {
    parentTaskId,
    parentSubTaskId,
    editTaskId,
    localDraftId,
    actionType,
    cameraLaunchContext,
    postCaptureDefault,
    updateTargetSubTaskId,
    uploadedPhotoUrls,
    selectedPhotos,
  } = route.params || {};
  const clearDraftPayloads = React.useCallback(() => {
    navigation.setParams({
      selectedPhotos: undefined,
      uploadedPhotoUrls: undefined,
    });
  }, [navigation]);
  const handleCreateSuccess = React.useCallback(() => {
    clearDraftPayloads();
    const parentNav = navigation.getParent();

    if (parentNav) {
      parentNav.navigate("Tasks", {
        screen: "TasksList",
      });
      return;
    }

    navigation.goBack();
  }, [clearDraftPayloads, navigation]);

  const handleDraftSaved = React.useCallback(() => {
    navigateToRootTabScreen(navigation, "Activity", {
      screen: "DashboardMain",
    });
  }, [navigation]);

  return (
    <CreateTaskScreen
      onNavigateBack={() => navigation.goBack()}
      onCreateSuccess={handleCreateSuccess}
      onDraftSaved={handleDraftSaved}
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
      editTaskId={editTaskId}
      localDraftId={localDraftId}
      actionType={actionType}
      cameraLaunchContext={cameraLaunchContext}
      postCaptureDefault={postCaptureDefault}
      updateTargetSubTaskId={updateTargetSubTaskId}
      uploadedPhotoUrls={uploadedPhotoUrls as string[] | undefined}
      selectedPhotos={selectedPhotos}
      onClearDraftPayloads={clearDraftPayloads}
      onNavigateToProfile={() => navigateToRootProfile(navigation)}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
  );
}

type UpdateProgressScreenWrapperProps =
  | NativeStackScreenProps<DashboardStackParamList, "UpdateProgress">
  | NativeStackScreenProps<TasksStackParamList, "UpdateProgress">;

function UpdateProgressScreenWrapper({
  route,
  navigation,
}: UpdateProgressScreenWrapperProps) {
  // Extract params to pass to UpdateProgressScreen
  const params = route.params;
  const uploadedPhotoUrls = params?.uploadedPhotoUrls; // Legacy: already uploaded URLs
  const selectedPhotos = params?.selectedPhotos; // New: photo objects not yet uploaded
  
  return (
    <UpdateProgressScreen 
      uploadedPhotoUrls={uploadedPhotoUrls}
      selectedPhotos={selectedPhotos}
      onNavigateBack={() => handleUpdateProgressBack(navigation)}
      onNavigateToProfile={() => navigateToRootProfile(navigation)}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
  );
}

type AddCommentScreenWrapperProps =
  | NativeStackScreenProps<DashboardStackParamList, "AddComment">
  | NativeStackScreenProps<TasksStackParamList, "AddComment">;

function AddCommentScreenWrapper({ navigation }: AddCommentScreenWrapperProps) {
  return (
    <AddCommentScreen 
      onNavigateToProfile={() => navigateToRootProfile(navigation)}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
  );
}

type RejectTaskScreenWrapperProps =
  | NativeStackScreenProps<DashboardStackParamList, "RejectTask">
  | NativeStackScreenProps<TasksStackParamList, "RejectTask">;

function RejectTaskScreenWrapper({ navigation }: RejectTaskScreenWrapperProps) {
  return (
    <RejectTaskScreen 
      onNavigateToProfile={() => navigateToRootProfile(navigation)}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
  );
}

type ReassignTaskScreenWrapperProps =
  | NativeStackScreenProps<DashboardStackParamList, "ReassignTask">
  | NativeStackScreenProps<TasksStackParamList, "ReassignTask">;

function ReassignTaskScreenWrapper({
  navigation,
}: ReassignTaskScreenWrapperProps) {
  return (
    <ReassignTaskScreen 
      onNavigateToProfile={() => navigateToRootProfile(navigation)}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
  );
}

// Profile Stack
function ProfileStack() {
  return (
    <ProfileStackNavigator.Navigator screenOptions={buildDefaultStackScreenOptions()}>
      <ProfileStackNavigator.Screen name="ProfileMain" component={ProfileMainScreen} />
      <ProfileStackNavigator.Screen name="CompanyPlan" component={CompanyPlanScreenWrapper} />
      <ProfileStackNavigator.Screen
        name="CompanyManagement"
        component={AdminDashboardStack}
        options={{ headerShown: false }}
      />
      <ProfileStackNavigator.Screen
        name="DeveloperSettings"
        component={DeveloperSettingsScreenWrapper}
      />
      <ProfileStackNavigator.Screen
        name="CaptureSessionSmoke"
        component={CaptureSessionSmokeScreenWrapper}
        options={{ headerShown: false }}
      />
      <ProfileStackNavigator.Screen
        name="OwnerConsole"
        component={OwnerConsoleScreenWrapper}
      />
      <ProfileStackNavigator.Screen
        name="OwnerMonitoring"
        component={OwnerMonitoringScreenWrapper}
      />
      <ProfileStackNavigator.Screen
        name="OwnerEconomics"
        component={OwnerEconomicsScreenWrapper}
      />
      <ProfileStackNavigator.Screen
        name="OwnerTenantOps"
        component={OwnerTenantOpsScreenWrapper}
      />
      <ProfileStackNavigator.Screen
        name="WorkflowGaps"
        component={WorkflowGapsScreenWrapper}
      />
      <ProfileStackNavigator.Screen name="PendingUsers" component={PendingUsersScreenWrapper} />
    </ProfileStackNavigator.Navigator>
  );
}

function ProfileMainScreen({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, "ProfileMain">) {
  const user = useAuthStore((state) => state.user);
  const canOpenOwnerTools = isPlatformSuperuser(user);

  return (
    <ProfileScreen
      onNavigateBack={() => navigation.goBack()}
      onNavigateToCreateTask={() => {
        navigateToRootTabScreen(navigation, "Camera", {
          screen: "CreateTaskMain",
          params: {
            parentTaskId: undefined,
            parentSubTaskId: undefined,
            editTaskId: undefined,
            actionType: undefined,
            clearForm: true, // Flag to clear form when "Create New Task" is pressed
            _timestamp: Date.now(), // Force navigation by adding unique param
          },
        });
      }}
      onNavigateToDeveloperSettings={
        canOpenOwnerTools
          ? () => navigation.navigate("DeveloperSettings")
          : undefined
      }
      onNavigateToOwnerConsole={
        canOpenOwnerTools ? () => navigation.navigate("OwnerConsole") : undefined
      }
      onNavigateToPendingUsers={() => navigation.navigate("PendingUsers")}
      onNavigateToProfile={() => {}} // Already on profile screen
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
  );
}

function CompanyPlanScreenWrapper({
  navigation,
  route,
}: NativeStackScreenProps<ProfileStackParamList, "CompanyPlan">) {
  return (
    <CompanyPlanScreen
      onNavigateBack={() => navigation.goBack()}
      onNavigateToProfile={() => navigation.navigate("ProfileMain")}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
      onNavigateToCompanyManagement={() =>
        navigation.navigate("CompanyManagement", { screen: "AdminDashboardMain" })
      }
      onNavigateToTaskDashboard={() => {
        navigateToRootTabScreen(navigation, "Activity");
      }}
      checkoutResult={route.params?.checkoutResult}
      checkoutPlan={route.params?.checkoutPlan}
    />
  );
}

function OwnerConsoleScreenWrapper({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, "OwnerConsole">) {
  return (
    <OwnerConsoleScreen
      onNavigateBack={() => navigation.goBack()}
      onOpenMonitoring={() => navigation.navigate("OwnerMonitoring")}
      onOpenEconomics={() => navigation.navigate("OwnerEconomics")}
      onOpenTenantOps={() => navigation.navigate("OwnerTenantOps")}
    />
  );
}

function OwnerMonitoringScreenWrapper({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, "OwnerMonitoring">) {
  return (
    <OwnerMonitoringScreen
      onNavigateBack={() => navigation.goBack()}
      onOpenWorkflowGaps={() => navigation.navigate("WorkflowGaps")}
    />
  );
}

function OwnerEconomicsScreenWrapper({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, "OwnerEconomics">) {
  return (
    <OwnerEconomicsScreen onNavigateBack={() => navigation.goBack()} />
  );
}

function OwnerTenantOpsScreenWrapper({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, "OwnerTenantOps">) {
  return (
    <OwnerTenantOpsScreen onNavigateBack={() => navigation.goBack()} />
  );
}

function PendingUsersScreenWrapper({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, "PendingUsers">) {
  return (
    <PendingUsersScreen
      onNavigateBack={() => navigation.goBack()}
    />
  );
}

function WorkflowGapsScreenWrapper({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, "WorkflowGaps">) {
  return (
    <WorkflowGapsScreen
      onNavigateBack={() => navigation.goBack()}
      onInspectTask={(taskId) => {
        navigateToRootTabScreen(navigation, "Tasks", {
          screen: "TaskDetail",
          params: { taskId },
        });
      }}
    />
  );
}

function DeveloperSettingsScreenWrapper({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, "DeveloperSettings">) {
  return (
    <DeveloperSettingsScreen
      onNavigateBack={() => navigation.goBack()}
      onOpenTaskDetailVerification={(taskId?: string) => {
        if (!taskId) {
          Alert.alert(
            "No Verification Task Available",
            "No live task with a valid UUID is currently loaded for screen verification.",
          );
          return;
        }

        void Linking.openURL(buildTaskDetailVerificationUrl(taskId));
      }}
      onOpenCaptureSessionSmoke={() => {
        console.log("[CaptureSessionSmoke] Dev Settings → navigate");
        try {
          navigation.navigate("CaptureSessionSmoke");
        } catch (error) {
          console.error("[CaptureSessionSmoke] navigate threw", error);
          Alert.alert(
            "Capture session",
            `Could not open smoke screen: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }}
    />
  );
}

function CaptureSessionSmokeScreenWrapper({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, "CaptureSessionSmoke">) {
  return (
    <CaptureSessionSmokeScreen onClose={() => navigation.goBack()} />
  );
}

function DevAdminScreenWrapper({
  navigation,
}: NativeStackScreenProps<AdminDashboardStackParamList, "DevAdmin">) {
  return <DevAdminScreen onNavigateBack={() => navigation.goBack()} />;
}

// Create Task Stack
function CaptureTaskPickerScreenWrapper({
  route,
  navigation,
}: NativeStackScreenProps<CreateTaskStackParamList, "CaptureTaskPicker">) {
  const selectedPhotos = route.params?.selectedPhotos ?? [];

  return (
    <CaptureTaskPickerScreen
      selectedPhotos={selectedPhotos}
      onCancel={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return;
        }
        // Stack lost Select Photos — recreate it with the staged batch.
        navigation.navigate("PhotoSelection", {
          initialPhotos: selectedPhotos,
          uploadImmediately: false,
          captureFirstFlow: true,
          returnScreen: "CreateTask",
          entityType: "task",
          initialCompletionPercentage: 0,
          selectionRevision: Date.now(),
        });
      }}
      onSelectTask={(taskId) => {
        handOffCaptureFirstToUpdateProgress({
          navigation: navigation as any,
          taskId,
          photos: selectedPhotos,
        });
      }}
    />
  );
}

function CreateTaskStack() {
  return (
    <CreateTaskStackNavigator.Navigator screenOptions={buildDefaultStackScreenOptions()}>
      <CreateTaskStackNavigator.Screen name="CreateTaskMain" component={CreateTaskMainScreen} />
      <CreateTaskStackNavigator.Screen 
        name="PhotoSelection" 
        component={PhotoSelectionScreenWrapper}
      />
      <CreateTaskStackNavigator.Screen 
        name="PhotoViewer" 
        component={PhotoViewerScreenWrapper}
      />
      <CreateTaskStackNavigator.Screen
        name="InAppLibraryPicker"
        component={InAppLibraryPickerScreenWrapper}
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
      <CreateTaskStackNavigator.Screen
        name="CaptureSession"
        component={CaptureSessionScreenWrapper}
        options={{ headerShown: false, animation: "fade" }}
      />
      <CreateTaskStackNavigator.Screen
        name="CaptureTaskPicker"
        component={CaptureTaskPickerScreenWrapper}
        options={{ headerShown: false }}
      />
    </CreateTaskStackNavigator.Navigator>
  );
}

function CaptureSessionScreenWrapper({
  navigation,
  route,
}:
  | NativeStackScreenProps<CreateTaskStackParamList, "CaptureSession">
  | NativeStackScreenProps<DashboardStackParamList, "CaptureSession">
  | NativeStackScreenProps<TasksStackParamList, "CaptureSession">) {
  const params = route.params;
  const isAddPhotos = Boolean(
    params && typeof params === "object" && params.entry === "addPhotos",
  );

  return (
    <CaptureSessionFlowScreen
      onCancel={() => {
        if (isAddPhotos) {
          navigation.goBack();
          return;
        }
        exitCaptureFirstFlow(navigation as any);
      }}
      onComplete={(photos) => {
        if (isAddPhotos && params && typeof params === "object") {
          navigation.navigate("PhotoSelection", {
            taskId: params.taskId,
            subTaskId: params.subTaskId,
            companyId: params.companyId,
            userId: params.userId,
            initialCompletionPercentage: params.initialCompletionPercentage ?? 0,
            initialPhotos: photos,
            returnScreen: params.returnScreen,
            actionType: params.actionType,
            parentTaskId: params.parentTaskId,
            parentSubTaskId: params.parentSubTaskId,
            editTaskId: params.editTaskId,
            localDraftId: params.localDraftId,
            uploadImmediately: params.uploadImmediately ?? false,
            sourceScreen: params.sourceScreen,
            sourceTaskId: params.sourceTaskId,
            sourceSubTaskId: params.sourceSubTaskId,
            entityType: params.entityType,
            captureFirstFlow: false,
            selectionRevision: Date.now(),
          });
          return;
        }
        navigation.navigate("PhotoSelection", {
          initialPhotos: photos,
          uploadImmediately: false,
          captureFirstFlow: true,
          returnScreen: "CreateTask",
          entityType: "task",
          initialCompletionPercentage: 0,
          selectionRevision: Date.now(),
        });
      }}
    />
  );
}

// WRAPPER: CreateTaskMainScreen
// USED WHEN: Navigating to "CreateTaskMain" screen (main entry point for Create Task)
// PURPOSE: Handles navigation params, stores selectedPhotos in state, and passes to CreateTaskScreen
// NOTE: This is the PRIMARY wrapper used when returning from PhotoSelectionScreen
function CreateTaskMainScreen({
  navigation,
  route,
}: NativeStackScreenProps<CreateTaskStackParamList, "CreateTaskMain">) {
  // Use state to store selectedPhotos so they persist and trigger re-renders
  const [selectedPhotosState, setSelectedPhotosState] = React.useState<CreateTaskParams["selectedPhotos"]>(
    undefined,
  );
  const [uploadedPhotoUrlsState, setUploadedPhotoUrlsState] = React.useState<string[] | undefined>(undefined);
  
  // Try both direct params and nested params (for tab navigation)
  const rawParams = (route.params || {}) as CreateTaskParams;
  const params = resolveCreateTaskEntryParams(rawParams);
  const parentTaskId = params.parentTaskId;
  const parentSubTaskId = params.parentSubTaskId;
  const editTaskId = params.editTaskId;
  const localDraftId = params.localDraftId;
  const actionType = params.actionType || (editTaskId ? "edit" : undefined);
  const cameraLaunchContext = params.cameraLaunchContext;
  const postCaptureDefault = params.postCaptureDefault;
  const updateTargetSubTaskId = params.updateTargetSubTaskId;
  const sourceTaskId = params.sourceTaskId; // TaskId from the source TaskDetail screen
  const sourceSubTaskId = params.sourceSubTaskId; // SubTaskId from the source TaskDetail screen
  const sourceScreen = params.sourceScreen; // 'dashboard' or 'tasks' to know which navigator to use
  const selectedPhotosFromParams = normalizeCreateTaskSelectedPhotos(params.selectedPhotos); // Photos selected from PhotoSelectionScreen
  const uploadedPhotoUrlsFromParams = params.uploadedPhotoUrls; // Uploaded URLs returned from PhotoSelectionScreen
  const clearForm = params.clearForm; // Flag to clear form when "Create New Task" is pressed
  const clearFormTimestamp = params._timestamp; // Timestamp to track when clearForm was set
  const captureFirstFlow = Boolean(params.captureFirstFlow);

  React.useEffect(() => {
    if (!clearForm) {
      return;
    }

    setSelectedPhotosState(undefined);
    setUploadedPhotoUrlsState(undefined);
    navigation.setParams({
      parentTaskId: undefined,
      parentSubTaskId: undefined,
      editTaskId: undefined,
      localDraftId: undefined,
      actionType: undefined,
      updateTargetSubTaskId: undefined,
      sourceTaskId: undefined,
      sourceSubTaskId: undefined,
      sourceScreen: undefined,
      cameraLaunchContext: undefined,
      postCaptureDefault: undefined,
      selectedPhotos: undefined,
      uploadedPhotoUrls: undefined,
      clearForm: undefined,
      _timestamp: undefined,
    });
  }, [clearForm, navigation]);
  
  // Update state when params change
  React.useEffect(() => {
    if (selectedPhotosFromParams && Array.isArray(selectedPhotosFromParams) && selectedPhotosFromParams.length > 0) {
      setSelectedPhotosState(selectedPhotosFromParams);
      // Clear params after storing in state
      navigation.setParams({ selectedPhotos: undefined });
    }
  }, [selectedPhotosFromParams, navigation]);

  React.useEffect(() => {
    if (uploadedPhotoUrlsFromParams && Array.isArray(uploadedPhotoUrlsFromParams) && uploadedPhotoUrlsFromParams.length > 0) {
      setUploadedPhotoUrlsState(uploadedPhotoUrlsFromParams);
      navigation.setParams({ uploadedPhotoUrls: undefined });
    }
  }, [navigation, uploadedPhotoUrlsFromParams]);
  
  // Also listen for navigation focus to catch params that arrive late
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Check params again on focus
      const currentParams = (route.params || {}) as CreateTaskParams;
      const currentSelectedPhotos = normalizeCreateTaskSelectedPhotos(currentParams.selectedPhotos);
      const currentUploadedPhotoUrls = currentParams.uploadedPhotoUrls;
      if (currentSelectedPhotos && Array.isArray(currentSelectedPhotos) && currentSelectedPhotos.length > 0) {
        setSelectedPhotosState(currentSelectedPhotos);
        navigation.setParams({ selectedPhotos: undefined });
      }
      if (currentUploadedPhotoUrls && Array.isArray(currentUploadedPhotoUrls) && currentUploadedPhotoUrls.length > 0) {
        setUploadedPhotoUrlsState(currentUploadedPhotoUrls);
        navigation.setParams({ uploadedPhotoUrls: undefined });
      }
    });
    return unsubscribe;
  }, [navigation, route.params]);
  
  // Use state value or params value (state takes precedence)
  const selectedPhotos = selectedPhotosState || selectedPhotosFromParams;
  const uploadedPhotoUrls = uploadedPhotoUrlsState || uploadedPhotoUrlsFromParams;
  const clearDraftPayloads = React.useCallback(() => {
    setSelectedPhotosState(undefined);
    setUploadedPhotoUrlsState(undefined);
    // Target this screen's route key — setParams on an unfocused/child route
    // raises "SET_PARAMS was not handled by any navigator".
    if (!route.key) {
      return;
    }
    navigation.dispatch({
      ...CommonActions.setParams({
        selectedPhotos: undefined,
        uploadedPhotoUrls: undefined,
      }),
      source: route.key,
    });
  }, [navigation, route.key]);
  const handleCreateSuccess = React.useCallback(() => {
    clearDraftPayloads();
    const parentNav = navigation.getParent();

    if (parentNav) {
      if (localDraftId && sourceScreen === "dashboard") {
        parentNav.navigate("Activity", {
          screen: "DashboardMain",
        });
        return;
      }
      parentNav.navigate("Tasks", {
        screen: "TasksList",
      });
      return;
    }

    navigation.goBack();
  }, [clearDraftPayloads, localDraftId, navigation, sourceScreen]);

  const handleDraftSaved = React.useCallback(() => {
    navigateToRootTabScreen(navigation, "Activity", {
      screen: "DashboardMain",
    });
  }, [navigation]);
  
  // Handle back navigation - if editing, navigate back to TaskDetail screen
  const handleNavigateBack = React.useCallback(() => {
    // Capture-first create: always pop to Select Photos (kept under this screen).
    if (captureFirstFlow) {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      navigation.navigate("PhotoSelection", {
        initialPhotos: selectedPhotosState ?? [],
        uploadImmediately: false,
        captureFirstFlow: true,
        returnScreen: "CreateTask",
        entityType: "task",
        initialCompletionPercentage: 0,
        selectionRevision: Date.now(),
      });
      return;
    }

    const parentNav = navigation.getParent();
    if (localDraftId) {
      if (parentNav && sourceScreen === "dashboard") {
        parentNav.navigate("Activity", { screen: "DashboardMain" });
        return;
      }
      if (parentNav && sourceScreen === "tasks") {
        parentNav.navigate("Tasks", { screen: "TasksList" });
        return;
      }
      navigation.goBack();
      return;
    }
    if (editTaskId && sourceScreen && sourceTaskId) {
      if (parentNav) {
        if (sourceScreen === "dashboard") {
          parentNav.navigate("Activity", {
            screen: "TaskDetailFromDashboard",
            params: { taskId: sourceTaskId, subTaskId: sourceSubTaskId },
          });
        } else if (sourceScreen === "tasks") {
          parentNav.navigate("Tasks", {
            screen: "TaskDetail",
            params: { taskId: sourceTaskId, subTaskId: sourceSubTaskId },
          });
        } else {
          navigation.goBack();
        }
      } else {
        navigation.goBack();
      }
    } else {
      navigation.goBack();
    }
  }, [
    captureFirstFlow,
    editTaskId,
    localDraftId,
    navigation,
    selectedPhotosState,
    sourceScreen,
    sourceSubTaskId,
    sourceTaskId,
  ]);
  
  // Route to appropriate screen based on actionType
  // For now, all actions go through CreateTaskScreen which will handle them
  // In the future, we can create separate screens for each action type
  return (
    <CreateTaskScreen
      onNavigateBack={handleNavigateBack}
      onCreateSuccess={handleCreateSuccess}
      onDraftSaved={handleDraftSaved}
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
      editTaskId={editTaskId}
      localDraftId={localDraftId}
      actionType={actionType}
      cameraLaunchContext={cameraLaunchContext}
      postCaptureDefault={postCaptureDefault}
      updateTargetSubTaskId={updateTargetSubTaskId}
      selectedPhotos={selectedPhotos}
      uploadedPhotoUrls={uploadedPhotoUrls}
      onClearDraftPayloads={clearDraftPayloads}
      clearForm={clearForm}
      clearFormTimestamp={clearFormTimestamp}
      onNavigateToProfile={() => navigateToRootProfile(navigation)}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
  );
}

// Admin Dashboard Stack
function AdminDashboardStack() {
  return (
    <AdminDashboardStackNavigator.Navigator screenOptions={buildDefaultStackScreenOptions()}>
      <AdminDashboardStackNavigator.Screen
        name="AdminDashboardMain"
        component={AdminDashboardMainScreen}
      />
      <AdminDashboardStackNavigator.Screen name="ProjectsList" component={ProjectsListScreen} />
      <AdminDashboardStackNavigator.Screen
        name="ProjectDetail"
        component={ProjectDetailScreenWrapper}
      />
      <AdminDashboardStackNavigator.Screen name="CreateProject" component={CreateProjectMainScreen} />
      <AdminDashboardStackNavigator.Screen name="UserManagement" component={UserManagementMainScreen} />
      <AdminDashboardStackNavigator.Screen name="CompanyPlan" component={CompanyPlanFromAdminScreen} />
      <AdminDashboardStackNavigator.Screen name="DevAdmin" component={DevAdminScreenWrapper} />
    </AdminDashboardStackNavigator.Navigator>
  );
}

function AdminDashboardMainScreen({
  navigation,
}: NativeStackScreenProps<AdminDashboardStackParamList, "AdminDashboardMain">) {
  const user = useAuthStore((state) => state.user);

  return (
    <AdminDashboardScreen
      onNavigateToProjects={() => navigation.navigate("ProjectsList")}
      onNavigateToUserManagement={() => navigation.navigate("UserManagement")}
      onNavigateToCompanyPlan={() => navigation.navigate("CompanyPlan")}
      onNavigateToProfile={() => navigateToRootProfile(navigation)}
      onNavigateToDevAdmin={
        isPlatformSuperuser(user)
          ? () => navigation.navigate("DevAdmin")
          : undefined
      }
    />
  );
}

// Projects Stack (Admin Only) - Kept for backwards compatibility
function ProjectsStack() {
  return (
    <AdminDashboardStackNavigator.Navigator screenOptions={buildDefaultStackScreenOptions()}>
      <AdminDashboardStackNavigator.Screen name="ProjectsList" component={ProjectsListScreen} />
      <AdminDashboardStackNavigator.Screen
        name="ProjectDetail"
        component={ProjectDetailScreenWrapper}
      />
      <AdminDashboardStackNavigator.Screen name="CreateProject" component={CreateProjectMainScreen} />
      <AdminDashboardStackNavigator.Screen name="UserManagement" component={UserManagementMainScreen} />
    </AdminDashboardStackNavigator.Navigator>
  );
}

// Projects Stack for Non-Admin Users
function UserProjectsStack() {
  return (
    <AdminDashboardStackNavigator.Navigator screenOptions={buildDefaultStackScreenOptions()}>
      <AdminDashboardStackNavigator.Screen name="ProjectsList" component={ProjectsListScreen} />
      <AdminDashboardStackNavigator.Screen
        name="ProjectDetail"
        component={ProjectDetailScreenWrapper}
      />
    </AdminDashboardStackNavigator.Navigator>
  );
}

function ProjectsListScreen({
  navigation,
  route,
}: NativeStackScreenProps<AdminDashboardStackParamList, "ProjectsList">) {
  const newProjectId = route.params?.newProjectId;
  
  return (
    <ProjectsScreen
      onNavigateToProjectDetail={(projectId: string) => {
        navigation.navigate("ProjectDetail", { projectId });
      }}
      onNavigateToCreateProject={() => navigation.navigate("CreateProject")}
      onNavigateToUserManagement={() => navigation.navigate("UserManagement")}
      onNavigateBack={() => navigation.navigate("AdminDashboardMain")}
      newProjectId={newProjectId}
    />
  );
}

function ProjectDetailScreenWrapper({
  route,
  navigation,
}: NativeStackScreenProps<AdminDashboardStackParamList, "ProjectDetail">) {
  const { projectId } = route.params;
  return (
    <ProjectDetailScreen
      projectId={projectId}
      onNavigateBack={() => navigation.goBack()}
    />
  );
}

function CreateProjectMainScreen({
  navigation,
}: NativeStackScreenProps<AdminDashboardStackParamList, "CreateProject">) {
  return (
    <CreateProjectScreen
      onNavigateBack={(projectId?: string) => {
        // Pass the newly created project ID back to ProjectsScreen
        navigation.navigate('ProjectsList', { newProjectId: projectId });
      }}
    />
  );
}

function UserManagementMainScreen({
  navigation,
}: NativeStackScreenProps<AdminDashboardStackParamList, "UserManagement">) {
  return (
    <UserManagementScreen
      onNavigateBack={() => navigation.goBack()}
      onNavigateToCompanyPlan={() => navigation.navigate("CompanyPlan")}
    />
  );
}

function CompanyPlanFromAdminScreen({
  navigation,
  route,
}: NativeStackScreenProps<AdminDashboardStackParamList, "CompanyPlan">) {
  return (
    <CompanyPlanScreen
      checkoutResult={route.params?.checkoutResult}
      checkoutPlan={route.params?.checkoutPlan}
      onNavigateBack={() => navigation.goBack()}
      onNavigateToCompanyManagement={() =>
        navigation.navigate("AdminDashboardMain")
      }
    />
  );
}

function AppRootStack() {
  return (
    <RootStackNavigator.Navigator screenOptions={{ headerShown: false }}>
      <RootStackNavigator.Screen name="MainTabs" component={MainTabs} />
      <RootStackNavigator.Screen name="Profile" component={ProfileStack} />
    </RootStackNavigator.Navigator>
  );
}

// Main Tab Navigator
function MainTabs() {
  const badgeCount = useActivityTabBadgeCount();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: ROOT_TAB_BAR_STYLE,
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          textAlign: "center",
          marginTop: 2,
        },
        tabBarIconStyle: {
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 2,
        },
      }}
    >
      {/* Same field shell for CA / PM / Worker — management via avatar → CompanyManagement */}
      <Tab.Screen
        name="Activity"
        component={DashboardStack}
        options={({ route, navigation }) => {
          const hideSideTabs = shouldHideRootSideTabsForTabState(
            typeof navigation?.getState === "function"
              ? (navigation.getState() as Parameters<
                  typeof resolveTaskDetailCameraTabParams
                >[0])
              : undefined,
          );
          return {
          tabBarLabel: "Activity",
          tabBarButton: (props) => (
            <RootTabButton
              {...props}
              testID="root-tab__activity"
              alignTowardsCamera="right"
              hidden={hideSideTabs}
            />
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
          tabBarBadge: hideSideTabs ? undefined : badgeCount,
          tabBarBadgeStyle: { backgroundColor: '#ef4444', color: 'white', fontSize: 10 },
          tabBarStyle: buildRootTabBarStyleForRoute(
            getFocusedRouteNameFromRoute(route),
          ),
        };
        }}
      />
      <Tab.Screen
        name="Camera"
        component={CreateTaskStack}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            handleCameraTabPress({
              event,
              navigation: {
                getState: () =>
                  navigation.getState() as Parameters<
                    typeof resolveTaskDetailCameraTabParams
                  >[0],
                navigate: (screen, params) =>
                  (navigation.navigate as (screen: string, params?: unknown) => void)(
                    screen,
                    params,
                  ),
              },
            });
          },
        })}
        options={({ route, navigation }) => {
          const updateShortcut = resolveTaskDetailUpdateShortcut(
            typeof navigation?.getState === "function"
              ? (navigation.getState() as Parameters<
                  typeof resolveTaskDetailUpdateShortcut
                >[0])
              : undefined,
          );
          const isTaskDetailUpdate = Boolean(updateShortcut);
          return {
          tabBarLabel: "",
          tabBarShowLabel: false,
          tabBarActiveTintColor: "#ffffff",
          tabBarInactiveTintColor: "#ffffff",
          tabBarButton: (props) => (
            <CenterCameraTabButton
              {...props}
              disabled={Boolean(props.disabled)}
              affordance={isTaskDetailUpdate ? "update" : "camera"}
              accessibilityLabel={
                isTaskDetailUpdate
                  ? "Start task update"
                  : props.accessibilityLabel ?? "Camera"
              }
              icon={
                <Ionicons
                  testID="root-tab__camera_icon"
                  name={isTaskDetailUpdate ? "add" : "camera"}
                  size={isTaskDetailUpdate ? 36 : 28}
                  color="#ffffff"
                />
              }
            />
          ),
          tabBarStyle: buildRootTabBarStyleForRoute(
            getFocusedRouteNameFromRoute(route),
            "CreateTaskMain",
          ),
        };
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksStack}
        options={({ route, navigation }) => {
          const hideSideTabs = shouldHideRootSideTabsForTabState(
            typeof navigation?.getState === "function"
              ? (navigation.getState() as Parameters<
                  typeof resolveTaskDetailCameraTabParams
                >[0])
              : undefined,
          );
          return {
          tabBarLabel: "Tasks",
          tabBarButton: (props) => (
            <RootTabButton
              {...props}
              testID="root-tab__tasks"
              alignTowardsCamera="left"
              hidden={hideSideTabs}
            />
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
          tabBarStyle: buildRootTabBarStyleForRoute(
            getFocusedRouteNameFromRoute(route),
          ),
        };
        }}
      />
    </Tab.Navigator>
  );
}

// Loading Screen Component
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

export function WorkspaceBootstrapGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuthStore();
  const currentUserId = user?.id ?? null;
  const workspaceReady = useProjectFilterStore((state) => state.workspaceReady);
  const workspaceReadyUserId = useProjectFilterStore(
    (state) => state.workspaceReadyUserId,
  );
  const initializeWorkspaceProject = useProjectFilterStore(
    (state) => state.initializeWorkspaceProject,
  );
  const hasWorkspaceReadyForCurrentUser =
    !isAuthenticated ||
    (Boolean(currentUserId) &&
      workspaceReady &&
      workspaceReadyUserId === currentUserId);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) {
      return;
    }

    // Skip re-init when already ready for this user — re-entry sets workspaceReady
    // false and unmounts NavigationContainer (Realtime/NetworkSync thrash → Hermes OOM).
    if (workspaceReady && workspaceReadyUserId === currentUserId) {
      return;
    }

    void initializeWorkspaceProject(currentUserId);
  }, [
    currentUserId,
    initializeWorkspaceProject,
    isAuthenticated,
    workspaceReady,
    workspaceReadyUserId,
  ]);

  if (!hasWorkspaceReadyForCurrentUser) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

export default function AppNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const authUser = useAuthStore((state) => state.user);
  const mustSetPassword = authUser?.mustSetPassword === true;
  const requiresCompanyPlanSelection = useAuthStore(
    (state) => state.requiresCompanyPlanSelection,
  );

  // Cold start only. Wait for initialize() so a persisted session cannot
  // open MainTabs before must_set_password is loaded. Never use isLoading
  // here — login/updateUser flipping it used to remount Realtime and OOM.
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthScreens />;
  }

  // Outside NavigationContainer so invite deep links cannot land on MainTabs first.
  // Realtime stays unmounted until the invitee has a reusable password.
  if (mustSetPassword) {
    return <SetPasswordScreen />;
  }

  // New company founders: Company Plan only until Stripe subscription exists.
  if (requiresCompanyPlanSelection) {
    return <CompanyPlanSelectionGate />;
  }

  // Keep Realtime/NetworkSync outside WorkspaceBootstrapGate so flipping
  // workspaceReady→false does not tear down channels (Hermes OOM under Maestro).
  return (
    <>
      <NetworkSyncManager />
      <RealtimeSyncManager />
      <WorkspaceBootstrapGate>
        <NavigationContainer ref={rootNavigationRef} linking={appLinking}>
          <PostCheckoutManagementRedirect />
          <DataRefreshManager />
          <AppRootStack />
        </NavigationContainer>
      </WorkspaceBootstrapGate>
    </>
  );
}

// Loading Screen Styles
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  rootTabSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  rootTabSideSlot: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
  },
  rootTabSideSlotTowardCameraLeft: {
    alignItems: "center",
    transform: [{ translateX: -ROOT_TAB_SIDE_CENTER_OFFSET }],
  },
  rootTabSideSlotTowardCameraRight: {
    alignItems: "center",
    transform: [{ translateX: ROOT_TAB_SIDE_CENTER_OFFSET }],
  },
  rootTabButton: {
    alignItems: "center",
    alignSelf: "stretch",
    flex: 1,
    justifyContent: "center",
    minWidth: 56,
    paddingHorizontal: 6,
  },
  centerCameraTabButtonSlot: {
    ...ROOT_TAB_CENTER_FAB_SLOT,
  },
  centerCameraTabButton: {
    ...ROOT_TAB_CENTER_FAB_LAYOUT,
    backgroundColor: "#dc2626",
    shadowColor: "#7f1d1d",
  },
  centerCameraTabButtonFocused: {
    backgroundColor: "#b91c1c",
  },
  centerUpdateTabButton: {
    backgroundColor: "#08576E",
    shadowColor: "#043847",
  },
  centerUpdateTabButtonFocused: {
    backgroundColor: "#06485A",
  },
  centerCameraTabIconSurface: {
    alignItems: "center",
    justifyContent: "center",
  },
});
