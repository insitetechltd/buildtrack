import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import {
  createBottomTabNavigator,
  type BottomTabNavigationProp,
} from "@react-navigation/bottom-tabs";
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useAuthStore } from "../state/authStore";
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
import ReportsScreen from "../screens/ReportsScreen";
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
  shouldReturnToCreateTaskShortcut,
} from "./photoShortcutRoutes";
import { buildCreateTaskPhotoReturnParams } from "./createTaskRouteParams";

import type {
  AdminDashboardStackParamList,
  CreateTaskParams,
  CreateTaskStackParamList,
  DashboardStackParamList,
  PhotoAnnotationParams,
  PhotoSelectionParams,
  PhotoViewerParams,
  ProfileStackParamList,
  ReportsStackParamList,
  RootTabParamList,
  SelectedPhoto,
  TasksStackParamList,
  UpdateProgressParams,
} from "./navigationTypes";

const Tab = createBottomTabNavigator<RootTabParamList>();
const DashboardStackNavigator = createNativeStackNavigator<DashboardStackParamList>();
const TasksStackNavigator = createNativeStackNavigator<TasksStackParamList>();
const ProfileStackNavigator = createNativeStackNavigator<ProfileStackParamList>();
const ReportsStackNavigator = createNativeStackNavigator<ReportsStackParamList>();
const CreateTaskStackNavigator = createNativeStackNavigator<CreateTaskStackParamList>();
const AdminDashboardStackNavigator = createNativeStackNavigator<AdminDashboardStackParamList>();

type RouteStateLike = { routeNames?: string[] };
type RootTabLikeNavigation = Pick<
  BottomTabNavigationProp<RootTabParamList>,
  "navigate"
>;

type ProjectPickerNavigation = {
  navigate:
    | NativeStackNavigationProp<DashboardStackParamList>["navigate"]
    | NativeStackNavigationProp<TasksStackParamList>["navigate"];
  getParent?: () => RootTabLikeNavigation | undefined;
  getState?: () => RouteStateLike;
};

type CreateTaskRouteNavigation = {
  navigate:
    | NativeStackNavigationProp<DashboardStackParamList>["navigate"]
    | NativeStackNavigationProp<TasksStackParamList>["navigate"]
    | NativeStackNavigationProp<CreateTaskStackParamList>["navigate"];
  getParent?: () => RootTabLikeNavigation | undefined;
  getState?: () => RouteStateLike;
};

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

  const parentNav = navigation.getParent?.();
  if (parentNav) {
    parentNav.navigate("Dashboard", {
      screen: "ProjectPicker",
      params: { allowBack },
    });
    return;
  }

  (
    navigation as NativeStackNavigationProp<DashboardStackParamList>
  ).navigate("ProjectPicker", { allowBack });
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

  const parentNav = navigation.getParent?.();
  if (parentNav) {
    parentNav.navigate("CreateTask", {
      screen: "CreateTaskMain",
      params,
    });
  }
}



// Auth screens component
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
    <DashboardStackNavigator.Navigator 
      screenOptions={{ 
        headerShown: false,
        presentation: "card"
      }}
    >
      <DashboardStackNavigator.Screen name="DashboardMain" component={DashboardMainScreen} />
      <DashboardStackNavigator.Screen 
        name="TaskDetailFromDashboard" 
        component={TaskDetailFromDashboardWrapper}
        options={{
          presentation: "card"
        }}
      />
      <DashboardStackNavigator.Screen 
        name="ProjectPicker" 
        component={ProjectPickerScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <DashboardStackNavigator.Screen 
        name="UpdateProgress" 
        component={UpdateProgressScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <DashboardStackNavigator.Screen 
        name="AddComment" 
        component={AddCommentScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <DashboardStackNavigator.Screen 
        name="RejectTask" 
        component={RejectTaskScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <DashboardStackNavigator.Screen 
        name="ReassignTask" 
        component={ReassignTaskScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <DashboardStackNavigator.Screen 
        name="CreateTask" 
        component={CreateTaskScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <DashboardStackNavigator.Screen 
        name="PhotoSelection" 
        component={PhotoSelectionScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <DashboardStackNavigator.Screen 
        name="PhotoViewer" 
        component={PhotoViewerScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <DashboardStackNavigator.Screen 
        name="PhotoAnnotation" 
        component={PhotoAnnotationScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
    </DashboardStackNavigator.Navigator>
  );
}

function DashboardMainScreen({
  navigation,
}: NativeStackScreenProps<DashboardStackParamList, "DashboardMain">) {
  return (
    <DashboardRoute
      onNavigateToTasks={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Tasks",
        )
      }
      onNavigateToCreateTask={() => {
        const parentNav = navigation.getParent?.() as
          | BottomTabNavigationProp<RootTabParamList>
          | undefined;
        if (parentNav) {
          parentNav.navigate("CreateTask", {
            screen: "CreateTaskMain",
            params: {
              parentTaskId: undefined,
              parentSubTaskId: undefined,
              editTaskId: undefined,
              actionType: undefined,
              clearForm: true,
              _timestamp: Date.now(),
            },
          });
        }
      }}
      onNavigateToProfile={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Profile",
        )
      }
      onNavigateToDeveloperSettings={() => {
        const parentNav = navigation.getParent?.() as
          | BottomTabNavigationProp<RootTabParamList>
          | undefined;
        if (parentNav) {
          parentNav.navigate("Profile", { screen: "DeveloperSettings" });
        }
      }}
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
      onNavigateToProfile={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Profile",
        )
      }
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
      onNavigateBack={() => {
        // Always navigate to Tasks list, not just go back
        const parentNav = navigation.getParent();
        if (parentNav) {
          parentNav.navigate("Tasks");
        } else {
          navigation.goBack();
        }
      }}
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
      onNavigateToProfile={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Profile",
        )
      }
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
  );
}

// Tasks Stack Navigator to include Task Detail screen and Create Task
function TasksStack() {
  return (
    <TasksStackNavigator.Navigator 
      screenOptions={{ 
        headerShown: false,
        presentation: "card"
      }}
    >
      <TasksStackNavigator.Screen name="TasksList" component={ProjectsTasksListScreen} />
      <TasksStackNavigator.Screen 
        name="TaskDetail" 
        component={TaskDetailScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <TasksStackNavigator.Screen 
        name="CreateTaskFromTask" 
        component={CreateTaskFromTaskWrapper}
        options={{
          presentation: "card"
        }}
      />
      <TasksStackNavigator.Screen 
        name="PhotoViewer" 
        component={PhotoViewerScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <TasksStackNavigator.Screen 
        name="PhotoAnnotation" 
        component={PhotoAnnotationScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <TasksStackNavigator.Screen 
        name="PhotoSelection" 
        component={PhotoSelectionScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <TasksStackNavigator.Screen 
        name="UpdateProgress" 
        component={UpdateProgressScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <TasksStackNavigator.Screen 
        name="AddComment" 
        component={AddCommentScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <TasksStackNavigator.Screen 
        name="RejectTask" 
        component={RejectTaskScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <TasksStackNavigator.Screen 
        name="ReassignTask" 
        component={ReassignTaskScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <TasksStackNavigator.Screen 
        name="CreateTask" 
        component={CreateTaskScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
    </TasksStackNavigator.Navigator>
  );
}

function ProjectsTasksListScreen({
  navigation,
}: NativeStackScreenProps<TasksStackParamList, "TasksList">) {
  return (
    <TasksRoute
      onNavigateToTaskDetail={(taskId: string, subTaskId?: string) => {
        navigation.navigate("TaskDetail", { taskId, subTaskId });
      }}
      onNavigateToCreateTask={() => {
        const parentNav = navigation.getParent?.() as
          | BottomTabNavigationProp<RootTabParamList>
          | undefined;
        if (parentNav) {
          parentNav.navigate("CreateTask", {
            screen: "CreateTaskMain",
            params: {
              parentTaskId: undefined,
              parentSubTaskId: undefined,
              editTaskId: undefined,
              actionType: undefined,
              clearForm: true,
              _timestamp: Date.now(),
            },
          });
        }
      }}
      onNavigateBack={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Dashboard",
        )
      }
      onNavigateToProfile={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Profile",
        )
      }
      onNavigateToDeveloperSettings={() => {
        const parentNav = navigation.getParent?.() as
          | BottomTabNavigationProp<RootTabParamList>
          | undefined;
        if (parentNav) {
          parentNav.navigate("Profile", { screen: "DeveloperSettings" });
        }
      }}
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
      onNavigateBack={() => {
        // Always navigate to TasksList, not just go back
        navigation.navigate("TasksList");
      }}
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
      onNavigateToProfile={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Profile",
        )
      }
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
  return (
    <CreateTaskScreen
      onNavigateBack={() => navigation.goBack()}
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
    if (returnScreen === "PhotoSelection" && photoIndex !== undefined) {
      (
        navigation as NativeStackNavigationProp<CreateTaskStackParamList>
      ).navigate("PhotoSelection", {
        annotationResult: annotatedPhotoUri,
        photoIndex,
      });
      return;
    }

    navigation.goBack();
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
  const params = (route.params || {}) as PhotoSelectionParams;
  const {
    taskId,
    subTaskId,
    companyId,
    userId,
    initialCompletionPercentage,
    initialPhotos,
    returnScreen,
    actionType,
    entityType,
    uploadImmediately,
    sourceScreen,
    sourceTaskId,
    sourceSubTaskId,
  } = params;
  const uploadedUrlsRef = React.useRef<string[] | null>(null);
  
  const effectiveUploadImmediately =
    uploadImmediately !== undefined
      ? uploadImmediately
      : returnScreen === "UpdateProgress" || returnScreen === "CreateTask"
        ? false
        : true;
  
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
    if (returnScreen === "CreateTask") {
      navigation.goBack();

      setTimeout(() => {
        navigateToCreateTaskRoute(
          navigation,
          buildCreateTaskPhotoReturnParams({
            routeParams: params as unknown as CreateTaskParams,
            uploadedPhotoUrls: photoUrls,
          }),
        );
      }, 150);
    } else if (
      (returnScreen === "UpdateProgress" || returnScreen === "AddComment") &&
      actionType
    ) {
      navigation.goBack();

      setTimeout(() => {
        navigateToCreateTaskRoute(
          navigation,
          buildPhotoShortcutCreateTaskParams({
            taskId: taskId as string,
            subTaskId,
            actionType: actionType as "update",
            uploadedPhotoUrls: photoUrls,
          }),
        );
      }, 150);
    } else if (returnScreen === "UpdateProgress" || returnScreen === "AddComment") {
      const updateProgressNavigation =
        navigation as NativeStackNavigationProp<
          DashboardStackParamList | TasksStackParamList
        >;

      updateProgressNavigation.navigate("UpdateProgress", {
        taskId: taskId as string,
        subTaskId,
        initialCompletionPercentage,
        uploadedPhotoUrls: photoUrls,
        actionType,
        sourceScreen,
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
        uploadedPhotoUrls: photoUrls,
        sourceScreen,
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

    if (returnScreen === "CreateTask") {
      const navParams = buildCreateTaskPhotoReturnParams({
        routeParams: params as unknown as CreateTaskParams,
        selectedPhotos: normalizedPhotos,
      });

      navigateToCreateTaskRoute(navigation, navParams);
    } else if (returnScreen === "UpdateProgress") {
      if (shouldReturnToCreateTaskShortcut({ returnScreen, actionType })) {
        navigation.goBack();

        setTimeout(() => {
          navigateToCreateTaskRoute(
            navigation,
            buildPhotoShortcutCreateTaskParams({
              taskId: taskId as string,
              subTaskId,
              actionType: "update",
              selectedPhotos: normalizedPhotos,
            }),
          );
        }, 150);
        return;
      }

      navigation.goBack();
      
      setTimeout(() => {
        const updateProgressNavigation =
          navigation as NativeStackNavigationProp<
            DashboardStackParamList | TasksStackParamList
          >;

        updateProgressNavigation.navigate("UpdateProgress", {
          taskId: taskId as string,
          subTaskId,
          initialCompletionPercentage,
          selectedPhotos: normalizedPhotos,
          sourceScreen,
          sourceTaskId: sourceTaskId || (taskId as string),
          sourceSubTaskId: sourceSubTaskId || subTaskId,
        });
      }, 150);
    } else {
      navigation.goBack();
    }
  };
  
  return (
    <PhotoSelectionScreen
      taskId={taskId as string}
      subTaskId={subTaskId}
      companyId={companyId as string}
      userId={userId as string}
      initialCompletionPercentage={initialCompletionPercentage || 0}
      initialPhotos={initialPhotos}
      entityType={entityType}
      uploadImmediately={effectiveUploadImmediately}
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
      onPhotosSelected={(() => {
        const shouldUsePhotosSelected =
          (returnScreen === "CreateTask" || returnScreen === "UpdateProgress") &&
          effectiveUploadImmediately === false;
        if (shouldUsePhotosSelected) {
          return handlePhotosSelected;
        }
        return undefined;
      })()}
    />
  );
}

// WRAPPER: CreateTaskScreenWrapper
// USED WHEN: Navigating directly to CreateTaskScreen (not through CreateTaskMain)
// PURPOSE: Extracts route.params and passes them as props to CreateTaskScreen
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
    updateTargetSubTaskId,
    uploadedPhotoUrls,
    selectedPhotos,
  } = route.params || {};
  return (
    <CreateTaskScreen
      onNavigateBack={() => navigation.goBack()}
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
      editTaskId={editTaskId}
      actionType={actionType}
      updateTargetSubTaskId={updateTargetSubTaskId}
      uploadedPhotoUrls={uploadedPhotoUrls as string[] | undefined}
      selectedPhotos={selectedPhotos}
      onClearDraftPayloads={() => {
        navigation.setParams({
          selectedPhotos: undefined,
          uploadedPhotoUrls: undefined,
        });
      }}
      onNavigateToProfile={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Profile",
        )
      }
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
  const params = route.params;
  const uploadedPhotoUrls = params?.uploadedPhotoUrls;
  const selectedPhotos = params?.selectedPhotos;

  return (
    <UpdateProgressScreen 
      uploadedPhotoUrls={uploadedPhotoUrls}
      selectedPhotos={selectedPhotos}
      onNavigateToProfile={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Profile",
        )
      }
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
      onNavigateToProfile={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Profile",
        )
      }
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
      onNavigateToProfile={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Profile",
        )
      }
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
      onNavigateToProfile={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Profile",
        )
      }
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
  );
}

// Profile Stack
function ProfileStack() {
  return (
    <ProfileStackNavigator.Navigator screenOptions={{ headerShown: false }}>
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
        const parentNav = navigation.getParent?.() as
          | BottomTabNavigationProp<RootTabParamList>
          | undefined;
        if (parentNav) {
          parentNav.navigate("CreateTask", {
            screen: "CreateTaskMain",
            params: {
              parentTaskId: undefined,
              parentSubTaskId: undefined,
              editTaskId: undefined,
              actionType: undefined,
              clearForm: true,
              _timestamp: Date.now(),
            },
          });
        }
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
    />
  );
}

function DevAdminScreenWrapper({
  navigation,
}: NativeStackScreenProps<AdminDashboardStackParamList, "DevAdmin">) {
  return <DevAdminScreen onNavigateBack={() => navigation.goBack()} />;
}

// Reports Stack
function ReportsStack() {
  return (
    <ReportsStackNavigator.Navigator screenOptions={{ headerShown: false }}>
      <ReportsStackNavigator.Screen name="ReportsMain" component={ReportsMainScreen} />
    </ReportsStackNavigator.Navigator>
  );
}

function ReportsMainScreen({
  navigation,
}: NativeStackScreenProps<ReportsStackParamList, "ReportsMain">) {
  return (
    <ReportsScreen
      onNavigateBack={() => navigation.goBack()}
    />
  );
}

// Create Task Stack
function CreateTaskStack() {
  return (
    <CreateTaskStackNavigator.Navigator screenOptions={{ headerShown: false }}>
      <CreateTaskStackNavigator.Screen name="CreateTaskMain" component={CreateTaskMainScreen} />
      <CreateTaskStackNavigator.Screen 
        name="PhotoSelection" 
        component={PhotoSelectionScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <CreateTaskStackNavigator.Screen 
        name="PhotoViewer" 
        component={PhotoViewerScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <CreateTaskStackNavigator.Screen 
        name="PhotoAnnotation" 
        component={PhotoAnnotationScreenWrapper}
        options={{
          presentation: "card"
        }}
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
  const [selectedPhotosState, setSelectedPhotosState] = React.useState<CreateTaskParams["selectedPhotos"]>(
    undefined,
  );
  const [uploadedPhotoUrlsState, setUploadedPhotoUrlsState] = React.useState<string[] | undefined>(undefined);

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

  const params = (route.params || {}) as CreateTaskParams;
  const parentTaskId = params.parentTaskId;
  const parentSubTaskId = params.parentSubTaskId;
  const editTaskId = params.editTaskId;
  const actionType = params.actionType || (editTaskId ? "edit" : undefined);
  const updateTargetSubTaskId = params.updateTargetSubTaskId;
  const sourceTaskId = params.sourceTaskId;
  const sourceSubTaskId = params.sourceSubTaskId;
  const sourceScreen = params.sourceScreen;
  const selectedPhotosFromParams = normalizeSelectedPhotos(params.selectedPhotos);
  const uploadedPhotoUrlsFromParams = params.uploadedPhotoUrls;
  const clearForm = params.clearForm;
  const clearFormTimestamp = params._timestamp;

  React.useEffect(() => {
    if (
      selectedPhotosFromParams &&
      Array.isArray(selectedPhotosFromParams) &&
      selectedPhotosFromParams.length > 0
    ) {
      setSelectedPhotosState(selectedPhotosFromParams);
      navigation.setParams({ selectedPhotos: undefined });
    }
  }, [navigation, selectedPhotosFromParams]);

  React.useEffect(() => {
    if (
      uploadedPhotoUrlsFromParams &&
      Array.isArray(uploadedPhotoUrlsFromParams) &&
      uploadedPhotoUrlsFromParams.length > 0
    ) {
      setUploadedPhotoUrlsState(uploadedPhotoUrlsFromParams);
      navigation.setParams({ uploadedPhotoUrls: undefined });
    }
  }, [navigation, uploadedPhotoUrlsFromParams]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      const currentParams = (route.params || {}) as CreateTaskParams;
      const currentSelectedPhotos = normalizeSelectedPhotos(currentParams.selectedPhotos);
      const currentUploadedPhotoUrls = currentParams.uploadedPhotoUrls;
      if (currentSelectedPhotos && currentSelectedPhotos.length > 0) {
        setSelectedPhotosState(currentSelectedPhotos);
        navigation.setParams({ selectedPhotos: undefined });
      }
      if (currentUploadedPhotoUrls && currentUploadedPhotoUrls.length > 0) {
        setUploadedPhotoUrlsState(currentUploadedPhotoUrls);
        navigation.setParams({ uploadedPhotoUrls: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, route.params]);

  const selectedPhotos = selectedPhotosState || selectedPhotosFromParams;
  const uploadedPhotoUrls = uploadedPhotoUrlsState || uploadedPhotoUrlsFromParams;

  const handleNavigateBack = React.useCallback(() => {
    if (editTaskId && sourceScreen && sourceTaskId) {
      const parentNav = navigation.getParent?.() as
        | BottomTabNavigationProp<RootTabParamList>
        | undefined;

      if (parentNav) {
        if (sourceScreen === "dashboard") {
          parentNav.navigate("Dashboard", {
            screen: "TaskDetailFromDashboard",
            params: { taskId: sourceTaskId, subTaskId: sourceSubTaskId },
          });
          return;
        }

        if (sourceScreen === "tasks") {
          parentNav.navigate("Tasks", {
            screen: "TaskDetail",
            params: { taskId: sourceTaskId, subTaskId: sourceSubTaskId },
          });
          return;
        }
      }
    }

    navigation.goBack();
  }, [editTaskId, navigation, sourceScreen, sourceSubTaskId, sourceTaskId]);

  return (
    <CreateTaskScreen
      onNavigateBack={handleNavigateBack}
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
      editTaskId={editTaskId}
      actionType={actionType}
      updateTargetSubTaskId={updateTargetSubTaskId}
      selectedPhotos={selectedPhotos}
      uploadedPhotoUrls={uploadedPhotoUrls}
      onClearDraftPayloads={() => {
        setSelectedPhotosState(undefined);
        setUploadedPhotoUrlsState(undefined);
        navigation.setParams({
          selectedPhotos: undefined,
          uploadedPhotoUrls: undefined,
        });
      }}
      clearForm={clearForm}
      clearFormTimestamp={clearFormTimestamp}
      onNavigateToProfile={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Profile",
        )
      }
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigateToProjectPicker(navigation, allowBack);
      }}
    />
  );
}

// Admin Dashboard Stack
function AdminDashboardStack() {
  return (
    <AdminDashboardStackNavigator.Navigator screenOptions={{ headerShown: false }}>
      <AdminDashboardStackNavigator.Screen
        name="AdminDashboardMain"
        component={AdminDashboardMainScreen}
      />
      <AdminDashboardStackNavigator.Screen name="ProjectsList" component={ProjectsListScreen} />
      <AdminDashboardStackNavigator.Screen
        name="ProjectDetail"
        component={ProjectDetailScreenWrapper}
      />
      <AdminDashboardStackNavigator.Screen
        name="CreateProject"
        component={CreateProjectMainScreen}
      />
      <AdminDashboardStackNavigator.Screen
        name="UserManagement"
        component={UserManagementMainScreen}
      />
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
      onNavigateToProfile={() =>
        (navigation.getParent?.() as BottomTabNavigationProp<RootTabParamList> | undefined)?.navigate(
          "Profile",
        )
      }
      onNavigateToDevAdmin={() => navigation.navigate("DevAdmin")}
    />
  );
}

// Projects Stack (Admin Only) - Kept for backwards compatibility
function ProjectsStack() {
  return (
    <AdminDashboardStackNavigator.Navigator screenOptions={{ headerShown: false }}>
      <AdminDashboardStackNavigator.Screen name="ProjectsList" component={ProjectsListScreen} />
      <AdminDashboardStackNavigator.Screen
        name="ProjectDetail"
        component={ProjectDetailScreenWrapper}
      />
      <AdminDashboardStackNavigator.Screen
        name="CreateProject"
        component={CreateProjectMainScreen}
      />
      <AdminDashboardStackNavigator.Screen
        name="UserManagement"
        component={UserManagementMainScreen}
      />
    </AdminDashboardStackNavigator.Navigator>
  );
}

// Projects Stack for Non-Admin Users
function UserProjectsStack() {
  return (
    <AdminDashboardStackNavigator.Navigator screenOptions={{ headerShown: false }}>
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
        navigation.navigate("ProjectsList", { newProjectId: projectId });
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
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          display: 'none',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          textAlign: "center",
        },
        tabBarIconStyle: {
          justifyContent: "center",
          alignItems: "center",
        },
      }}
    >
      {!isAdmin(user) && (
        <Tab.Screen
          name="Dashboard"
          component={DashboardStack}
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="hammer-outline" size={size} color={color} />
            ),
            tabBarBadge: badgeCount,
            tabBarBadgeStyle: { backgroundColor: '#ef4444', color: 'white', fontSize: 10 },
            tabBarItemStyle: {
              maxWidth: 100,
              marginRight: 'auto',
            },
          }}
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
          name="CreateTask"
          component={CreateTaskStack}
          options={{
            tabBarLabel: "New",
            tabBarIcon: ({ focused }) => (
              <View style={{ marginTop: -5 }}>
                <Ionicons 
                  name="add-circle" 
                  size={32} 
                  color="#f97316" 
                />
              </View>
            ),
            tabBarItemStyle: {
              maxWidth: 100,
            },
          }}
        />
      )}
      {!isAdmin(user) && (
        <Tab.Screen
          name="Reports"
          component={ReportsStack}
          options={{
            tabBarLabel: "Reports",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
            tabBarItemStyle: {
              maxWidth: 100,
              marginLeft: 'auto',
            },
          }}
        />
      )}
      {/* Profile Screen - Hidden from tab bar but accessible via navigation */}
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      {/* Tasks Screen - Hidden from tab bar but accessible via navigation */}
      {!isAdmin(user) && (
        <Tab.Screen
          name="Tasks"
          component={TasksStack}
          options={{
            tabBarButton: () => null, // Hide from tab bar
          }}
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

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthScreens />;
  }

  return (
    <NavigationContainer>
      <DataRefreshManager />
      <NetworkSyncManager />
      <RealtimeSyncManager />
      <MainTabs />
    </NavigationContainer>
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
});
