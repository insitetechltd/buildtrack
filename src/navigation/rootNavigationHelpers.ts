import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type {
  CreateTaskParams,
  CreateTaskStackParamList,
  DashboardStackParamList,
  ProfileStackParamList,
  RootStackParamList,
  RootTabParamList,
  TasksStackParamList,
} from "./navigationTypes";
import { rootNavigationRef } from "./rootNavigationRef";

export type RouteStateLike = {
  index?: number;
  routeNames?: string[];
  routes?: Array<{ key: string; name?: string }>;
};

export type RootTabLikeNavigation = {
  navigate: (...args: unknown[]) => void;
};

export type RootStackLikeNavigation = Pick<
  NativeStackNavigationProp<RootStackParamList>,
  "navigate"
>;

export type ParentNavigationLike = {
  getParent?: () => ParentNavigationLike | undefined;
  getState?: () => RouteStateLike;
  navigate?: (...args: unknown[]) => void;
};

export type ProjectPickerNavigation = {
  navigate:
    | NativeStackNavigationProp<DashboardStackParamList>["navigate"]
    | NativeStackNavigationProp<TasksStackParamList>["navigate"];
  getParent?: () => ParentNavigationLike | undefined;
  getState?: () => RouteStateLike;
};

export type CreateTaskRouteNavigation = {
  navigate:
    | NativeStackNavigationProp<DashboardStackParamList>["navigate"]
    | NativeStackNavigationProp<TasksStackParamList>["navigate"]
    | NativeStackNavigationProp<CreateTaskStackParamList>["navigate"];
  canGoBack?: () => boolean;
  dispatch?: (action: any) => void;
  getParent?: () => ParentNavigationLike | undefined;
  goBack: () => void;
  getState?: () => RouteStateLike;
  setParams?: (params: CreateTaskParams) => void;
};

export type DashboardTaskDetailBackNavigation = Pick<
  NativeStackNavigationProp<DashboardStackParamList>,
  "canGoBack" | "getParent" | "getState" | "goBack" | "pop"
>;

export type TasksTaskDetailBackNavigation = Pick<
  NativeStackNavigationProp<TasksStackParamList>,
  "canGoBack" | "getState" | "goBack" | "navigate" | "pop"
>;

export type StackBackNavigation = {
  canGoBack: () => boolean;
  getState?: () => RouteStateLike;
  goBack: () => void;
  pop: (count?: number) => void;
};

export function hasCurrentStackHistory(state?: RouteStateLike) {
  if (!state) {
    return false;
  }

  if (typeof state.index === "number") {
    return state.index > 0;
  }

  return Array.isArray(state.routes) && state.routes.length > 1;
}

export function popCurrentStack(navigation: StackBackNavigation) {
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

/** Walk parent chain so avatar menu works from nested Profile → Company Admin. */
function findAncestorNavigation(
  navigation: { getParent?: () => ParentNavigationLike | undefined } | undefined,
  routeNames: string[],
  maxDepth = 6,
): ParentNavigationLike | undefined {
  let current: ParentNavigationLike | undefined = navigation?.getParent?.();
  for (let depth = 0; depth < maxDepth && current; depth += 1) {
    if (hasAnyRoute(current, routeNames)) {
      return current;
    }
    current = current.getParent?.();
  }
  return undefined;
}

export function getRootTabsNavigation(navigation: {
  getParent?: () => ParentNavigationLike | undefined;
}) {
  const tabsNav = findAncestorNavigation(navigation, [
    "Activity",
    "Camera",
    "Tasks",
    "AdminDashboard",
  ]);
  if (tabsNav) {
    return tabsNav as RootTabLikeNavigation;
  }

  return undefined;
}

export function getRootStackNavigation(navigation: {
  getParent?: () => ParentNavigationLike | undefined;
}) {
  const stackNav = findAncestorNavigation(navigation, ["MainTabs", "Profile"]);
  if (stackNav) {
    return stackNav as RootStackLikeNavigation;
  }

  return undefined;
}

/** Profile stack sits under Root → Profile; used when already inside Company Admin. */
export function getProfileStackNavigation(navigation: {
  getParent?: () => ParentNavigationLike | undefined;
}) {
  return findAncestorNavigation(navigation, [
    "ProfileMain",
    "CompanyManagement",
    "DeveloperSettings",
  ]);
}

export function navigateToRootProfile(
  navigation: { getParent?: () => ParentNavigationLike | undefined },
  screen: keyof ProfileStackParamList = "ProfileMain",
) {
  // Prefer container ref — parent walk alone can leave nested CompanyManagement focused.
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate("Profile", { screen });
    return;
  }

  const profileStack = getProfileStackNavigation(navigation);
  if (profileStack?.navigate) {
    profileStack.navigate(screen as never);
    return;
  }

  const rootNav = getRootStackNavigation(navigation);
  if (rootNav) {
    rootNav.navigate("Profile", { screen });
  }
}

export function navigateToCompanyManagement(
  navigation: { getParent?: () => ParentNavigationLike | undefined },
) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate("Profile", {
      screen: "CompanyManagement",
      params: { screen: "AdminDashboardMain" },
    });
    return;
  }

  const rootNav = getRootStackNavigation(navigation);
  if (rootNav) {
    rootNav.navigate("Profile", {
      screen: "CompanyManagement",
      params: { screen: "AdminDashboardMain" },
    });
  }
}

export function navigateToCompanyManagementFromRoot() {
  if (!rootNavigationRef.isReady()) {
    return false;
  }

  rootNavigationRef.navigate("Profile", {
    screen: "CompanyManagement",
    params: { screen: "AdminDashboardMain" },
  });
  return true;
}

/** Field Site Activity / task dashboard (MainTabs → Activity). */
export function navigateToTaskDashboard(
  navigation: { getParent?: () => ParentNavigationLike | undefined },
) {
  navigateToRootTabScreen(navigation, "Activity");
}

export function navigateToTaskDashboardFromRoot() {
  if (!rootNavigationRef.isReady()) {
    return false;
  }

  rootNavigationRef.navigate("MainTabs", { screen: "Activity" });
  return true;
}

export function navigateToRootTabScreen<T extends keyof RootTabParamList>(
  navigation: { getParent?: () => ParentNavigationLike | undefined },
  screen: T,
  params?: RootTabParamList[T],
) {
  // From Company Admin (Profile stack), tabs are not ancestors — use root ref first.
  if (rootNavigationRef.isReady()) {
    if (params === undefined) {
      rootNavigationRef.navigate("MainTabs", { screen } as never);
      return;
    }
    rootNavigationRef.navigate("MainTabs", { screen, params } as never);
    return;
  }

  const tabsNav = getRootTabsNavigation(navigation);
  if (tabsNav) {
    tabsNav.navigate(screen as never, params as never);
    return;
  }

  const rootNav = getRootStackNavigation(navigation);
  if (rootNav) {
    if (params === undefined) {
      rootNav.navigate("MainTabs", { screen } as RootStackParamList["MainTabs"]);
      return;
    }
    rootNav.navigate("MainTabs", {
      screen,
      params,
    } as RootStackParamList["MainTabs"]);
  }
}

export function navigateToProjectPicker(
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

export function navigateToCreateTaskRoute(
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
