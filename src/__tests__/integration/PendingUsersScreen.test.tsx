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

jest.mock("@/components/StandardHeader", () => ({
  __esModule: true,
  default: function MockStandardHeader({
    title,
    subtitle,
    rightElement,
  }: {
    title: string;
    subtitle?: string;
    rightElement?: React.ReactNode;
  }) {
    const { View, Text } = require("react-native");

    return (
      <View>
        <Text>{title}</Text>
        {subtitle ? <Text>{subtitle}</Text> : null}
        {rightElement}
      </View>
    );
  },
}));

jest.mock("@/components/migration/ModernUiMarker", () => ({
  __esModule: true,
  default: function MockModernUiMarker() {
    const { Text } = require("react-native");
    return <Text>Modern UI</Text>;
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
    expect(screen.getByText("1 user waiting")).toBeTruthy();
    expect(screen.getByText("Pending Person")).toBeTruthy();
    expect(screen.getByText("Modern UI")).toBeTruthy();

    fireEvent.press(screen.getByText("Approve"));

    expect(mockRequestApproveUser).toHaveBeenCalledWith("user-1");
  });
});
