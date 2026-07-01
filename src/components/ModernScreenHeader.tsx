import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ProfileMenu from "@/components/ProfileMenu";
import { useAuthStore } from "@/state/authStore";
import { cn } from "@/utils/cn";

interface ModernScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  onProfilePress?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  className?: string;
}

export default function ModernScreenHeader({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  onBack,
  rightElement,
  onProfilePress,
  onNavigateToProfile,
  onNavigateToProjectPicker,
  className,
}: ModernScreenHeaderProps) {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const handleBackPress = onBackPress ?? onBack;
  const topPadding = insets.top > 0 ? insets.top + 8 : 16;
  const handleNavigateToProfile =
    onNavigateToProfile ??
    (() => {
      navigation.getParent?.()?.navigate("Profile");
    });
  const handleNavigateToProjectPicker =
    onNavigateToProjectPicker ??
    ((allowBack?: boolean) => {
      navigation.getParent?.()?.navigate("Dashboard", {
        screen: "ProjectPicker",
        params: { allowBack },
      });
    });

  return (
    <View testID="modernHeader-root" className={className} style={{ paddingTop: topPadding }}>
      <View className="flex-row items-center">
        {showBackButton ? (
          <Pressable
            testID="modernHeader-back"
            onPress={handleBackPress}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons testID="modernHeader-back-icon" name="arrow-back" size={24} color="#374151" />
          </Pressable>
        ) : null}

        <View className="flex-1">
          <Text>{title}</Text>
          {subtitle ? <Text>{subtitle}</Text> : null}
        </View>

        <View className="flex-row items-center">
          {rightElement ? <View>{rightElement}</View> : null}
          {user ? (
            <Pressable
              testID="modernHeader-profile-trigger"
              onPress={() => {
                if (onProfilePress) {
                  onProfilePress();
                  return;
                }

                setShowProfileMenu(true);
              }}
              className={cn(rightElement ? "ml-2" : undefined)}
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                <Text className="text-base font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>

      {user ? (
        <ProfileMenu
          visible={showProfileMenu}
          onClose={() => setShowProfileMenu(false)}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToProjectPicker={handleNavigateToProjectPicker}
        />
      ) : null}
    </View>
  );
}
