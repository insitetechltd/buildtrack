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

export interface AppScreenHeaderProps {
  title: string;
  titleNode?: React.ReactNode;
  subtitle?: string;
  showBackButton?: boolean;
  showProfileTrigger?: boolean;
  onBackPress?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  onNavigateToDeveloperSettings?: () => void;
  rightSlot?: React.ReactNode;
  className?: string;
  onProfilePress?: () => void;
}

export default function AppScreenHeader({
  title,
  titleNode,
  subtitle,
  showBackButton = false,
  showProfileTrigger = true,
  onBackPress,
  onNavigateToProfile,
  onNavigateToProjectPicker,
  onNavigateToDeveloperSettings,
  rightSlot,
  className,
  onProfilePress,
}: AppScreenHeaderProps) {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);

  const topPadding = insets.top > 0 ? insets.top + 4 : 16;
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
      className={cn("border-b border-[#0B6A84] bg-[#08576E] px-4 pb-3", className)}
      style={{ paddingTop: topPadding }}
    >
      <View className="flex-row items-center">
        {showBackButton ? (
          <Pressable
            testID={BACK_BUTTON_TEST_ID}
            onPress={onBackPress}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#0D6E87]"
            accessibilityRole="button"
            accessibilityLabel={BACK_BUTTON_ACCESSIBILITY_LABEL}
          >
            <Ionicons testID={BACK_ICON_TEST_ID} name={BACK_ICON_NAME} size={20} color="#F8FCFF" />
          </Pressable>
        ) : null}

        <View className="flex-1">
          {titleNode ? (
            <View>{titleNode}</View>
          ) : (
            <Text
              className="text-[28px] leading-8 font-semibold text-[#F8FCFF]"
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.9}
            >
              {title}
            </Text>
          )}
          {subtitle ? (
            <Text className="mt-0.5 text-base leading-5 text-[#B9D9E4]" numberOfLines={1}>
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
              className={cn("h-10 w-10 items-center justify-center rounded-full bg-[#12A8E0]", rightSlot && "ml-2")}
              accessibilityRole="button"
              accessibilityLabel="Open workspace menu"
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
          onNavigateToDeveloperSettings={onNavigateToDeveloperSettings}
        />
      ) : null}
    </View>
  );
}
