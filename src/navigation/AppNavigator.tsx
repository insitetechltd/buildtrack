import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useAuthStore } from "../state/authStore";
import { isAdmin } from "../types/buildtrack";
import { useTaskStore } from "../state/taskStore.supabase";
import { DataRefreshManager } from "../utils/DataRefreshManager";
import { NetworkSyncManager } from "../utils/NetworkSyncManager";
import { RealtimeSyncManager } from "../utils/RealtimeSyncManager";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import TasksScreen from "../screens/TasksScreen";
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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();



// Auth screens component
function AuthScreens() {
  const [showRegister, setShowRegister] = useState(false);

  if (showRegister) {
    return (
      <RegisterScreen 
        onToggleLogin={() => setShowRegister(false)} 
      />
    );
  }

  return (
    <LoginScreen 
      onToggleRegister={() => setShowRegister(true)} 
    />
  );
}

// Dashboard Stack to handle navigation to other screens
function DashboardStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        presentation: "card"
      }}
    >
      <Stack.Screen name="DashboardMain" component={DashboardMainScreen} />
      <Stack.Screen 
        name="TaskDetailFromDashboard" 
        component={TaskDetailFromDashboardWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="ProjectPicker" 
        component={ProjectPickerScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="UpdateProgress" 
        component={UpdateProgressScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="AddComment" 
        component={AddCommentScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="RejectTask" 
        component={RejectTaskScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="ReassignTask" 
        component={ReassignTaskScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="CreateTask" 
        component={CreateTaskScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
    </Stack.Navigator>
  );
}

function DashboardMainScreen({ navigation }: { navigation: any }) {
  return (
    <DashboardScreen
      onNavigateToTasks={() => navigation.getParent()?.navigate("Tasks")}
      onNavigateToCreateTask={() => navigation.getParent()?.navigate("CreateTask", {
        screen: "CreateTaskMain",
        params: {
          parentTaskId: undefined,
          parentSubTaskId: undefined,
          editTaskId: undefined,
          actionType: undefined,
        }
      })}
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToTaskDetail={(taskId: string, subTaskId?: string) => 
        navigation.navigate("TaskDetailFromDashboard", { taskId, subTaskId })
      }
      onNavigateToProjectPicker={(allowBack: boolean = true) => 
        navigation.navigate("ProjectPicker", { allowBack })
      }
    />
  );
}

function ProjectPickerScreenWrapper({ route, navigation }: { route: any; navigation: any }) {
  const { allowBack = true } = route.params || {};
  return (
    <ProjectPickerScreen
      onNavigateBack={() => navigation.goBack()}
      allowBack={allowBack}
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigation.getParent()?.navigate("ProjectPicker", { allowBack });
      }}
    />
  );
}

function TaskDetailFromDashboardWrapper({ route, navigation }: { route: any; navigation: any }) {
  const { taskId, subTaskId } = route.params;
  return (
    <TaskDetailScreen
      taskId={taskId}
      subTaskId={subTaskId}
      onNavigateBack={() => navigation.goBack()}
      onNavigateToTaskDetail={(taskId, subTaskId) => {
        // Navigate to another TaskDetailScreen for sub-tasks
        navigation.navigate("TaskDetailFromDashboard", { taskId, subTaskId });
      }}
      onNavigateToCreateTask={(parentTaskId, parentSubTaskId, editTaskId, actionType) => {
        // Navigate to CreateTask screen in the same stack with card transition
        navigation.navigate("CreateTask", {
          parentTaskId,
          parentSubTaskId,
          editTaskId,
          actionType,
        });
      }}
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigation.getParent()?.navigate("ProjectPicker", { allowBack });
      }}
    />
  );
}

// Tasks Stack Navigator to include Task Detail screen and Create Task
function TasksStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        presentation: "card"
      }}
    >
      <Stack.Screen name="TasksList" component={ProjectsTasksListScreen} />
      <Stack.Screen 
        name="TaskDetail" 
        component={TaskDetailScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="CreateTaskFromTask" 
        component={CreateTaskFromTaskWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="PhotoViewer" 
        component={PhotoViewerScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="PhotoAnnotation" 
        component={PhotoAnnotationScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="PhotoSelection" 
        component={PhotoSelectionScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="UpdateProgress" 
        component={UpdateProgressScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="AddComment" 
        component={AddCommentScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="RejectTask" 
        component={RejectTaskScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="ReassignTask" 
        component={ReassignTaskScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
      <Stack.Screen 
        name="CreateTask" 
        component={CreateTaskScreenWrapper}
        options={{
          presentation: "card"
        }}
      />
    </Stack.Navigator>
  );
}

function ProjectsTasksListScreen({ navigation }: { navigation: any }) {
  return (
    <TasksScreen
      onNavigateToTaskDetail={(taskId: string, subTaskId?: string) => {
        navigation.navigate("TaskDetail", { taskId, subTaskId });
      }}
      onNavigateToCreateTask={() => navigation.getParent()?.navigate("CreateTask", {
        screen: "CreateTaskMain",
        params: {
          parentTaskId: undefined,
          parentSubTaskId: undefined,
          editTaskId: undefined,
          actionType: undefined,
        }
      })}
      onNavigateBack={() => navigation.getParent()?.navigate("Dashboard")}
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigation.getParent()?.navigate("ProjectPicker", { allowBack });
      }}
    />
  );
}

function TaskDetailScreenWrapper({ route, navigation }: { route: any; navigation: any }) {
  const { taskId, subTaskId } = route.params;
  return (
    <TaskDetailScreen
      taskId={taskId}
      subTaskId={subTaskId}
      onNavigateBack={() => navigation.goBack()}
      onNavigateToTaskDetail={(taskId, subTaskId) => {
        // Navigate to another TaskDetailScreen for sub-tasks
        navigation.navigate("TaskDetail", { taskId, subTaskId });
      }}
      onNavigateToCreateTask={(parentTaskId, parentSubTaskId, editTaskId, actionType) => {
        // Navigate to CreateTask screen in the same stack with card transition
        navigation.navigate("CreateTask", {
          parentTaskId, 
          parentSubTaskId,
          editTaskId,
          actionType,
        });
      }}
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigation.getParent()?.navigate("ProjectPicker", { allowBack });
      }}
    />
  );
}

function CreateTaskFromTaskWrapper({ route, navigation }: { route: any; navigation: any }) {
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

function PhotoViewerScreenWrapper({ route, navigation }: { route: any; navigation: any }) {
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

function PhotoAnnotationScreenWrapper({ route, navigation }: { route: any; navigation: any }) {
  const { photoUri, photoIndex, returnScreen } = route.params || {};
  
  const handleSave = (annotatedPhotoUri: string) => {
    console.log('💾 [PhotoAnnotation] Saving annotated photo, navigating back to:', returnScreen);
    
    // If we came from PhotoSelection, pass the result back via params
    if (returnScreen === 'PhotoSelection' && photoIndex !== undefined) {
      navigation.navigate(returnScreen, {
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
      photoUri={photoUri}
      onSave={handleSave}
      onCancel={() => navigation.goBack()}
    />
  );
}

function PhotoSelectionScreenWrapper({ route, navigation }: { route: any; navigation: any }) {
  const { taskId, subTaskId, companyId, userId, initialCompletionPercentage, initialPhotos, returnScreen, actionType } = route.params || {};
  const uploadedUrlsRef = React.useRef<string[] | null>(null);
  
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
      // Navigate back to CreateTask and pass the uploaded URLs
      navigation.navigate("CreateTask", {
        parentTaskId: route.params?.parentTaskId,
        parentSubTaskId: route.params?.parentSubTaskId,
        editTaskId: route.params?.editTaskId,
        actionType: route.params?.actionType,
        uploadedPhotoUrls: photoUrls,
      });
    } else if (returnScreen === 'UpdateProgress' || returnScreen === 'AddComment') {
      // For update/comment actions, navigate to UpdateProgress screen
      navigation.navigate("UpdateProgress", {
        taskId,
        subTaskId,
        initialCompletionPercentage,
        uploadedPhotoUrls: photoUrls,
        actionType: actionType,
      });
    } else {
      // Default: navigate to UpdateProgress (for TaskDetailScreen)
      navigation.navigate("UpdateProgress", {
        taskId,
        subTaskId,
        initialCompletionPercentage,
      });
    }
  };
  
  return (
    <PhotoSelectionScreen
      taskId={taskId}
      subTaskId={subTaskId}
      companyId={companyId}
      userId={userId}
      initialCompletionPercentage={initialCompletionPercentage || 0}
      initialPhotos={initialPhotos}
      onNavigateBack={() => navigation.goBack()}
      onNavigateToUpdateProgress={(taskId: string, subTaskId?: string, initialCompletionPercentage?: number) => {
        navigation.navigate("UpdateProgress", {
          taskId,
          subTaskId,
          initialCompletionPercentage,
        });
      }}
      onPhotosUploaded={returnScreen ? handlePhotosUploaded : undefined}
    />
  );
}

function CreateTaskScreenWrapper({ route, navigation }: { route: any; navigation: any }) {
  const { parentTaskId, parentSubTaskId, editTaskId, actionType } = route.params || {};
  return (
    <CreateTaskScreen
      onNavigateBack={() => navigation.goBack()}
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
      editTaskId={editTaskId}
      actionType={actionType}
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigation.getParent()?.navigate("ProjectPicker", { allowBack });
      }}
    />
  );
}

function UpdateProgressScreenWrapper({ route, navigation }: { route: any; navigation: any }) {
  return (
    <UpdateProgressScreen 
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigation.getParent()?.navigate("ProjectPicker", { allowBack });
      }}
    />
  );
}

function AddCommentScreenWrapper({ route, navigation }: { route: any; navigation: any }) {
  return (
    <AddCommentScreen 
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigation.getParent()?.navigate("ProjectPicker", { allowBack });
      }}
    />
  );
}

function RejectTaskScreenWrapper({ route, navigation }: { route: any; navigation: any }) {
  return (
    <RejectTaskScreen 
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigation.getParent()?.navigate("ProjectPicker", { allowBack });
      }}
    />
  );
}

function ReassignTaskScreenWrapper({ route, navigation }: { route: any; navigation: any }) {
  return (
    <ReassignTaskScreen 
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigation.getParent()?.navigate("ProjectPicker", { allowBack });
      }}
    />
  );
}

// Profile Stack
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileMainScreen} />
      <Stack.Screen name="DeveloperSettings" component={DeveloperSettingsScreenWrapper} />
      <Stack.Screen name="PendingUsers" component={PendingUsersScreenWrapper} />
    </Stack.Navigator>
  );
}

function ProfileMainScreen({ navigation }: { navigation: any }) {
  return (
    <ProfileScreen
      onNavigateBack={() => navigation.goBack()}
      onNavigateToCreateTask={() => navigation.getParent()?.navigate("CreateTask", {
        screen: "CreateTaskMain",
        params: {
          parentTaskId: undefined,
          parentSubTaskId: undefined,
          editTaskId: undefined,
          actionType: undefined,
        }
      })}
      onNavigateToDeveloperSettings={() => navigation.navigate("DeveloperSettings")}
      onNavigateToPendingUsers={() => navigation.navigate("PendingUsers")}
      onNavigateToProfile={() => {}} // Already on profile screen
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigation.getParent()?.navigate("ProjectPicker", { allowBack });
      }}
    />
  );
}

function PendingUsersScreenWrapper({ navigation }: { navigation: any }) {
  return (
    <PendingUsersScreen
      onNavigateBack={() => navigation.goBack()}
    />
  );
}

function DeveloperSettingsScreenWrapper({ navigation }: { navigation: any }) {
  return (
    <DeveloperSettingsScreen
      onNavigateBack={() => navigation.goBack()}
    />
  );
}

// Reports Stack
function ReportsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReportsMain" component={ReportsMainScreen} />
    </Stack.Navigator>
  );
}

function ReportsMainScreen({ navigation }: { navigation: any }) {
  return (
    <ReportsScreen
      onNavigateBack={() => navigation.goBack()}
    />
  );
}

// Create Task Stack
function CreateTaskStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CreateTaskMain" component={CreateTaskMainScreen} />
    </Stack.Navigator>
  );
}

function CreateTaskMainScreen({ navigation, route }: { navigation: any; route: any }) {
  // Try both direct params and nested params (for tab navigation)
  const params = route.params || {};
  const parentTaskId = params.parentTaskId;
  const parentSubTaskId = params.parentSubTaskId;
  const editTaskId = params.editTaskId;
  // Only default to 'edit' if editTaskId is provided, otherwise it's a new task
  const actionType = params.actionType || (editTaskId ? 'edit' : undefined);
  const sourceTaskId = params.sourceTaskId; // TaskId from the source TaskDetail screen
  const sourceSubTaskId = params.sourceSubTaskId; // SubTaskId from the source TaskDetail screen
  const sourceScreen = params.sourceScreen; // 'dashboard' or 'tasks' to know which navigator to use
  
  // Log params whenever route changes
  React.useEffect(() => {
    console.log('🎯 CreateTaskMainScreen route params changed:', {
      parentTaskId,
      parentSubTaskId,
      editTaskId,
      actionType,
      sourceTaskId,
      sourceSubTaskId,
      sourceScreen,
      hasEditTaskId: !!editTaskId,
      allParams: params,
      routeName: route.name,
      routeKey: route.key
    });
  }, [route.params, parentTaskId, parentSubTaskId, editTaskId, actionType, sourceTaskId, sourceSubTaskId, sourceScreen]);
  
  // Handle back navigation - if editing, navigate back to TaskDetail screen
  const handleNavigateBack = React.useCallback(() => {
    if (editTaskId && sourceScreen && sourceTaskId) {
      // Navigate back to the TaskDetail screen we came from
      const parentNav = navigation.getParent();
      if (parentNav) {
        if (sourceScreen === 'dashboard') {
          parentNav.navigate("Dashboard", {
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
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
      editTaskId={editTaskId}
      actionType={actionType}
    />
  );
}

// Admin Dashboard Stack
function AdminDashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboardMain" component={AdminDashboardMainScreen} />
      <Stack.Screen name="ProjectsList" component={ProjectsListScreen} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreenWrapper} />
      <Stack.Screen name="CreateProject" component={CreateProjectMainScreen} />
      <Stack.Screen name="UserManagement" component={UserManagementMainScreen} />
      <Stack.Screen name="DevAdmin" component={DevAdminScreen} />
    </Stack.Navigator>
  );
}

function AdminDashboardMainScreen({ navigation }: { navigation: any }) {
  return (
    <AdminDashboardScreen
      onNavigateToProjects={() => navigation.navigate("ProjectsList")}
      onNavigateToUserManagement={() => navigation.navigate("UserManagement")}
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToDevAdmin={() => navigation.navigate("DevAdmin")}
    />
  );
}

// Projects Stack (Admin Only) - Kept for backwards compatibility
function ProjectsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProjectsList" component={ProjectsListScreen} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreenWrapper} />
      <Stack.Screen name="CreateProject" component={CreateProjectMainScreen} />
      <Stack.Screen name="UserManagement" component={UserManagementMainScreen} />
    </Stack.Navigator>
  );
}

// Projects Stack for Non-Admin Users
function UserProjectsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProjectsList" component={ProjectsListScreen} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreenWrapper} />
    </Stack.Navigator>
  );
}

function ProjectsListScreen({ navigation, route }: { navigation: any; route: any }) {
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

function ProjectDetailScreenWrapper({ route, navigation }: { route: any; navigation: any }) {
  const { projectId } = route.params;
  return (
    <ProjectDetailScreen
      projectId={projectId}
      onNavigateBack={() => navigation.goBack()}
    />
  );
}

function CreateProjectMainScreen({ navigation }: { navigation: any }) {
  return (
    <CreateProjectScreen
      onNavigateBack={(projectId?: string) => {
        // Pass the newly created project ID back to ProjectsScreen
        navigation.navigate('ProjectsList', { newProjectId: projectId });
      }}
    />
  );
}

function UserManagementMainScreen({ navigation }: { navigation: any }) {
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
