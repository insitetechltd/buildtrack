import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ReassignTaskScreen from "@/screens/ReassignTaskScreen";

const mockGoBack = jest.fn();
const mockOnReassign = jest.fn().mockResolvedValue(undefined);

jest.mock("@/components/StandardHeader", () => ({
  __esModule: true,
  default: function MockStandardHeader({
    title,
  }: {
    title: string;
  }) {
    const { Text } = require("react-native");

    return <Text>{title}</Text>;
  },
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      taskId: "task-1",
      onReassign: mockOnReassign,
    },
  }),
}));

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "user-1",
      companyId: "company-1",
    },
  }),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: (selector?: (state: any) => unknown) => {
    const state = {
      tasks: [
        {
          id: "task-1",
          projectId: "project-1",
          title: "Repair punch list",
        },
      ],
    };

    return typeof selector === "function" ? selector(state) : state;
  },
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStore: () => ({
    getUserById: (id: string) => {
      if (id === "user-2") {
        return {
          id: "user-2",
          name: "Chris Wong",
          role: "manager",
          email: "chris@example.com",
        };
      }

      return undefined;
    },
  }),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithCompanyInit: () => ({
    getProjectUserAssignments: () => [
      {
        userId: "user-2",
        isActive: true,
      },
    ],
  }),
}));

jest.mock("@/state/userPreferencesStore", () => ({
  useUserPreferencesStore: () => ({
    isFavoriteUser: () => false,
    toggleFavoriteUser: jest.fn(),
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
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe("ReassignTaskScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders searchable assignee rows and completes the reassignment flow", async () => {
    const screen = render(<ReassignTaskScreen />);
    const searchInput = screen.getByPlaceholderText(/search/i);

    expect(searchInput).toBeTruthy();
    expect(screen.getByText("Chris Wong")).toBeTruthy();

    fireEvent.changeText(searchInput, "Chris");
    await waitFor(() => {
      expect(searchInput.props.value).toBe("Chris");
    });

    fireEvent.press(screen.getByTestId("reassign-task-user-user-2"));
    fireEvent.press(screen.getByText("Reassign (1)"));

    await waitFor(() => {
      expect(mockOnReassign).toHaveBeenCalledWith(["user-2"]);
    });
    expect(mockGoBack).toHaveBeenCalled();
  });
});
