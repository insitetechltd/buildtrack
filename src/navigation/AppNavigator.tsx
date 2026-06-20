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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();



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
      <Stack.Screen 
        name="PhotoSelection" 
        component={PhotoSelectionScreenWrapper}
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
    </Stack.Navigator>
  );
}

function DashboardMainScreen({ navigation }: { navigation: any }) {
  return (
    <DashboardRoute
      onNavigateToTasks={() => navigation.getParent()?.navigate("Tasks")}
      onNavigateToCreateTask={() => {
        const parentNav = navigation.getParent();
        if (parentNav) {
          // Navigate to CreateTask tab with clearForm flag
          // Use a unique timestamp to force navigation even if already on the tab
          parentNav.navigate("CreateTask", {
            screen: "CreateTaskMain",
            params: {
              parentTaskId: undefined,
              parentSubTaskId: undefined,
              editTaskId: undefined,
              actionType: undefined,
              clearForm: true, // Flag to clear form when "Create New Task" is pressed
              _timestamp: Date.now(), // Force navigation by adding unique param
            }
          });
        }
      }}
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToDeveloperSettings={() => {
        const parentNav = navigation.getParent();
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
    <TasksRoute
      onNavigateToTaskDetail={(taskId: string, subTaskId?: string) => {
        navigation.navigate("TaskDetail", { taskId, subTaskId });
      }}
      onNavigateToCreateTask={() => {
        const parentNav = navigation.getParent();
        if (parentNav) {
          // Navigate to CreateTask tab with clearForm flag
          // Use a unique timestamp to force navigation even if already on the tab
          parentNav.navigate("CreateTask", {
            screen: "CreateTaskMain",
            params: {
              parentTaskId: undefined,
              parentSubTaskId: undefined,
              editTaskId: undefined,
              actionType: undefined,
              clearForm: true, // Flag to clear form when "Create New Task" is pressed
              _timestamp: Date.now(), // Force navigation by adding unique param
            }
          });
        }
      }}
      onNavigateBack={() => navigation.getParent()?.navigate("Dashboard")}
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToDeveloperSettings={() => {
        const parentNav = navigation.getParent();
        if (parentNav) {
          parentNav.navigate("Profile", { screen: "DeveloperSettings" });
        }
      }}
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
      onNavigateBack={() => {
        // Always navigate to TasksList, not just go back
        navigation.navigate("TasksList");
      }}
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
  const { taskId, subTaskId, companyId, userId, initialCompletionPercentage, initialPhotos, returnScreen, actionType, entityType, uploadImmediately, sourceScreen, sourceTaskId, sourceSubTaskId } = route.params || {};
  const uploadedUrlsRef = React.useRef<string[] | null>(null);
  
  // For UpdateProgress and CreateTask, default uploadImmediately to false if not specified
  // This ensures photos are stored locally until submit
  const effectiveUploadImmediately = uploadImmediately !== undefined 
    ? uploadImmediately 
    : (returnScreen === 'UpdateProgress' || returnScreen === 'CreateTask' ? false : true);
  
  // Debug logging
  console.log('📸 [PhotoSelectionWrapper] Route params:', {
    returnScreen,
    uploadImmediately,
    effectiveUploadImmediately,
    uploadImmediatelyType: typeof uploadImmediately,
    shouldUsePhotosSelected: (returnScreen === 'CreateTask' || returnScreen === 'UpdateProgress') && effectiveUploadImmediately === false,
  });
  
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
    console.log('📸 [PhotoSelectionWrapper] handlePhotosUploaded called with:', photoUrls.length, 'photos');
    console.log('📸 [PhotoSelectionWrapper] returnScreen:', returnScreen);
    
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
      // For update/comment actions, navigate to UpdateProgress screen with uploaded URLs
      console.log('📸 [PhotoSelectionWrapper] Navigating to UpdateProgress with photos:', photoUrls.length);
      navigation.navigate("UpdateProgress", {
        taskId,
        subTaskId,
        initialCompletionPercentage,
        uploadedPhotoUrls: photoUrls, // Pass uploaded URLs
        actionType: actionType,
        sourceScreen: sourceScreen, // Pass source screen info for navigation back
        sourceTaskId: sourceTaskId || taskId,
        sourceSubTaskId: sourceSubTaskId || subTaskId,
      });
    } else {
      // Default: navigate to UpdateProgress (for TaskDetailScreen)
      console.log('📸 [PhotoSelectionWrapper] Default navigation to UpdateProgress');
      navigation.navigate("UpdateProgress", {
        taskId,
        subTaskId,
        initialCompletionPercentage,
        uploadedPhotoUrls: photoUrls, // Also pass URLs in default case
        sourceScreen: sourceScreen, // Pass source screen info for navigation back
        sourceTaskId: sourceTaskId || taskId,
        sourceSubTaskId: sourceSubTaskId || subTaskId,
      });
    }
  };

  const handlePhotosSelected = (photos: any[]) => {
    // For CreateTaskScreen or UpdateProgressScreen: go back and update params on the previous screen
    if (returnScreen === 'CreateTask') {
      console.log('📸 [PhotoSelectionWrapper] Going back to CreateTaskMain with photos:', photos);
      console.log('📸 [PhotoSelectionWrapper] Photos to pass:', photos.map((p: any) => ({
        fileName: p.fileName,
        uri: p.uri?.substring(0, 50) + '...',
      })));
      
      // Update params on CreateTaskMain before going back
      // This ensures params are available when the screen comes into focus
      const parentNav = navigation.getParent();
      if (parentNav) {
        // Navigate to CreateTask tab, then to CreateTaskMain screen with updated params
        const navParams = {
          parentTaskId: route.params?.parentTaskId,
          parentSubTaskId: route.params?.parentSubTaskId,
          editTaskId: route.params?.editTaskId,
          actionType: route.params?.actionType,
          selectedPhotos: photos, // Pass photo objects, not URLs
        };
        console.log('📸 [PhotoSelectionWrapper] Navigating with params:', {
          ...navParams,
          selectedPhotosCount: navParams.selectedPhotos?.length || 0,
        });
        parentNav.navigate("CreateTask", {
          screen: "CreateTaskMain",
          params: navParams,
        });
        
        // Also try to set params directly after navigation completes
        // This is a workaround for nested navigators not always updating params
        setTimeout(() => {
          try {
            // Try to get the CreateTaskMain screen's navigation and set params
            const createTaskNav = parentNav.getState()?.routes?.find((r: any) => r.name === 'CreateTask');
            if (createTaskNav?.state) {
              const createTaskMainRoute = createTaskNav.state.routes?.find((r: any) => r.name === 'CreateTaskMain');
              if (createTaskMainRoute) {
                console.log('📸 [PhotoSelectionWrapper] Found CreateTaskMain route, attempting to set params');
                // Try to navigate again with merge to update params
                parentNav.navigate("CreateTask", {
                  screen: "CreateTaskMain",
                  params: navParams,
                  merge: true,
                });
              }
            }
          } catch (e) {
            console.log('📸 [PhotoSelectionWrapper] Could not set params directly:', e);
          }
        }, 200);
      } else {
        // Fallback: navigate within current stack
        console.log('📸 [PhotoSelectionWrapper] Using fallback navigation');
        navigation.navigate("CreateTaskMain", {
          parentTaskId: route.params?.parentTaskId,
          parentSubTaskId: route.params?.parentSubTaskId,
          editTaskId: route.params?.editTaskId,
          actionType: route.params?.actionType,
          selectedPhotos: photos,
        });
      }
    } else if (returnScreen === 'UpdateProgress') {
      // For UpdateProgressScreen: navigate back with selected photos (not uploaded yet)
      console.log('📸 [PhotoSelectionWrapper] Going back to UpdateProgress with photos:', photos.length);
      console.log('📸 [PhotoSelectionWrapper] Photos to pass:', photos.map((p: any) => ({
        fileName: p.fileName,
        uri: p.uri?.substring(0, 50) + '...',
      })));
      
      // Navigate to UpdateProgress with selected photos
      // PhotoSelection and UpdateProgress are in the same stack, so navigate directly
      // First go back to remove PhotoSelection from stack, then navigate to UpdateProgress
      navigation.goBack();
      
      // Use setTimeout to ensure goBack completes before navigating
      setTimeout(() => {
        console.log('📸 [PhotoSelectionWrapper] Navigating to UpdateProgress after goBack');
        // Navigate within the same stack (TasksStack or DashboardStack)
        navigation.navigate("UpdateProgress", {
          taskId,
          subTaskId,
          initialCompletionPercentage,
          selectedPhotos: photos, // Pass photo objects, not URLs
          sourceScreen: sourceScreen,
          sourceTaskId: sourceTaskId || taskId,
          sourceSubTaskId: sourceSubTaskId || subTaskId,
        });
      }, 150);
    } else {
      // Fallback: just go back
      navigation.goBack();
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
      entityType={entityType}
      uploadImmediately={effectiveUploadImmediately}
      onNavigateBack={() => navigation.goBack()}
      onNavigateToUpdateProgress={(taskId: string, subTaskId?: string, initialCompletionPercentage?: number, uploadedPhotoUrls?: string[]) => {
        navigation.navigate("UpdateProgress", {
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
        // Check if we should use onPhotosSelected (when uploadImmediately is false)
        const shouldUsePhotosSelected = (returnScreen === 'CreateTask' || returnScreen === 'UpdateProgress') && effectiveUploadImmediately === false;
        console.log('📸 [PhotoSelectionWrapper] onPhotosSelected condition check:', {
          returnScreen,
          uploadImmediately,
          effectiveUploadImmediately,
          uploadImmediatelyType: typeof uploadImmediately,
          shouldUsePhotosSelected,
          willPassCallback: shouldUsePhotosSelected,
        });
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
function CreateTaskScreenWrapper({ route, navigation }: { route: any; navigation: any }) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 [CreateTaskScreenWrapper] ⚠️ THIS WRAPPER IS BEING USED');
  console.log('📦 [CreateTaskScreenWrapper] Used when navigating directly to CreateTaskScreen');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const { parentTaskId, parentSubTaskId, editTaskId, actionType, uploadedPhotoUrls, selectedPhotos } = route.params || {};
  console.log('📦 [CreateTaskScreenWrapper] Route params:', {
    hasSelectedPhotos: !!selectedPhotos,
    selectedPhotosCount: selectedPhotos?.length || 0,
    allParams: Object.keys(route.params || {}),
  });
  if (selectedPhotos && selectedPhotos.length > 0) {
    console.log('📦 [CreateTaskScreenWrapper] ✅ Passing selectedPhotos to CreateTaskScreen:', selectedPhotos.length);
  } else {
    console.log('📦 [CreateTaskScreenWrapper] ❌ No selectedPhotos to pass');
  }
  return (
    <CreateTaskScreen
      onNavigateBack={() => navigation.goBack()}
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
      editTaskId={editTaskId}
      actionType={actionType}
      uploadedPhotoUrls={uploadedPhotoUrls}
      selectedPhotos={selectedPhotos}
      onNavigateToProfile={() => navigation.getParent()?.navigate("Profile")}
      onNavigateToProjectPicker={(allowBack?: boolean) => {
        navigation.getParent()?.navigate("ProjectPicker", { allowBack });
      }}
    />
  );
}

function UpdateProgressScreenWrapper({ route, navigation }: { route: any; navigation: any }) {
  // Extract params to pass to UpdateProgressScreen
  const params = route.params || {};
  const uploadedPhotoUrls = params.uploadedPhotoUrls; // Legacy: already uploaded URLs
  const selectedPhotos = params.selectedPhotos; // New: photo objects not yet uploaded
  
  console.log('📸 [UpdateProgressWrapper] Route params:', {
    hasUploadedPhotoUrls: !!uploadedPhotoUrls,
    uploadedPhotoUrlsCount: uploadedPhotoUrls?.length || 0,
    hasSelectedPhotos: !!selectedPhotos,
    selectedPhotosCount: selectedPhotos?.length || 0,
    allParams: Object.keys(params),
  });
  
  return (
    <UpdateProgressScreen 
      uploadedPhotoUrls={uploadedPhotoUrls}
      selectedPhotos={selectedPhotos}
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
      onNavigateToCreateTask={() => {
        const parentNav = navigation.getParent();
        if (parentNav) {
          // Navigate to CreateTask tab with clearForm flag
          // Use a unique timestamp to force navigation even if already on the tab
          parentNav.navigate("CreateTask", {
            screen: "CreateTaskMain",
            params: {
              parentTaskId: undefined,
              parentSubTaskId: undefined,
              editTaskId: undefined,
              actionType: undefined,
              clearForm: true, // Flag to clear form when "Create New Task" is pressed
              _timestamp: Date.now(), // Force navigation by adding unique param
            }
          });
        }
      }}
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
      <Stack.Screen 
        name="PhotoSelection" 
        component={PhotoSelectionScreenWrapper}
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
    </Stack.Navigator>
  );
}

// WRAPPER: CreateTaskMainScreen
// USED WHEN: Navigating to "CreateTaskMain" screen (main entry point for Create Task)
// PURPOSE: Handles navigation params, stores selectedPhotos in state, and passes to CreateTaskScreen
// NOTE: This is the PRIMARY wrapper used when returning from PhotoSelectionScreen
function CreateTaskMainScreen({ navigation, route }: { navigation: any; route: any }) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📱 [CreateTaskMainScreen] ⚠️ THIS WRAPPER IS BEING USED');
  console.log('📱 [CreateTaskMainScreen] Used when navigating to CreateTaskMain (main entry point)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Use state to store selectedPhotos so they persist and trigger re-renders
  const [selectedPhotosState, setSelectedPhotosState] = React.useState<any[] | undefined>(undefined);
  
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
  const selectedPhotosFromParams = params.selectedPhotos; // Photos selected from PhotoSelectionScreen
  const clearForm = params.clearForm; // Flag to clear form when "Create New Task" is pressed
  const clearFormTimestamp = params._timestamp; // Timestamp to track when clearForm was set
  
  // Update state when params change
  React.useEffect(() => {
    if (selectedPhotosFromParams && Array.isArray(selectedPhotosFromParams) && selectedPhotosFromParams.length > 0) {
      console.log('📸 [CreateTaskMainScreen] ✅ Updating selectedPhotosState from params:', selectedPhotosFromParams.length);
      setSelectedPhotosState(selectedPhotosFromParams);
      // Clear params after storing in state
      navigation.setParams({ selectedPhotos: undefined });
    } else {
      console.log('📸 [CreateTaskMainScreen] ⏸️ No selectedPhotosFromParams to update state');
    }
  }, [selectedPhotosFromParams, navigation]);
  
  // Also listen for navigation focus to catch params that arrive late
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Check params again on focus
      const currentParams = route.params || {};
      const currentSelectedPhotos = currentParams.selectedPhotos;
      console.log('📸 [CreateTaskMainScreen] 🔍 Focus event - checking params:', {
        hasSelectedPhotos: !!currentSelectedPhotos,
        count: currentSelectedPhotos?.length || 0,
      });
      if (currentSelectedPhotos && Array.isArray(currentSelectedPhotos) && currentSelectedPhotos.length > 0) {
        console.log('📸 [CreateTaskMainScreen] ✅ Focus: Found selectedPhotos in params:', currentSelectedPhotos.length);
        setSelectedPhotosState(currentSelectedPhotos);
        navigation.setParams({ selectedPhotos: undefined });
      }
    });
    return unsubscribe;
  }, [navigation, route.params]);
  
  // Use state value or params value (state takes precedence)
  const selectedPhotos = selectedPhotosState || selectedPhotosFromParams;
  
  console.log('📸 [CreateTaskMainScreen] Current selectedPhotos to pass:', {
    fromState: selectedPhotosState?.length || 0,
    fromParams: selectedPhotosFromParams?.length || 0,
    final: selectedPhotos?.length || 0,
  });
  
  // Log params whenever route changes
  React.useEffect(() => {
    console.log('🎯 [CreateTaskMainScreen] Route params changed:', {
      parentTaskId,
      parentSubTaskId,
      editTaskId,
      actionType,
      sourceTaskId,
      sourceSubTaskId,
      sourceScreen,
      hasEditTaskId: !!editTaskId,
      hasSelectedPhotos: !!selectedPhotos,
      selectedPhotosCount: selectedPhotos?.length || 0,
      allParams: Object.keys(params),
      routeName: route.name,
      routeKey: route.key
    });
    if (selectedPhotos && selectedPhotos.length > 0) {
      console.log('📸 [CreateTaskMainScreen] ✅ Passing selectedPhotos to CreateTaskScreen:', selectedPhotos.length);
      console.log('📸 [CreateTaskMainScreen] Photo details:', selectedPhotos.map((p: any) => ({
        fileName: p.fileName,
        uri: p.uri?.substring(0, 50) + '...',
      })));
    } else {
      console.log('📸 [CreateTaskMainScreen] ❌ No selectedPhotos to pass to CreateTaskScreen');
    }
  }, [route.params, parentTaskId, parentSubTaskId, editTaskId, actionType, sourceTaskId, sourceSubTaskId, sourceScreen, selectedPhotos]);

  // Also listen for navigation focus to catch params that arrive late (already handled above)
  
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
  console.log('📸 [CreateTaskMainScreen] Rendering CreateTaskScreen with selectedPhotos:', selectedPhotos?.length || 0);
  return (
    <CreateTaskScreen
      onNavigateBack={handleNavigateBack}
      parentTaskId={parentTaskId}
      parentSubTaskId={parentSubTaskId}
      editTaskId={editTaskId}
      actionType={actionType}
      selectedPhotos={selectedPhotos}
      clearForm={clearForm}
      clearFormTimestamp={clearFormTimestamp}
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
