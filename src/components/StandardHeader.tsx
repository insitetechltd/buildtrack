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
  className,
}: StandardHeaderProps) {
  const navigation = useNavigation<any>();
  const handleBackPress = onBackPress ?? onBack;
  const handleNavigateToProfile =
    onNavigateToProfile ??
    (() => {
      navigation.getParent()?.navigate("Profile");
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
      rightSlot={rightElement}
      className={className}
      onProfilePress={onProfilePress}
    />
  );
}
