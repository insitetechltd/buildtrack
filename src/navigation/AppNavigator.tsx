import React, { useEffect, useMemo, useRef } from "react";
import {
  CommonActions,
  NavigationContainer,
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
import { useProjectFilterStore } from "../state/projectFilterStore";
import { isAdmin } from "../types/buildtrack";
import { useTaskStore } from "../state/taskStore.supabase";
import { DataRefreshManager } from "../utils/DataRefreshManager";
import { NetworkSyncManager } from "../utils/NetworkSyncManager";
import { RealtimeSyncManager } from "../utils/RealtimeSyncManager";
import LoginScreen from "../screens/LoginScreen";
// Registration temporarily disabled for App Store submission
// import RegisterScreen from "../screens/RegisterScreen";
import { DashboardRoute, TasksRoute } from "./uiModeRoutes";
import CreateTaskScreen from "../screens/CreateTaskScreen";
import ProfileScreen from "../screens/ProfileScreen";
import TaskDetailScreen from "../screens/TaskDetailScreen";
import ProjectsScreen from "../screens/ProjectsScreen";
import CreateProjectScreen from "../screens/CreateProjectScreen";
import UserManagementScreen from "../screens/UserManagementScreen";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import ProjectDetailScreen from "../screens/ProjectDetailScreen";
import DevAdminScreen from "../screens/DevAdminScreen";
import ProjectPickerScreen from "../screens/ProjectPickerScreen";
import DeveloperSettingsScreen from "../screens/DeveloperSettingsScreen";
import PendingUsersScreen from "../screens/PendingUsersScreen";
import PhotoViewerScreen from "../screens/PhotoViewerScreen";
import PhotoAnnotationScreen from "../screens/PhotoAnnotationScreen";
import PhotoSelectionScreen from "../screens/PhotoSelectionScreen";
import UpdateProgressScreen from "../screens/UpdateProgressScreen";
import AddCommentScreen from "../screens/AddCommentScreen";
import RejectTaskScreen from "../screens/RejectTaskScreen";
import ReassignTaskScreen from "../screens/ReassignTaskScreen";
import {
  buildPhotoShortcutCreateTaskParams,
  resolveTaskDetailCameraTabParams,
  shouldReturnToCreateTaskShortcut,
} from "./photoShortcutRoutes";
import {
  buildCreateTaskPhotoReturnParams,
  resolveCreateTaskEntryParams,
} from "./createTaskRouteParams";
import { buildDefaultStackScreenOptions } from "./nativeStackOptions";
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
  PhotoAnnotationParams,
  PhotoSelectionParams,
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

const ROOT_TAB_BAR_STYLE: ViewStyle = {
  height: 76,
  overflow: "visible",
  paddingTop: 8,
  paddingBottom: 10,
  borderTopColor: "#e5e7eb",
  backgroundColor: "#ffffff",
};

// Bottom-tab geometry is intentionally tuned and should only change with
// matching test updates plus simulator verification.
const ROOT_TAB_CAMERA_TOP_OFFSET = -16;
const ROOT_TAB_SIDE_CENTER_OFFSET = Dimensions.get("window").width / 12;

export function shouldHideTabBarOnTaskDetailRoute(routeName?: string) {
  return routeName === "TaskDetail" || routeName === "TaskDetailFromDashboard";
}

export function shouldHideTabBarOnCreateTaskRoute(routeName?: string) {
  return routeName === "CreateTaskMain";
}

function buildRootTabBarStyleForRoute(
  routeName?: string,
  initialRouteName?: string,
): ViewStyle {
  const resolvedRouteName = routeName ?? initialRouteName;
  const shouldHideTabBar =
    shouldHideTabBarOnTaskDetailRoute(resolvedRouteName) ||
    shouldHideTabBarOnCreateTaskRoute(resolvedRouteName);

  if (!shouldHideTabBar) {
    return ROOT_TAB_BAR_STYLE;
  }

  return {
    ...ROOT_TAB_BAR_STYLE,
    display: "none",
  };
}

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
    void (async () => {
      if (automationMatch) {
        try {
          await applySprint7AutomationLink(automationMatch);
        } catch (error) {
          console.error("[Linking] Sprint7 automation link failed:", error);
        }
      }
    })();

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

type RouteStateLike = {
  index?: number;
  routeNames?: string[];
  routes?: Array<{ key: string; name?: string }>;
};
type RootTabLikeNavigation = {
  navigate: (...args: unknown[]) => void;
};
type RootStackLikeNavigation = Pick<
  NativeStackNavigationProp<RootStackParamList>,
  "navigate"
>;
type ParentNavigationLike = {
  getParent?: () => ParentNavigationLike | undefined;
  getState?: () => RouteStateLike;
  navigate?: (...args: unknown[]) => void;
};

type ProjectPickerNavigation = {
  navigate:
    | NativeStackNavigationProp<DashboardStackParamList>["navigate"]
    | NativeStackNavigationProp<TasksStackParamList>["navigate"];
  getParent?: () => ParentNavigationLike | undefined;
  getState?: () => RouteStateLike;
};

type CreateTaskRouteNavigation = {
  navigate:
    | NativeStackNavigationProp<DashboardStackParamList>["navigate"]
    | NativeStackNavigationProp<TasksStackParamList>["navigate"]
    | NativeStackNavigationProp<CreateTaskStackParamList>["navigate"];
  canGoBack?: () => boolean;
  dispatch?: (action: ReturnType<typeof CommonActions.setParams> & { source?: string }) => void;
  getParent?: () => ParentNavigationLike | undefined;
  goBack: () => void;
  getState?: () => RouteStateLike;
  setParams?: (params: CreateTaskParams) => void;
};

type DashboardTaskDetailBackNavigation = Pick<
  NativeStackNavigationProp<DashboardStackParamList>,
  "canGoBack" | "getParent" | "getState" | "goBack" | "pop"
>;

type TasksTaskDetailBackNavigation = Pick<
  NativeStackNavigationProp<TasksStackParamList>,
  "canGoBack" | "getState" | "goBack" | "navigate" | "pop"
>;

type StackBackNavigation = {
  canGoBack: () => boolean;
  getState?: () => RouteStateLike;
  goBack: () => void;
  pop: (count?: number) => void;
};

function hasCurrentStackHistory(state?: RouteStateLike) {
  if (!state) {
    return false;
  }

  if (typeof state.index === "number") {
    return state.index > 0;
  }

  return Array.isArray(state.routes) && state.routes.length > 1;
}

function popCurrentStack(navigation: StackBackNavigation) {
  if (navigation.canGoBack()) {
    navigation.pop(1);
    return true;
  }

  const state = navigation.getState?.() as RouteStateLike | undefined;

  if (hasCurrentStackHistory(state)) {
    navigation.pop(1);
    return true;
  }

  return false;
}

function hasAnyRoute(
  navigation: ParentNavigationLike | undefined,
  routeNames: string[],
) {
  const currentRouteNames = navigation?.getState?.()?.routeNames || [];
  return routeNames.some((routeName) => currentRouteNames.includes(routeName));
}

function getRootTabsNavigation(
  navigation: { getParent?: () => ParentNavigationLike | undefined },
) {
  const parentNav = navigation.getParent?.();
  if (hasAnyRoute(parentNav, ["Activity", "Camera", "Tasks", "AdminDashboard"])) {
    return parentNav as RootTabLikeNavigation;
  }

  const grandParentNav = parentNav?.getParent?.();
  if (
    hasAnyRoute(grandParentNav, ["Activity", "Camera", "Tasks", "AdminDashboard"])
  ) {
    return grandParentNav as RootTabLikeNavigation;
  }

  return undefined;
}

function getRootStackNavigation(
  navigation: { getParent?: () => ParentNavigationLike | undefined },
) {
  const parentNav = navigation.getParent?.();
  if (hasAnyRoute(parentNav, ["MainTabs", "Profile"])) {
    return parentNav as RootStackLikeNavigation;
  }

  const grandParentNav = parentNav?.getParent?.();
  if (hasAnyRoute(grandParentNav, ["MainTabs", "Profile"])) {
    return grandParentNav as RootStackLikeNavigation;
  }

  return undefined;
}

function navigateToRootProfile(
  navigation: { getParent?: () => ParentNavigationLike | undefined },
  screen: keyof ProfileStackParamList = "ProfileMain",
) {
  const rootNav = getRootStackNavigation(navigation);
  if (!rootNav) {
    return;
  }

  if (screen === "ProfileMain") {
    rootNav.navigate("Profile");
    return;
  }

  rootNav.navigate("Profile", { screen });
}

function navigateToRootTabScreen<T extends keyof RootTabParamList>(
  navigation: { getParent?: () => ParentNavigationLike | undefined },
  screen: T,
  params?: RootTabParamList[T],
) {
  const tabsNav = getRootTabsNavigation(navigation);
  if (tabsNav) {
    tabsNav.navigate(screen as never, params as never);
    return;
  }

  const rootNav = getRootStackNavigation(navigation);
  if (!rootNav) {
    return;
  }

  if (params === undefined) {
    rootNav.navigate("MainTabs", { screen } as RootStackParamList["MainTabs"]);
    return;
  }

  rootNav.navigate("MainTabs", { screen, params } as RootStackParamList["MainTabs"]);
}

function navigateToProjectPicker(
  navigation: ProjectPickerNavigation,
  allowBack?: boolean,
) {
  const currentRouteNames = navigation.getState?.()?.routeNames || [];
  if (currentRouteNames.includes("ProjectPicker")) {
    (
      navigation as NativeStackNavigationProp<DashboardStackParamList>
    ).navigate("ProjectPicker", { allowBack });
    return;
  }

  navigateToRootTabScreen(navigation, "Activity", {
    screen: "ProjectPicker",
    params: { allowBack },
  });
}

function navigateToCreateTaskRoute(
  navigation: CreateTaskRouteNavigation,
  params: CreateTaskParams,
) {
  const currentRouteNames = navigation.getState?.()?.routeNames || [];
  if (currentRouteNames.includes("CreateTask")) {
    (
      navigation as NativeStackNavigationProp<
        DashboardStackParamList | TasksStackParamList
      >
    ).navigate("CreateTask", params);
    return;
  }

  if (currentRouteNames.includes("CreateTaskMain")) {
    (
      navigation as NativeStackNavigationProp<CreateTaskStackParamList>
    ).navigate("CreateTaskMain", params);
    return;
  }

  navigateToRootTabScreen(navigation, "Camera", {
    screen: "CreateTaskMain",
    params,
  });
}

export function returnToCreateTaskRoute(
  navigation: CreateTaskRouteNavigation,
  params: CreateTaskParams,
) {
  const navigationState = navigation.getState?.();
  const currentRouteNames = navigationState?.routeNames || [];
  const currentRoutes = navigationState?.routes || [];
  const currentIndex =
    typeof navigationState?.index === "number"
      ? navigationState.index
      : currentRoutes.length - 1;
  const previousRoute = currentIndex > 0 ? currentRoutes[currentIndex - 1] : undefined;
  const previousRouteName = previousRoute?.name || currentRouteNames[currentIndex - 1];
  const previousRouteKey = previousRoute?.key;
  const canReturnToExistingCreateTask =
    navigation.canGoBack?.() &&
    (previousRouteName === "CreateTask" || previousRouteName === "CreateTaskMain");

  if (!canReturnToExistingCreateTask) {
    navigateToCreateTaskRoute(navigation, params);
    return;
  }

  navigation.goBack();

  setTimeout(() => {
    if (previousRouteKey && navigation.dispatch) {
      navigation.dispatch({
        ...CommonActions.setParams(params),
        source: previousRouteKey,
      });
      return;
    }

    navigation.setParams?.(params);
  }, 150);
}

export function handleDashboardTaskDetailBack(
  navigation: DashboardTaskDetailBackNavigation,
) {
  if (popCurrentStack(navigation)) {
    return;
  }

  const parentNav = navigation.getParent?.() as RootTabLikeNavigation | undefined;
  parentNav?.navigate("Activity");
}

export function handleTasksTaskDetailBack(
  navigation: TasksTaskDetailBackNavigation,
) {
  if (popCurrentStack(navigation)) {
    return;
  }

  navigation.navigate("TasksList");
}

export function handleCameraTabPress({
  event,
  navigation,
}: {
  event: { preventDefault: () => void };
  navigation: {
    getState: () => Parameters<typeof resolveTaskDetailCameraTabParams>[0];
    navigate: (
      screen: "Camera",
      params?: RootTabParamList["Camera"],
    ) => void;
  };
}) {
  const taskDetailCameraParams = resolveTaskDetailCameraTabParams(
    navigation.getState() as Parameters<typeof resolveTaskDetailCameraTabParams>[0],
  );

  event.preventDefault();

  if (taskDetailCameraParams) {
    navigation.navigate("Camera", taskDetailCameraParams);
    return;
  }

  navigation.navigate("Camera", {
    screen: "CreateTaskMain",
    params: undefined,
  });
}

function CenterCameraTabButton({
  accessibilityLabel,
  accessibilityState,
  children,
  onLongPress,
  onPress,
  icon,
  style,
}: BottomTabBarButtonProps & { icon: React.ReactNode }) {
  const isFocused = accessibilityState?.selected === true;
  const tabButtonStyle = style as StyleProp<ViewStyle>;

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
          accessibilityState={accessibilityState}
          onLongPress={onLongPress}
          onPress={onPress}
          testID="root-tab__camera_button"
          style={[
            styles.centerCameraTabButton,
            isFocused ? styles.centerCameraTabButtonFocused : null,
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
        {children}
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
}: BottomTabBarButtonProps & {
  testID: string;
  alignTowardsCamera: "left" | "right";
}) {
  const tabButtonStyle = style as StyleProp<ViewStyle>;

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
        testID={`${testID}_pressable`}
        style={styles.rootTabButton}
      >
        {children}
      </Pressable>
    </View>
  );
}

function AuthScreens() {
  // Registration temporarily disabled for App Store submission
  // const [showRegister, setShowRegister] = useState(false);

  // if (showRegister) {
  //   return (
  //     <RegisterScreen
  //       onToggleLogin={() => setShowRegister(false)}
  //     />
  //   );
  // }

  return (
    <LoginScreen
      // Registration is hidden - accounts are created by administrators
      // onToggleRegister={() => setShowRegister(true)}
    />
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
        name="PhotoAnnotation" 
        component={PhotoAnnotationScreenWrapper}
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
            actionType: params?.actionType,
            updateTargetSubTaskId: params?.updateTargetSubTaskId,
            sourceTaskId: params?.sourceTaskId,
            sourceSubTaskId: params?.sourceSubTaskId,
            sourceScreen: params?.sourceScreen,
            selectedPhotos: params?.selectedPhotos,
            uploadedPhotoUrls: params?.uploadedPhotoUrls,
            cameraLaunchContext: params?.cameraLaunchContext,
            postCaptureDefault: params?.postCaptureDefault,
            clearForm: params?.clearForm ?? true,
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
        // Navigate to CreateTask screen in the same stack with card transition
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
        name="PhotoAnnotation" 
        component={PhotoAnnotationScreenWrapper}
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
            actionType: params?.actionType,
            updateTargetSubTaskId: params?.updateTargetSubTaskId,
            sourceTaskId: params?.sourceTaskId,
            sourceSubTaskId: params?.sourceSubTaskId,
            sourceScreen: params?.sourceScreen,
            selectedPhotos: params?.selectedPhotos,
            uploadedPhotoUrls: params?.uploadedPhotoUrls,
            cameraLaunchContext: params?.cameraLaunchContext,
            postCaptureDefault: params?.postCaptureDefault,
            clearForm: params?.clearForm ?? true,
            _timestamp: params?._timestamp ?? Date.now(), // Force navigation by adding unique param
          },
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
        // Navigate to CreateTask screen in the same stack with card transition
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

type PhotoAnnotationScreenWrapperProps =
  | NativeStackScreenProps<DashboardStackParamList, "PhotoAnnotation">
  | NativeStackScreenProps<TasksStackParamList, "PhotoAnnotation">
  | NativeStackScreenProps<CreateTaskStackParamList, "PhotoAnnotation">;

function PhotoAnnotationScreenWrapper({
  route,
  navigation,
}: PhotoAnnotationScreenWrapperProps) {
  const { photoUri, photoIndex, returnScreen } = route.params || {};
  
  const handleSave = (annotatedPhotoUri: string) => {
    // If we came from PhotoSelection, pass the result back via params
    if (returnScreen === 'PhotoSelection' && photoIndex !== undefined) {
      (
        navigation as NativeStackNavigationProp<CreateTaskStackParamList>
      ).navigate("PhotoSelection", {
        annotationResult: annotatedPhotoUri,
        photoIndex: photoIndex,
      });
    } else {
      // Fallback: just go back
      navigation.goBack();
    }
  };
  
  return (
    <PhotoAnnotationScreen
      photoUri={photoUri as string}
      onSave={handleSave}
      onCancel={() => navigation.goBack()}
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
  const { taskId, subTaskId, projectId: routeProjectId, companyId: routeCompanyId, userId: routeUserId, initialCompletionPercentage, initialPhotos, returnScreen, actionType, entityType, uploadImmediately, sourceScreen, sourceTaskId, sourceSubTaskId, selectedTaskId: routeSelectedTaskId, saveIntent: routeSaveIntent, originRouteName: originRouteNameParam } = route.params || {};
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
        navigateToCreateTaskRoute(
          navigation,
          buildPhotoShortcutCreateTaskParams({
            taskId: taskId as string,
            subTaskId,
            actionType: actionType as "update",
            sourceScreen,
            sourceTaskId: sourceTaskId || (taskId as string),
            sourceSubTaskId: sourceSubTaskId || subTaskId,
            uploadedPhotoUrls: photoUrls,
          }),
        );
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
      };
    });

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
      onNavigateBack={() => navigation.goBack()}
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

  return (
    <CreateTaskScreen
      onNavigateBack={() => navigation.goBack()}
      onCreateSuccess={handleCreateSuccess}
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
      editTaskId={editTaskId}
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
      <ProfileStackNavigator.Screen
        name="DeveloperSettings"
        component={DeveloperSettingsScreenWrapper}
      />
      <ProfileStackNavigator.Screen name="PendingUsers" component={PendingUsersScreenWrapper} />
    </ProfileStackNavigator.Navigator>
  );
}

function ProfileMainScreen({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, "ProfileMain">) {
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
      onNavigateToDeveloperSettings={() => navigation.navigate("DeveloperSettings")}
      onNavigateToPendingUsers={() => navigation.navigate("PendingUsers")}
      onNavigateToProfile={() => {}} // Already on profile screen
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
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
    />
  );
}

function DevAdminScreenWrapper({
  navigation,
}: NativeStackScreenProps<AdminDashboardStackParamList, "DevAdmin">) {
  return <DevAdminScreen onNavigateBack={() => navigation.goBack()} />;
}

// Create Task Stack
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
        name="PhotoAnnotation" 
        component={PhotoAnnotationScreenWrapper}
      />
    </CreateTaskStackNavigator.Navigator>
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
  const normalizeSelectedPhotos = (photos: unknown): CreateTaskParams["selectedPhotos"] => {
    if (!Array.isArray(photos)) {
      return undefined;
    }

    return photos.map((photo) => {
      const candidate = photo as SelectedPhoto;
      return {
        uri: candidate.uri,
        fileName: candidate.fileName,
        isAnnotated: Boolean(candidate.isAnnotated),
        annotatedUri: candidate.annotatedUri,
      };
    });
  };

  const rawParams = (route.params || {}) as CreateTaskParams;
  const params = resolveCreateTaskEntryParams(rawParams);
  const parentTaskId = params.parentTaskId;
  const parentSubTaskId = params.parentSubTaskId;
  const editTaskId = params.editTaskId;
  // Only default to 'edit' if editTaskId is provided, otherwise it's a new task
  const actionType = params.actionType || (editTaskId ? 'edit' : undefined);
  const cameraLaunchContext = params.cameraLaunchContext;
  const postCaptureDefault = params.postCaptureDefault;
  const updateTargetSubTaskId = params.updateTargetSubTaskId;
  const sourceTaskId = params.sourceTaskId; // TaskId from the source TaskDetail screen
  const sourceSubTaskId = params.sourceSubTaskId; // SubTaskId from the source TaskDetail screen
  const sourceScreen = params.sourceScreen; // 'dashboard' or 'tasks' to know which navigator to use
  const selectedPhotosFromParams = normalizeSelectedPhotos(params.selectedPhotos); // Photos selected from PhotoSelectionScreen
  const uploadedPhotoUrlsFromParams = params.uploadedPhotoUrls; // Uploaded URLs returned from PhotoSelectionScreen
  const clearForm = params.clearForm; // Flag to clear form when "Create New Task" is pressed
  const clearFormTimestamp = params._timestamp; // Timestamp to track when clearForm was set

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
      const currentSelectedPhotos = normalizeSelectedPhotos(currentParams.selectedPhotos);
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

  // Also listen for navigation focus to catch params that arrive late (already handled above)
  
  // Handle back navigation - if editing, navigate back to TaskDetail screen
  const handleNavigateBack = React.useCallback(() => {
    if (editTaskId && sourceScreen && sourceTaskId) {
      // Navigate back to the TaskDetail screen we came from
      const parentNav = navigation.getParent();
      if (parentNav) {
        if (sourceScreen === 'dashboard') {
          parentNav.navigate("Activity", {
            screen: "TaskDetailFromDashboard",
            params: { taskId: sourceTaskId, subTaskId: sourceSubTaskId }
          });
        } else if (sourceScreen === 'tasks') {
          // For TasksStack, we need to navigate to the Tasks tab first, then to TaskDetail
          parentNav.navigate("Tasks", {
            screen: "TaskDetail",
            params: { taskId: sourceTaskId, subTaskId: sourceSubTaskId }
          });
        } else {
          // Fallback to goBack
          navigation.goBack();
        }
      } else {
        navigation.goBack();
      }
    } else {
      // Not editing or no source info, use default goBack
      navigation.goBack();
    }
  }, [editTaskId, sourceScreen, sourceTaskId, sourceSubTaskId, navigation]);
  
  // Route to appropriate screen based on actionType
  // For now, all actions go through CreateTaskScreen which will handle them
  // In the future, we can create separate screens for each action type
  return (
    <CreateTaskScreen
      onNavigateBack={handleNavigateBack}
      onCreateSuccess={handleCreateSuccess}
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
      editTaskId={editTaskId}
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
      <AdminDashboardStackNavigator.Screen name="DevAdmin" component={DevAdminScreenWrapper} />
    </AdminDashboardStackNavigator.Navigator>
  );
}

function AdminDashboardMainScreen({
  navigation,
}: NativeStackScreenProps<AdminDashboardStackParamList, "AdminDashboardMain">) {
  return (
    <AdminDashboardScreen
      onNavigateToProjects={() => navigation.navigate("ProjectsList")}
      onNavigateToUserManagement={() => navigation.navigate("UserManagement")}
      onNavigateToProfile={() => navigateToRootProfile(navigation)}
      onNavigateToDevAdmin={() => navigation.navigate("DevAdmin")}
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
  const { user } = useAuthStore();
  const getUnreadTaskCount = useTaskStore(state => state.getUnreadTaskCount);
  
  // Get unread task count for badge
  const unreadCount = user ? getUnreadTaskCount(user.id) : 0;
  const badgeCount = unreadCount > 99 ? '99+' : (unreadCount > 0 ? unreadCount : undefined);
  
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
      {!isAdmin(user) && (
        <Tab.Screen
          name="Activity"
          component={DashboardStack}
          options={({ route }) => ({
            tabBarLabel: "Activity",
            tabBarButton: (props) => (
              <RootTabButton
                {...props}
                testID="root-tab__activity"
                alignTowardsCamera="right"
              />
            ),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sparkles-outline" size={size} color={color} />
            ),
            tabBarBadge: badgeCount,
            tabBarBadgeStyle: { backgroundColor: '#ef4444', color: 'white', fontSize: 10 },
            tabBarStyle: buildRootTabBarStyleForRoute(getFocusedRouteNameFromRoute(route)),
          })}
        />
      )}
      {isAdmin(user) ? (
        <Tab.Screen
          name="AdminDashboard"
          component={AdminDashboardStack}
          options={{
            tabBarLabel: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="apps-outline" size={size} color={color} />
            ),
          }}
        />
      ) : null}
      {!isAdmin(user) && (
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
                  navigate: (screen, params) => navigation.navigate(screen, params),
                },
              });
            },
          })}
          options={({ route }) => ({
            tabBarLabel: "Camera",
            tabBarActiveTintColor: "#ffffff",
            tabBarInactiveTintColor: "#ffffff",
            tabBarButton: (props) => (
              <CenterCameraTabButton
                {...props}
                icon={
                  <Ionicons
                    testID="root-tab__camera_icon"
                    name="camera"
                    size={28}
                    color="#ffffff"
                  />
                }
              />
            ),
            tabBarStyle: buildRootTabBarStyleForRoute(
              getFocusedRouteNameFromRoute(route),
              "CreateTaskMain",
            ),
          })}
        />
      )}
      {!isAdmin(user) && (
        <Tab.Screen
          name="Tasks"
          component={TasksStack}
          options={({ route }) => ({
            tabBarLabel: "Tasks",
            tabBarButton: (props) => (
              <RootTabButton
                {...props}
                testID="root-tab__tasks"
                alignTowardsCamera="left"
              />
            ),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list-outline" size={size} color={color} />
            ),
            tabBarStyle: buildRootTabBarStyleForRoute(getFocusedRouteNameFromRoute(route)),
          })}
        />
      )}
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

    void initializeWorkspaceProject(currentUserId);
  }, [currentUserId, initializeWorkspaceProject, isAuthenticated]);

  if (!hasWorkspaceReadyForCurrentUser) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthScreens />;
  }

  return (
    <WorkspaceBootstrapGate>
      <NavigationContainer linking={appLinking}>
        <DataRefreshManager />
        <NetworkSyncManager />
        <RealtimeSyncManager />
        <AppRootStack />
      </NavigationContainer>
    </WorkspaceBootstrapGate>
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
    alignItems: "center",
    alignSelf: "stretch",
    flex: 1,
    justifyContent: "center",
  },
  centerCameraTabButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#dc2626",
    borderColor: "#ffffff",
    borderRadius: 32,
    borderWidth: 4,
    elevation: 8,
    height: 64,
    justifyContent: "center",
    minWidth: 64,
    shadowColor: "#7f1d1d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    top: ROOT_TAB_CAMERA_TOP_OFFSET,
    width: 64,
  },
  centerCameraTabButtonFocused: {
    backgroundColor: "#b91c1c",
  },
  centerCameraTabIconSurface: {
    alignItems: "center",
    justifyContent: "center",
  },
});
