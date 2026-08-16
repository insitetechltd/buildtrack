import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import PendingUsersScreen from "@/screens/PendingUsersScreen";

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  const mockReactNative = Object.create(actual);

  Object.defineProperty(mockReactNative, "RefreshControl", {
    value: function MockRefreshControl() {
      return null;
    },
  });

  return mockReactNative;
});

jest.mock(
  "../../ui/viewAdapters/usePendingUsersViewAdapter",
  () => ({
    usePendingUsersViewAdapter: jest.fn(),
  }),
  { virtual: true },
);

jest.mock("@/components/ModernScreenHeader", () => ({
  __esModule: true,
  default: function MockModernScreenHeader({
    title,
    subtitle,
    titleNode,
    rightElement,
  }: {
    title?: string;
    subtitle?: string;
    titleNode?: React.ReactNode;
    rightElement?: React.ReactNode;
  }) {
    const React = require("react");
    const { Text, View } = require("react-native");
    return React.createElement(
      View,
      null,
      titleNode || (title ? React.createElement(Text, null, title) : null),
      subtitle ? React.createElement(Text, null, subtitle) : null,
      rightElement || null,
    );
  },
}));

jest.mock("@/components/BrandHeaderTitle", () => ({
  __esModule: true,
  default: function MockBrandHeaderTitle({
    label,
    subtitle,
  }: {
    label?: string;
    subtitle?: string;
  }) {
    const React = require("react");
    const { Text, View } = require("react-native");
    return React.createElement(
      View,
      null,
      label ? React.createElement(Text, null, label) : null,
      subtitle ? React.createElement(Text, null, subtitle) : null,
    );
  },
}));

jest.mock("@/components/migration/ModernUiMarker", () => ({
  __esModule: true,
  default: function MockModernUiMarker() {
    return null;
  },
}));

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "admin-1",
      name: "Avery Admin",
      role: "admin",
      companyId: "company-1",
    },
  }),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStore: () => ({
    getPendingUsersByCompany: () => [],
    approveUser: jest.fn(),
    rejectUser: jest.fn(),
    fetchUsersByCompany: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    common: {
      cancel: "Cancel",
    },
    errors: {
      error: "Error",
      success: "Success",
    },
    userManagement: {
      pendingApprovals: "Pending Approvals",
      userWaiting: "user waiting",
      usersWaiting: "users waiting",
      noPendingApprovals: "No Pending Approvals",
      allRequestsProcessed: "All user requests have been processed.",
      approve: "Approve",
      reject: "Reject",
      pending: "Pending",
      approveUser: "Approve User",
      approveMessage: "Approve {name}?",
      approveSuccess: "{name} approved",
      approveFailed: "Approve failed",
      rejectUser: "Reject User",
      rejectMessage: "Reject {name}?",
      rejectSuccess: "{name} rejected",
      rejectFailed: "Reject failed",
    },
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("PendingUsersScreen", () => {
  const mockRequestApproveUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const { usePendingUsersViewAdapter } = require("../../ui/viewAdapters/usePendingUsersViewAdapter");

    usePendingUsersViewAdapter.mockReturnValue({
      output: {
        screenId: "PendingUsersScreen",
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
        title: "Pending Approvals",
        subtitle: "1 user waiting",
        pendingUserCards: [
          {
            id: "pending-user-card:user-1",
            userId: "user-1",
            name: "Pending Person",
            positionLabel: "Supervisor",
            email: "pending@example.com",
            phone: "+1 555 0100",
            statusLabel: "Pending",
            approveActionLabel: "Approve",
            rejectActionLabel: "Reject",
            density: "standard",
            structuralState: "stale",
          },
        ],
        refreshState: {
          isRefreshing: false,
        },
        emptyState: {
          title: "No Pending Approvals",
          message: "All user requests have been processed.",
        },
      },
      actions: {
        handleRefresh: jest.fn(),
        requestApproveUser: mockRequestApproveUser,
        requestRejectUser: jest.fn(),
      },
    });
  });

  it("renders adapter-driven pending users and delegates approve actions through the pending users adapter", () => {
    const screen = render(<PendingUsersScreen onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Pending Approvals")).toBeTruthy();
    expect(screen.getAllByText("1 user waiting").length).toBeGreaterThan(0);
    expect(screen.getByText("Pending Person")).toBeTruthy();

    fireEvent.press(screen.getByText("Approve"));

    expect(mockRequestApproveUser).toHaveBeenCalledWith("user-1");
  });
});
