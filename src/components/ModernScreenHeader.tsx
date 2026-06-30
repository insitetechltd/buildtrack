import React from "react";
import { Pressable, Text, View } from "react-native";

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
  className,
}: ModernScreenHeaderProps) {
  const handleBackPress = onBackPress ?? onBack;

  return (
    <View className={className}>
      <View className="flex-row items-center">
        {showBackButton ? (
          <Pressable testID="modernHeader-back" onPress={handleBackPress}>
            <Text>Back</Text>
          </Pressable>
        ) : null}

        <View className="flex-1">
          <Text>{title}</Text>
          {subtitle ? <Text>{subtitle}</Text> : null}
        </View>

        {rightElement ? <View>{rightElement}</View> : null}
      </View>
    </View>
  );
}

