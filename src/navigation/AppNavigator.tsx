import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, Pressable, Alert } from "react-native";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { DataRefreshManager } from "../utils/DataRefreshManager";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import TasksScreen from "../screens/TasksScreen";
import ProjectsTasksScreen from "../screens/ProjectsTasksScreen";
import CreateTaskScreen from "../screens/CreateTaskScreen";
import ProfileScreen from "../screens/ProfileScreen";
import TaskDetailScreen from "../screens/TaskDetailScreen";
import ReportsScreen from "../screens/ReportsScreen";
import ProjectsScreen from "../screens/ProjectsScreen";
import CreateProjectScreen from "../screens/CreateProjectScreen";
import UserManagementScreen from "../screens/UserManagementScreen";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import ProjectDetailScreen from "../screens/ProjectDetailScreen";

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
        name="TaskDetail" 
        component={TaskDetailScreenWrapper}
        options={{
          presentation: "modal"
        }}
      />
    </Stack.Navigator>
  );
}

function DashboardMainScreen({ navigation }: { navigation: any }) {
  return (
    <DashboardScreen
      onNavigateToTasks={() => navigation.getParent()?.navigate("Tasks")}
      onNavigateToCreateTask={() => navigation.getParent()?.navigate("CreateTask")}
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToReports={() => navigation.getParent()?.navigate("Reports")}
      onNavigateToTaskDetail={(taskId: string, subTaskId?: string) => {
        navigation.navigate("TaskDetail", { taskId, subTaskId });
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
          presentation: "modal"
        }}
      />
      <Stack.Screen 
        name="CreateTaskFromTask" 
        component={CreateTaskFromTaskWrapper}
        options={{
          presentation: "modal"
        }}
      />
    </Stack.Navigator>
  );
}

function ProjectsTasksListScreen({ navigation }: { navigation: any }) {
  return (
    <ProjectsTasksScreen
      onNavigateToTaskDetail={(taskId: string, subTaskId?: string) => {
        navigation.navigate("TaskDetail", { taskId, subTaskId });
      }}
      onNavigateToCreateTask={() => navigation.getParent()?.navigate("CreateTask")}
      onNavigateBack={() => navigation.getParent()?.navigate("Dashboard")}
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
      onNavigateToCreateTask={(parentTaskId, parentSubTaskId) => {
        console.log('🚀 Navigation handler called');
        console.log('🚀 parentTaskId:', parentTaskId);
        console.log('🚀 parentSubTaskId:', parentSubTaskId);
        
        // Navigate within the same stack to CreateTaskFromTask
        navigation.navigate("CreateTaskFromTask", { 
          parentTaskId, 
          parentSubTaskId
        });
        
        console.log('🚀 Navigation called to CreateTaskFromTask');
      }}
    />
  );
}

function CreateTaskFromTaskWrapper({ route, navigation }: { route: any; navigation: any }) {
  const { parentTaskId, parentSubTaskId } = route.params || {};
  return (
    <CreateTaskScreen
      onNavigateBack={() => navigation.goBack()}
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
    />
  );
}

// Profile Stack
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileMainScreen} />
    </Stack.Navigator>
  );
}

function ProfileMainScreen({ navigation }: { navigation: any }) {
  return (
    <ProfileScreen
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
  const { parentTaskId, parentSubTaskId } = route.params || {};
  return (
    <CreateTaskScreen
      onNavigateBack={() => navigation.goBack()}
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
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
    </Stack.Navigator>
  );
}

function AdminDashboardMainScreen({ navigation }: { navigation: any }) {
  return (
    <AdminDashboardScreen
      onNavigateToProjects={() => navigation.navigate("ProjectsList")}
      onNavigateToUserManagement={() => navigation.navigate("UserManagement")}
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
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

function ProjectsListScreen({ navigation }: { navigation: any }) {
  return (
    <ProjectsScreen
      onNavigateToProjectDetail={(projectId: string) => {
        navigation.navigate("ProjectDetail", { projectId });
      }}
      onNavigateToCreateProject={() => navigation.navigate("CreateProject")}
      onNavigateToUserManagement={() => navigation.navigate("UserManagement")}
      onNavigateBack={() => navigation.goBack()}
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
      onNavigateBack={() => navigation.goBack()}
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
      {user?.role !== "admin" && (
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
      {user?.role === "admin" ? (
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
      {user?.role !== "admin" && (
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
      {user?.role !== "admin" && (
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
      {user?.role !== "admin" && (
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

export default function AppNavigator() {
  const { isAuthenticated, isLoading, isInitialized } = useAuthStore();

  console.log('📱 AppNavigator render:', { 
    isAuthenticated, 
    isLoading, 
    isInitialized,
    timestamp: new Date().toISOString()
  });

  // Show loading only if we're actually loading (not just uninitiated)
  if (isLoading) {
    console.log('⏳ Showing loading state');
    // TODO: Add proper loading screen
    return null;
  }

  // Wait for initial store rehydration ONLY if we've never initialized
  // This prevents blank screen on first load but allows login to work
  if (!isInitialized && !isAuthenticated) {
    console.log('⏳ Waiting for store initialization (not authenticated yet)');
    return null;
  }

  if (!isAuthenticated) {
    console.log('🔓 Showing login screen');
    return <AuthScreens />;
  }

  console.log('🔐 Showing main app (authenticated)');
  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}// Force reload Fri Oct  3 06:16:45 UTC 2025
