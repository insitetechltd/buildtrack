import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import PhotoViewerScreen from "@/screens/PhotoViewerScreen";

jest.mock("@/ui/viewAdapters/usePhotoViewerViewAdapter", () => ({
  usePhotoViewerViewAdapter: jest.fn(),
}));

jest.mock("@/components/migration/ModernUiMarker", () => ({
  __esModule: true,
  default: function MockModernUiMarker() {
    return null;
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({
    top: 24,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

describe("PhotoViewerScreen", () => {
  const mockHandleNavigateBack = jest.fn();
  const mockHandlePhotoIndexChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const { usePhotoViewerViewAdapter } = require("@/ui/viewAdapters/usePhotoViewerViewAdapter");

    usePhotoViewerViewAdapter.mockReturnValue({
      output: {
        screenId: "PhotoViewerScreen",
        readiness: {
          hasInitialFrame: true,
          hasUsableData: true,
          isBackgroundRefreshing: false,
          isNavigationTransitionActive: false,
        },
        continuity: {
          isInitialLoading: false,
          isBackgroundRefreshing: false,
          hasCachedFrame: true,
          shouldRenderSkeletonShell: false,
          shouldRenderEmptyState: false,
          freshnessLabel: "Ready",
        },
        currentIndex: 0,
        photoCountLabel: "1 / 3",
        activityMetadata: {
          title: "Task Information",
          actorLabel: "Jordan Lee",
          timestampLabel: "2026-06-20 09:15",
          description: "Updated the task details",
          reasonLabel: "Reason: Need clearer labeling",
          progressLabel: "Progress: 60%",
          statusLabel: "in progress",
        },
        activityVisuals: {
          iconName: "create",
          accentColor: "#6366f1",
          statusBadgeBackgroundColor: "#6366f120",
        },
      },
      actions: {
        handleNavigateBack: mockHandleNavigateBack,
        handlePhotoIndexChange: mockHandlePhotoIndexChange,
      },
    });
  });

  it("renders adapter-driven photo viewer details and delegates the back action through the adapter", () => {
    const screen = render(
      <PhotoViewerScreen
        photos={["photo-1", "photo-2", "photo-3"]}
        initialIndex={0}
        activityInfo={null}
        onNavigateBack={jest.fn()}
      />,
    );

    expect(screen.getByText("Back")).toBeTruthy();
    expect(screen.getByText("1 / 3")).toBeTruthy();
    expect(screen.getByText("Task Information")).toBeTruthy();
    expect(screen.getByText("Reason: Need clearer labeling")).toBeTruthy();

    fireEvent.press(screen.getByText("Back"));

    expect(mockHandleNavigateBack).toHaveBeenCalled();
  });
});
