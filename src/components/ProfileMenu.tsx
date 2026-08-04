import React from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "../state/authStore";
import { useTranslation } from "../utils/useTranslation";

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  onNavigateToDeveloperSettings?: () => void;
}

export default function ProfileMenu({
  visible,
  onClose,
  onNavigateToProfile,
  onNavigateToProjectPicker,
  onNavigateToDeveloperSettings,
}: ProfileMenuProps) {
  const { user, logout } = useAuthStore();
  const t = useTranslation();

  if (!user || !visible) {
    return null;
  }

  const handleNavigateToProfile = () => {
    onClose();
    onNavigateToProfile?.();
  };

  const handleNavigateToProjectPicker = () => {
    onClose();
    onNavigateToProjectPicker?.(true);
  };

  const handleNavigateToDeveloperSettings = () => {
    onClose();
    onNavigateToDeveloperSettings?.();
  };

  const handleLogout = () => {
    onClose();
    Alert.alert(
      t.dashboard.logout || "Logout",
      t.dashboard.logoutConfirm || "Are you sure you want to logout?",
      [
        { text: t.common.cancel || "Cancel", style: "cancel" },
        {
          text: t.dashboard.logout || "Logout",
          style: "destructive",
          onPress: logout,
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/30" onPress={onClose}>
        <View
          className="absolute right-4 top-16 min-w-[240px] overflow-hidden rounded-3xl border border-[#B9D9E4] bg-[#F8FCFF]"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <View className="border-b border-[#D8EBF2] px-4 py-3">
            <Text className="text-sm font-medium text-[#497080]" numberOfLines={1}>
              {user.name}
            </Text>
            <Text className="mt-1 text-xs uppercase tracking-wide text-[#7FA7B4]">
              {user.role}
            </Text>
          </View>

          <View className="py-2">
            <Pressable
              testID="profile-menu-profile_settings"
              onPress={handleNavigateToProfile}
              className="flex-row items-center px-4 py-3 active:bg-[#EAF6FB]"
            >
              <Ionicons name="person-outline" size={20} color="#0A556B" />
              <Text className="ml-3 text-base font-medium text-[#10222B]">
                {t.dashboard.profileAndSettings || "Profile & Settings"}
              </Text>
            </Pressable>

            {onNavigateToProjectPicker ? (
              <Pressable
                testID="profile-menu-project_picker"
                onPress={handleNavigateToProjectPicker}
                className="flex-row items-center px-4 py-3 active:bg-[#EAF6FB]"
              >
                <Ionicons name="business-outline" size={20} color="#0A556B" />
                <Text className="ml-3 text-base font-medium text-[#10222B]">
                  {t.dashboard.changeProject || "Change Project"}
                </Text>
              </Pressable>
            ) : null}

            {onNavigateToDeveloperSettings ? (
              <Pressable
                testID="profile-menu-developer_settings"
                onPress={handleNavigateToDeveloperSettings}
                className="flex-row items-center px-4 py-3 active:bg-[#EAF6FB]"
              >
                <Ionicons name="settings-outline" size={20} color="#0A556B" />
                <Text className="ml-3 text-base font-medium text-[#10222B]">
                  Developer Settings
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              testID="profile-menu-logout"
              onPress={handleLogout}
              className="flex-row items-center px-4 py-3 active:bg-[#FFF1F1]"
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text className="ml-3 text-base font-medium text-red-600">
                {t.dashboard.logout || "Logout"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
