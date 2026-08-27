import React from "react";

import AppScreenHeader from "@/components/AppScreenHeader";

interface ModernScreenHeaderProps {
  title: string;
  titleNode?: React.ReactNode;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  onProfilePress?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToProjectPicker?: (allowBack?: boolean) => void;
  onNavigateToCompanyManagement?: () => void;
  onNavigateToTaskDashboard?: () => void;
  onNavigateToDeveloperSettings?: () => void;
  className?: string;
}

/**
 * Thin wrapper over AppScreenHeader. Avatar-menu navigation defaults
 * (Company Admin / Task Dashboard / Profile / Change Project) live in
 * AppScreenHeader so Dashboard + Tasks get the same privilege-aware menu.
 */
export default function ModernScreenHeader({
  title,
  titleNode,
  subtitle,
  showBackButton = false,
  onBackPress,
  onBack,
  rightElement,
  onProfilePress,
  onNavigateToProfile,
  onNavigateToProjectPicker,
  onNavigateToCompanyManagement,
  onNavigateToTaskDashboard,
  onNavigateToDeveloperSettings,
  className,
}: ModernScreenHeaderProps) {
  const handleBackPress = onBackPress ?? onBack;

  return (
    <AppScreenHeader
      title={title}
      titleNode={titleNode}
      subtitle={subtitle}
      showBackButton={showBackButton}
      onBackPress={handleBackPress}
      onNavigateToProfile={onNavigateToProfile}
      onNavigateToProjectPicker={onNavigateToProjectPicker}
      onNavigateToCompanyManagement={onNavigateToCompanyManagement}
      onNavigateToTaskDashboard={onNavigateToTaskDashboard}
      onNavigateToDeveloperSettings={onNavigateToDeveloperSettings}
      rightSlot={rightElement}
      className={className}
      onProfilePress={onProfilePress}
    />
  );
}
