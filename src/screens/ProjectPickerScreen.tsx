import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useProjectStoreWithInit } from "../state/projectStore.supabase";
import { useProjectFilterStore } from "../state/projectFilterStore";
import { useThemeStore } from "../state/themeStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { useUserStore } from "../state/userStore.supabase";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";

interface ProjectPickerScreenProps {
  onNavigateBack: () => void;
  allowBack?: boolean; // If false, prevent going back (required selection)
}

export default function ProjectPickerScreen({ 
  onNavigateBack, 
  allowBack = true 
}: ProjectPickerScreenProps) {
  const { user } = useAuthStore();
  const projectStore = useProjectStoreWithInit();
  const { getProjectsByUser, fetchProjects, fetchUserProjectAssignments } = projectStore;
  const taskStore = useTaskStore();
  const { fetchTasks } = taskStore;
  const { fetchUsers } = useUserStore();
  const { selectedProjectId, setSelectedProject } = useProjectFilterStore();
  const { isDarkMode } = useThemeStore();
  const [isProjectSwitching, setIsProjectSwitching] = useState(false);

  // Get projects user is participating in
  const userProjects = user ? getProjectsByUser(user.id) : [];

  const handleProjectSelect = async (projectId: string) => {
    if (!user) return;

    // Only refresh if actually changing projects
    if (selectedProjectId === projectId) {
      onNavigateBack();
      return;
    }
    
    setIsProjectSwitching(true);
    await setSelectedProject(projectId, user.id);
    
    // Refresh all data when project changes (treat as re-login)
    try {
      console.log('🔄 Project changed - refreshing all data...');
      await Promise.all([
        fetchTasks(),
        fetchProjects(),
        fetchUserProjectAssignments(user.id),
        fetchUsers()
      ]);
      console.log('✅ Data refresh complete');
      onNavigateBack();
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setIsProjectSwitching(false);
    }
  };

  return (
    <SafeAreaView className={cn("flex-1", isDarkMode ? "bg-slate-900" : "bg-gray-50")}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <StandardHeader 
        title="Select a Project"
        showBackButton={allowBack}
        onBackPress={allowBack ? onNavigateBack : undefined}
      />

      <ScrollView className="flex-1 px-6 py-4">
        {/* Individual Projects */}
        <Text className={cn(
          "text-sm font-semibold uppercase mb-2 mt-2",
          isDarkMode ? "text-slate-400" : "text-gray-500"
        )}>
          Your Projects ({userProjects.length})
        </Text>
        
        {userProjects.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Ionicons name="folder-open-outline" size={64} color={isDarkMode ? "#475569" : "#9ca3af"} />
            <Text className={cn(
              "text-xl font-medium mt-4",
              isDarkMode ? "text-slate-400" : "text-gray-500"
            )}>
              No projects available
            </Text>
            <Text className={cn(
              "text-center mt-2 px-8",
              isDarkMode ? "text-slate-500" : "text-gray-400"
            )}>
              You haven't been assigned to any projects yet
            </Text>
          </View>
        ) : (
          userProjects.map((project) => (
            <Pressable
              key={project.id}
              onPress={() => handleProjectSelect(project.id)}
              disabled={isProjectSwitching}
              className={cn(
                "bg-white border rounded-lg p-4 mb-2",
                isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200",
                selectedProjectId === project.id 
                  ? isDarkMode 
                    ? "border-blue-500 bg-blue-900/30" 
                    : "border-blue-500 bg-blue-50" 
                  : "",
                isProjectSwitching && "opacity-50"
              )}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className={cn(
                    "text-lg font-semibold",
                    selectedProjectId === project.id 
                      ? isDarkMode 
                        ? "text-blue-300" 
                        : "text-blue-700" 
                      : isDarkMode 
                        ? "text-white" 
                        : "text-gray-900"
                  )}>
                    {project.name}
                  </Text>
                  <Text className={cn(
                    "text-base mt-1",
                    isDarkMode ? "text-slate-400" : "text-gray-600"
                  )}>
                    {project.description}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <View className={cn(
                      "px-2 py-1 rounded-full",
                      project.status === "active" 
                        ? isDarkMode 
                          ? "bg-green-900/50" 
                          : "bg-green-100" 
                        : isDarkMode 
                          ? "bg-yellow-900/50" 
                          : "bg-yellow-100"
                    )}>
                      <Text className={cn(
                        "text-sm font-medium capitalize",
                        project.status === "active" 
                          ? isDarkMode 
                            ? "text-green-300" 
                            : "text-green-700" 
                          : isDarkMode 
                            ? "text-yellow-300" 
                            : "text-yellow-700"
                      )}>
                        {project.status}
                      </Text>
                    </View>
                  </View>
                </View>
                {selectedProjectId === project.id && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={24} 
                    color={isDarkMode ? "#60a5fa" : "#2563eb"} 
                  />
                )}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

