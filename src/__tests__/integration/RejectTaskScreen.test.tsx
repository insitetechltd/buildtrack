import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import RejectTaskScreen from "@/screens/RejectTaskScreen";

const mockGoBack = jest.fn();
const mockFetchTaskById = jest.fn().mockResolvedValue(undefined);
const mockRejectTaskCompletion = jest.fn().mockResolvedValue(undefined);
const mockRejectSubTaskCompletion = jest.fn().mockResolvedValue(undefined);

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
          title: "Repair punch list",
        },
      ],
      fetchTaskById: mockFetchTaskById,
      rejectTaskCompletion: mockRejectTaskCompletion,
      rejectSubTaskCompletion: mockRejectSubTaskCompletion,
    };

    return typeof selector === "function" ? selector(state) : state;
  },
}));

jest.mock("@/utils/useFileUpload", () => ({
  useFileUpload: () => ({
    pickAndUploadImages: jest.fn(),
  }),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    taskDetail: {
      reject: "Reject",
    },
    common: {
      loading: "Loading...",
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
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe("RejectTaskScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  });

  it("renders the form, opens photo options, and submits the rejection flow", async () => {
    const screen = render(<RejectTaskScreen />);

    const reasonInput = screen.getByPlaceholderText(/reason/i);
    const rejectButtons = screen.getAllByText("Reject");
    let rejectPressTarget: any = rejectButtons[1];

    while (rejectPressTarget && typeof rejectPressTarget.props?.onPress !== "function") {
      rejectPressTarget = rejectPressTarget.parent;
    }

    expect(reasonInput).toBeTruthy();
    expect(rejectPressTarget).toBeTruthy();

    fireEvent.changeText(reasonInput, "Incorrect scope");
    fireEvent.press(screen.getByText("Add Photos"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Add Photos",
      "Choose how you want to add photos",
      expect.any(Array),
    );

    await act(async () => {
      await rejectPressTarget.props.onPress();
    });

    await waitFor(() => {
      expect(mockRejectTaskCompletion).toHaveBeenCalledWith(
        "task-1",
        "user-1",
        "Incorrect scope",
        [],
      );
    });
    expect(mockFetchTaskById).toHaveBeenCalledWith("task-1");
    expect(mockGoBack).toHaveBeenCalled();
  });
});
