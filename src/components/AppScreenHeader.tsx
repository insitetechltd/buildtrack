import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ProfileMenu from "@/components/ProfileMenu";
import { useAuthStore } from "@/state/authStore";
import { cn } from "@/utils/cn";

const BACK_BUTTON_TEST_ID = "app-screen-header__back";
const BACK_ICON_TEST_ID = "app-screen-header__back-icon";
const BACK_ICON_NAME = "arrow-back";
const BACK_BUTTON_ACCESSIBILITY_LABEL = "Go back";
const BACK_BUTTON_CLASS_NAME = "mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100";

export interface AppScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  showProfileTrigger?: boolean;
  onBackPress?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  rightSlot?: React.ReactNode;
  className?: string;
  onProfilePress?: () => void;
}

export default function AppScreenHeader({
  title,
  subtitle,
  showBackButton = false,
  showProfileTrigger = true,
  onBackPress,
  onNavigateToProfile,
  onNavigateToProjectPicker,
  rightSlot,
  className,
  onProfilePress,
}: AppScreenHeaderProps) {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);

  const topPadding = insets.top > 0 ? insets.top + 8 : 16;
  const profileInitial = useMemo(() => {
    const firstCharacter = user?.name?.trim()?.charAt(0);
    return firstCharacter ? firstCharacter.toUpperCase() : "?";
  }, [user?.name]);

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
      return;
    }

    setIsProfileMenuVisible(true);
  };

  return (
    <View
      testID="app-screen-header__root"
      className={cn("border-b border-gray-200 bg-white px-4 pb-4", className)}
      style={{ paddingTop: topPadding }}
    >
      <View className="flex-row items-center">
        {showBackButton ? (
          <Pressable
            testID={BACK_BUTTON_TEST_ID}
            onPress={onBackPress}
            className={BACK_BUTTON_CLASS_NAME}
            accessibilityRole="button"
            accessibilityLabel={BACK_BUTTON_ACCESSIBILITY_LABEL}
          >
            <Ionicons testID={BACK_ICON_TEST_ID} name={BACK_ICON_NAME} size={20} color="#111827" />
          </Pressable>
        ) : null}

        <View className="flex-1">
          <Text className="text-2xl font-semibold text-gray-900">{title}</Text>
          {subtitle ? (
            <Text className="mt-0.5 text-sm text-gray-500" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View className="ml-3 flex-row items-center">
          {rightSlot ? <View>{rightSlot}</View> : null}
          {user && showProfileTrigger ? (
            <Pressable
              testID="app-screen-header__profile-trigger"
              onPress={handleProfilePress}
              className={cn("h-9 w-9 items-center justify-center rounded-full bg-blue-600", rightSlot && "ml-2")}
              accessibilityRole="button"
              accessibilityLabel="Open profile menu"
            >
              <Text className="text-base font-bold text-white">{profileInitial}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {user ? (
        <ProfileMenu
          visible={isProfileMenuVisible}
          onClose={() => setIsProfileMenuVisible(false)}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToProjectPicker={onNavigateToProjectPicker}
        />
      ) : null}
    </View>
  );
}
