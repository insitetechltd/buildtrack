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

export function getRootTabsNavigation(navigation: {
  getParent?: () => ParentNavigationLike | undefined;
}) {
  const parentNav = navigation.getParent?.();
  if (hasAnyRoute(parentNav, ["Activity", "Camera", "Tasks", "AdminDashboard"])) {
    return parentNav as RootTabLikeNavigation;
  }

  const grandParentNav = parentNav?.getParent?.();
  if (hasAnyRoute(grandParentNav, ["Activity", "Camera", "Tasks", "AdminDashboard"])) {
    return grandParentNav as RootTabLikeNavigation;
  }

  return undefined;
}

export function getRootStackNavigation(navigation: {
  getParent?: () => ParentNavigationLike | undefined;
}) {
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

export function navigateToRootProfile(
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

export function navigateToRootTabScreen<T extends keyof RootTabParamList>(
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
