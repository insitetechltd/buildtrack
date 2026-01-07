import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";
import { useUserStore } from "../state/userStore.supabase";
import { useProjectStoreWithCompanyInit } from "../state/projectStore.supabase";
import { useUserPreferencesStore } from "../state/userPreferencesStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import { useTranslation } from "../utils/useTranslation";

interface ReassignTaskScreenParams {
  taskId: string;
  onReassign?: (selectedUserIds: string[]) => Promise<void>;
}

interface ReassignTaskScreenProps {
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

export default function ReassignTaskScreen({ onNavigateToProfile, onNavigateToProjectPicker }: ReassignTaskScreenProps = {}) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { taskId, onReassign: onReassignCallback } = (route.params || {}) as ReassignTaskScreenParams;
  const t = useTranslation();
  const { user } = useAuthStore();
  const tasks = useTaskStore(state => state.tasks);
  const { getUserById } = useUserStore();
  const projectStore = useProjectStoreWithCompanyInit(user?.companyId || "");
  const { getProjectUserAssignments } = projectStore;
  const { isFavoriteUser, toggleFavoriteUser } = useUserPreferencesStore();

  const task = tasks.find(t => t.id === taskId);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Reset when screen opens
  useEffect(() => {
    setSelectedUsers([]);
    setSearchQuery("");
  }, [taskId]);

  const projectUsers = useMemo(() => {
    if (!task?.projectId) return [];
    return getProjectUserAssignments(task.projectId)
      .filter(assignment => assignment.isActive)
      .map(assignment => getUserById(assignment.userId))
      .filter(Boolean);
  }, [task?.projectId, getProjectUserAssignments, getUserById]);

  const filteredUsers = useMemo(() => {
    let filtered = projectUsers.filter(u => 
      u && (
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    );

    // Sort favorites to top
    if (user?.id) {
      filtered = [...filtered].sort((a, b) => {
        if (!a || !b) return 0;
        const aIsFavorite = isFavoriteUser(user.id, a.id);
        const bIsFavorite = isFavoriteUser(user.id, b.id);
        
        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        return 0;
      });
    }

    return filtered;
  }, [projectUsers, searchQuery, user?.id, isFavoriteUser]);

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleReassign = async () => {
    if (selectedUsers.length === 0) return;
    
    if (onReassignCallback) {
      await onReassignCallback(selectedUsers);
    }
    
    navigation.goBack();
  };

  if (!task) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        
        {/* Standard Header */}
        <StandardHeader 
          title="Reassign Task"
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToProjectPicker={onNavigateToProjectPicker}
        />
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title="Reassign Task"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
      />

      {/* Search */}
      <View className="px-6 pt-4 pb-3">
        <View className="flex-row items-center bg-white border border-gray-300 rounded-lg px-4 py-3">
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 text-lg"
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* User List */}
      <ScrollView className="flex-1 px-6 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-sm text-gray-600 mb-2">
          Select user(s) to reassign this task to:
        </Text>
        
        {filteredUsers.map((projectUser) => {
          if (!projectUser) return null;
          const isSelected = selectedUsers.includes(projectUser.id);
          const isFavorite = user?.id ? isFavoriteUser(user.id, projectUser.id) : false;
          
          return (
            <Pressable
              key={projectUser.id}
              onPress={() => toggleUser(projectUser.id)}
              className={cn(
                "flex-row items-center py-2.5 px-3 rounded-lg border mb-2",
                isSelected ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
              )}
            >
              <View className={cn(
                "w-5 h-5 rounded border-2 items-center justify-center mr-2.5",
                isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
              )}>
                {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {projectUser.name}
                </Text>
                <View className="flex-row items-center mt-0.5">
                  <Text className="text-sm text-gray-500 capitalize">
                    {projectUser.role}
                  </Text>
                  {projectUser.email && (
                    <>
                      <Text className="text-sm text-gray-400 mx-1">•</Text>
                      <Text className="text-sm text-gray-400" numberOfLines={1}>
                        {projectUser.email}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              
              {/* Favorite Star */}
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  if (user?.id) {
                    toggleFavoriteUser(user.id, projectUser.id);
                  }
                }}
                className="p-1.5"
              >
                <Ionicons 
                  name={isFavorite ? "star" : "star-outline"} 
                  size={20} 
                  color={isFavorite ? "#fbbf24" : "#9ca3af"} 
                />
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8
        }}
      >
        <SafeAreaView edges={['bottom']}>
          <Pressable
            onPress={handleReassign}
            disabled={selectedUsers.length === 0}
            className={cn(
              "px-4 py-3 rounded-xl flex-row items-center justify-center w-full",
              selectedUsers.length === 0 ? "bg-gray-300" : "bg-blue-600"
            )}
          >
            <Ionicons 
              name="people-outline" 
              size={18} 
              color="white" 
            />
            <Text className="text-white font-semibold text-base ml-2">
              Reassign ({selectedUsers.length})
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

