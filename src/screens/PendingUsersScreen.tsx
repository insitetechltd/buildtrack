import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useUserStore } from "../state/userStore.supabase";
import { User } from "../types/buildtrack";
import { cn } from "../utils/cn";
import StandardHeader from "../components/StandardHeader";
import { useTranslation } from "../utils/useTranslation";

interface PendingUsersScreenProps {
  onNavigateBack: () => void;
}

export default function PendingUsersScreen({ onNavigateBack }: PendingUsersScreenProps) {
  const t = useTranslation();
  const { user } = useAuthStore();
  const { 
    getPendingUsersByCompany, 
    approveUser, 
    rejectUser, 
    fetchUsersByCompany,
    isLoading 
  } = useUserStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);

  const loadPendingUsers = async () => {
    if (!user?.companyId) return;
    
    await fetchUsersByCompany(user.companyId);
    const pending = getPendingUsersByCompany(user.companyId);
    setPendingUsers(pending);
  };

  useEffect(() => {
    loadPendingUsers();
  }, [user?.companyId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPendingUsers();
    setRefreshing(false);
  };

  const handleApprove = async (userId: string, userName: string) => {
    if (!user?.id) return;

    Alert.alert(
      t.userManagement.approveUser,
      t.userManagement.approveMessage.replace('{name}', userName),
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.userManagement.approve,
          onPress: async () => {
            const success = await approveUser(userId, user.id);
            if (success) {
              Alert.alert(t.errors.success, t.userManagement.approveSuccess.replace('{name}', userName));
              await loadPendingUsers();
            } else {
              Alert.alert(t.errors.error, t.userManagement.approveFailed);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (userId: string, userName: string) => {
    Alert.alert(
      t.userManagement.rejectUser,
      t.userManagement.rejectMessage.replace('{name}', userName),
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.userManagement.reject,
          style: "destructive",
          onPress: async () => {
            const success = await rejectUser(userId);
            if (success) {
              Alert.alert(t.userManagement.reject, t.userManagement.rejectSuccess.replace('{name}', userName));
              await loadPendingUsers();
            } else {
              Alert.alert(t.errors.error, t.userManagement.rejectFailed);
            }
          },
        },
      ]
    );
  };

  const renderPendingUser = ({ item }: { item: User }) => (
    <View className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">{item.name}</Text>
          <Text className="text-sm text-gray-600 mt-1">{item.position}</Text>
          {item.email && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="mail-outline" size={14} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-1">{item.email}</Text>
            </View>
          )}
          <View className="flex-row items-center mt-1">
            <Ionicons name="call-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-gray-600 ml-1">{item.phone}</Text>
          </View>
        </View>
        <View className="bg-yellow-100 px-3 py-1 rounded-full">
          <Text className="text-xs font-medium text-yellow-800">{t.userManagement.pending}</Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => handleApprove(item.id, item.name)}
          className="flex-1 bg-green-600 py-3 rounded-lg flex-row items-center justify-center"
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="white" />
          <Text className="text-white font-semibold ml-2">{t.userManagement.approve}</Text>
        </Pressable>

        <Pressable
          onPress={() => handleReject(item.id, item.name)}
          className="flex-1 bg-red-600 py-3 rounded-lg flex-row items-center justify-center"
        >
          <Ionicons name="close-circle-outline" size={20} color="white" />
          <Text className="text-white font-semibold ml-2">{t.userManagement.reject}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Standard Header */}
      <StandardHeader 
        title={t.userManagement.pendingApprovals}
        subtitle={`${pendingUsers.length} ${pendingUsers.length === 1 ? t.userManagement.userWaiting : t.userManagement.usersWaiting}`}
        showBackButton={true}
        onBackPress={onNavigateBack}
      />

      {/* Content */}
      <FlatList
        data={pendingUsers}
        renderItem={renderPendingUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-done-outline" size={40} color="#9ca3af" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              {t.userManagement.noPendingApprovals}
            </Text>
            <Text className="text-gray-600 text-center px-8">
              {t.userManagement.allRequestsProcessed}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

