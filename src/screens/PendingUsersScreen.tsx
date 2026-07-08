import React from "react";
import { View, Text, Pressable, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import StandardHeader from "../components/StandardHeader";
import type { PendingUsersScreenCard } from "../ui/contracts/viewAdapters";
import {
  usePendingUsersViewAdapter,
  type PendingUsersViewAdapterProps,
} from "../ui/viewAdapters/usePendingUsersViewAdapter";

type PendingUsersScreenProps = PendingUsersViewAdapterProps;

function PendingUserCard({
  item,
  onApprove,
  onReject,
}: {
  item: PendingUsersScreenCard;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
}) {
  return (
    <View className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">{item.name}</Text>
          <Text className="text-sm text-gray-600 mt-1">{item.positionLabel}</Text>
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
          <Text className="text-xs font-medium text-yellow-800">{item.statusLabel}</Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => onApprove(item.userId)}
          className="flex-1 bg-green-600 py-3 rounded-lg flex-row items-center justify-center"
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="white" />
          <Text className="text-white font-semibold ml-2">{item.approveActionLabel}</Text>
        </Pressable>

        <Pressable
          onPress={() => onReject(item.userId)}
          className="flex-1 bg-red-600 py-3 rounded-lg flex-row items-center justify-center"
        >
          <Ionicons name="close-circle-outline" size={20} color="white" />
          <Text className="text-white font-semibold ml-2">{item.rejectActionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function PendingUsersScreen(props: PendingUsersScreenProps) {
  const { onNavigateBack } = props;
  const { output, actions } = usePendingUsersViewAdapter(props);

  if (!output.readiness.hasUsableData) {
    return null;
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <StandardHeader
        title={output.title}
        subtitle={output.subtitle}
        showBackButton={true}
        onBackPress={onNavigateBack}
      />

      <FlatList
        data={output.pendingUserCards}
        renderItem={({ item }) => (
          <PendingUserCard
            item={item}
            onApprove={actions.requestApproveUser}
            onReject={actions.requestRejectUser}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={output.refreshState.isRefreshing}
            onRefresh={actions.handleRefresh}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-done-outline" size={40} color="#9ca3af" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              {output.emptyState.title}
            </Text>
            <Text className="text-gray-600 text-center px-8">
              {output.emptyState.message}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
