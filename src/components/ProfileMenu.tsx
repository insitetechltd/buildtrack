import React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useTranslation } from "../utils/useTranslation";

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
}

export default function ProfileMenu({
  visible,
  onClose,
  onNavigateToProfile,
  onNavigateToProjectPicker,
}: ProfileMenuProps) {
  const { user, logout } = useAuthStore();
  const t = useTranslation();

  // Early return if no user or not visible
  if (!user || !visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1 bg-black/50"
        onPress={onClose}
      >
        <View className="absolute top-16 right-4 bg-white rounded-xl shadow-lg overflow-hidden min-w-[200px]"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          {/* User Info Header */}
          <View className="bg-blue-600 px-4 py-3 border-b border-blue-700">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3">
                <Text className="text-blue-600 font-bold text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-base" numberOfLines={1}>
                  {user.name}
                </Text>
                <Text className="text-blue-100 text-sm capitalize">
                  {user.role}
                </Text>
              </View>
            </View>
          </View>

          {/* Menu Options */}
          <View className="py-2">
            {onNavigateToProjectPicker && (
              <>
                <Pressable
                  onPress={() => {
                    onClose();
                    onNavigateToProjectPicker(true);
                  }}
                  className="flex-row items-center px-4 py-3 active:bg-gray-100"
                >
                  <Ionicons name="business-outline" size={22} color="#3b82f6" />
                  <Text className="text-gray-900 text-base font-medium ml-3">
                    {t.dashboard.changeProject || "Change Project"}
                  </Text>
                </Pressable>

                <View className="h-px bg-gray-200 mx-4" />
              </>
            )}

            {onNavigateToProfile && (
              <>
                <Pressable
                  onPress={() => {
                    onClose();
                    onNavigateToProfile();
                  }}
                  className="flex-row items-center px-4 py-3 active:bg-gray-100"
                >
                  <Ionicons name="person-outline" size={22} color="#3b82f6" />
                  <Text className="text-gray-900 text-base font-medium ml-3">
                    {t.dashboard.profileAndSettings || "Profile & Settings"}
                  </Text>
                </Pressable>

                <View className="h-px bg-gray-200 mx-4" />
              </>
            )}

            <Pressable
              onPress={() => {
                onClose();
                Alert.alert(
                  t.dashboard.logout || "Logout",
                  t.dashboard.logoutConfirm || "Are you sure you want to logout?",
                  [
                    { text: t.common.cancel || "Cancel", style: "cancel" },
                    { 
                      text: t.dashboard.logout || "Logout", 
                      style: "destructive",
                      onPress: logout
                    },
                  ]
                );
              }}
              className="flex-row items-center px-4 py-3 active:bg-gray-100"
            >
              <Ionicons name="log-out-outline" size={22} color="#ef4444" />
              <Text className="text-red-600 text-base font-medium ml-3">
                {t.dashboard.logout || "Logout"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

