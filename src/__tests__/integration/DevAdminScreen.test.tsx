import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import DevAdminScreen from "@/screens/DevAdminScreen";

jest.mock(
  "@/ui/viewAdapters/useDevAdminViewAdapter",
  () => ({
    useDevAdminViewAdapter: jest.fn(),
  }),
  { virtual: true },
);

jest.mock("@/components/StandardHeader", () => ({
  __esModule: true,
  default: function MockStandardHeader({
    title,
    rightElement,
  }: {
    title: string;
    rightElement?: React.ReactNode;
  }) {
    const { View, Text } = require("react-native");

    return (
      <View>
        <Text>{title}</Text>
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

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("DevAdminScreen", () => {
  const mockHandleNavigateBack = jest.fn();
  const mockHandleToolActionPress = jest.fn();
  const mockHandleEnvironmentPress = jest.fn();
  const mockHandleRemoveEnvironment = jest.fn();
  const mockHandleToggleAddEnvironment = jest.fn();
  const mockHandleSubmitNewEnvironment = jest.fn();
  const mockSetNewEnvironmentName = jest.fn();
  const mockSetNewEnvironmentUrl = jest.fn();
  const mockSetNewEnvironmentKey = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const { useDevAdminViewAdapter } = require("@/ui/viewAdapters/useDevAdminViewAdapter");

    useDevAdminViewAdapter.mockReturnValue({
      output: {
        screenId: "DevAdminScreen",
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
        access: {
          isAllowed: true,
          deniedMessage: null,
          displayName: "Tristan Admin",
          email: "admin_tristan@insitetech.com",
          roleLabel: "ADMIN",
        },
        title: "Dev Admin",
        userInfoLabel: "LOGGED IN AS",
        activeEnvironment: {
          name: "testing",
          badgeLabel: "TESTING",
          url: "https://testing.example.supabase.co",
          tone: "testing",
        },
        environmentSection: {
          title: "DATABASE ENVIRONMENTS",
          addActionLabel: "Add",
          environments: [
            {
              id: "environment:production",
              envName: "production",
              label: "production",
              url: "https://prod.example.supabase.co",
              isActive: false,
              isRemovable: false,
              tone: "production",
              density: "standard",
              structuralState: "stale",
            },
            {
              id: "environment:testing",
              envName: "testing",
              label: "testing",
              url: "https://testing.example.supabase.co",
              isActive: true,
              isRemovable: true,
              tone: "testing",
              density: "standard",
              structuralState: "stale",
            },
          ],
        },
        addEnvironmentForm: {
          isVisible: false,
          name: "",
          url: "",
          anonKey: "",
          canSubmit: false,
        },
        toolSection: {
          title: "TESTING TOOLS",
          actions: [
            {
              id: "tool:check-health",
              actionId: "check-health",
              title: "Database Health Check",
              description: "Verify database connection and integrity",
              icon: "medkit-outline",
              color: "#00BCD4",
              density: "standard",
              structuralState: "stale",
            },
          ],
        },
        productionWarning:
          "You are connected to PRODUCTION database. Be extremely careful!",
        loadingState: {
          isBusy: false,
          loadingMessage: "Processing...",
        },
      },
      actions: {
        handleNavigateBack: mockHandleNavigateBack,
        handleToolActionPress: mockHandleToolActionPress,
        handleEnvironmentPress: mockHandleEnvironmentPress,
        handleRemoveEnvironment: mockHandleRemoveEnvironment,
        handleToggleAddEnvironment: mockHandleToggleAddEnvironment,
        handleSubmitNewEnvironment: mockHandleSubmitNewEnvironment,
        setNewEnvironmentName: mockSetNewEnvironmentName,
        setNewEnvironmentUrl: mockSetNewEnvironmentUrl,
        setNewEnvironmentKey: mockSetNewEnvironmentKey,
      },
    });
  });

  it("renders access denied state from the adapter", () => {
    const { useDevAdminViewAdapter } = require("@/ui/viewAdapters/useDevAdminViewAdapter");

    useDevAdminViewAdapter.mockReturnValueOnce({
      output: {
        screenId: "DevAdminScreen",
        readiness: {
          hasInitialFrame: true,
          hasUsableData: false,
          isBackgroundRefreshing: false,
          isNavigationTransitionActive: false,
        },
        continuity: {
          isInitialLoading: false,
          isBackgroundRefreshing: false,
          hasCachedFrame: false,
          shouldRenderSkeletonShell: false,
          shouldRenderEmptyState: false,
          freshnessLabel: "Ready",
        },
        access: {
          isAllowed: false,
          deniedMessage: "Dev Admin Tools are restricted to authorized personnel only.",
          displayName: null,
          email: null,
          roleLabel: null,
        },
        title: "Dev Admin",
        userInfoLabel: "LOGGED IN AS",
        activeEnvironment: null,
        environmentSection: {
          title: "DATABASE ENVIRONMENTS",
          addActionLabel: "Add",
          environments: [],
        },
        addEnvironmentForm: {
          isVisible: false,
          name: "",
          url: "",
          anonKey: "",
          canSubmit: false,
        },
        toolSection: {
          title: "TESTING TOOLS",
          actions: [],
        },
        productionWarning: null,
        loadingState: {
          isBusy: false,
          loadingMessage: "Processing...",
        },
      },
      actions: {
        handleNavigateBack: mockHandleNavigateBack,
        handleToolActionPress: mockHandleToolActionPress,
        handleEnvironmentPress: mockHandleEnvironmentPress,
        handleRemoveEnvironment: mockHandleRemoveEnvironment,
        handleToggleAddEnvironment: mockHandleToggleAddEnvironment,
        handleSubmitNewEnvironment: mockHandleSubmitNewEnvironment,
        setNewEnvironmentName: mockSetNewEnvironmentName,
        setNewEnvironmentUrl: mockSetNewEnvironmentUrl,
        setNewEnvironmentKey: mockSetNewEnvironmentKey,
      },
    });

    const screen = render(<DevAdminScreen onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Access Denied")).toBeTruthy();
    expect(
      screen.getByText("Dev Admin Tools are restricted to authorized personnel only."),
    ).toBeTruthy();
  });

  it("renders adapter-driven admin content and delegates health checks through the adapter", () => {
    const screen = render(<DevAdminScreen onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Dev Admin")).toBeTruthy();
    expect(screen.getByText("Database Health Check")).toBeTruthy();
    expect(screen.getAllByText("testing").length).toBeGreaterThan(0);
    expect(screen.getByText("Modern UI")).toBeTruthy();

    fireEvent.press(screen.getByText("Database Health Check"));

    expect(mockHandleToolActionPress).toHaveBeenCalledWith("check-health");
  });
});
