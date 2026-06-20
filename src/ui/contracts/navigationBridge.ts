export interface NavigationScreenReadiness {
  hasInitialFrame: boolean;
  hasUsableData: boolean;
  isBackgroundRefreshing: boolean;
  isNavigationTransitionActive: boolean;
}

export interface ScreenContinuityContract {
  isInitialLoading: boolean;
  isBackgroundRefreshing: boolean;
  hasCachedFrame: boolean;
  shouldRenderSkeletonShell: boolean;
  shouldRenderEmptyState: boolean;
  freshnessLabel: string;
}

export interface NavigationFrameShellContract {
  preservesHeaderFootprint: boolean;
  preservesScrollContainerIdentity: boolean;
  preservesSectionOrder: boolean;
  blocksFullScreenResetDuringTransition: boolean;
}

export interface HybridNavigationTransitionContract {
  sourceScreenId: string;
  destinationScreenId: string;
  transitionStyle: "legacy_to_migrated" | "migrated_to_legacy" | "migrated_to_migrated";
  frameShell: NavigationFrameShellContract;
  readiness: NavigationScreenReadiness;
}

export interface NavigationReadinessHookResult {
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  transition: HybridNavigationTransitionContract;
}
