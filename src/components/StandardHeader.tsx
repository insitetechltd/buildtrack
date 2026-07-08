import React from "react";
import { useNavigation } from "@react-navigation/native";

import AppScreenHeader from "@/components/AppScreenHeader";

interface StandardHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  onProfilePress?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  onNavigateToDeveloperSettings?: () => void;
  className?: string;
}

export default function StandardHeader({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  onBack,
  rightElement,
  onProfilePress,
  onNavigateToProfile,
  onNavigateToProjectPicker,
  onNavigateToDeveloperSettings,
  className,
}: StandardHeaderProps) {
  const navigation = useNavigation<any>();
  const handleBackPress = onBackPress ?? onBack;
  const handleNavigateToProfile =
    onNavigateToProfile ??
    (() => {
      const parentNavigation = navigation.getParent?.();
      const rootNavigation = parentNavigation?.getParent?.();
      const parentRouteNames = parentNavigation?.getState?.()?.routeNames ?? [];

      if (
        parentRouteNames.includes("MainTabs") ||
        parentRouteNames.includes("Profile") ||
        !rootNavigation
      ) {
        parentNavigation?.navigate("Profile");
        return;
      }

      rootNavigation?.navigate("Profile");
    });
  const handleNavigateToProjectPicker =
    onNavigateToProjectPicker ??
    ((allowBack?: boolean) => {
      navigation.getParent()?.navigate("ProjectPicker", { allowBack });
    });

  return (
    <AppScreenHeader
      title={title}
      subtitle={subtitle}
      showBackButton={showBackButton}
      onBackPress={handleBackPress}
      onNavigateToProfile={handleNavigateToProfile}
      onNavigateToProjectPicker={handleNavigateToProjectPicker}
      onNavigateToDeveloperSettings={onNavigateToDeveloperSettings}
      rightSlot={rightElement}
      className={className}
      onProfilePress={onProfilePress}
    />
  );
}
