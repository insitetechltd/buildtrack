import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import AddCommentScreen from "@/screens/AddCommentScreen";

jest.mock(
  "@/ui/viewAdapters/useAddCommentViewAdapter",
  () => ({
    useAddCommentViewAdapter: jest.fn(),
  }),
);

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
    goBack: jest.fn(),
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
      fetchTaskById: jest.fn().mockResolvedValue(undefined),
      addAssignerComment: jest.fn().mockResolvedValue(undefined),
    };

    return typeof selector === "function" ? selector(state) : state;
  },
}));

jest.mock("@/utils/useFileUpload", () => ({
  useFileUpload: () => ({
    pickAndUploadImages: jest.fn(),
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

describe("AddCommentScreen", () => {
  const mockSetComment = jest.fn();
  const mockSubmitComment = jest.fn();
  const mockAddPhotos = jest.fn();
  const mockRemovePhoto = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const { useAddCommentViewAdapter } = require("@/ui/viewAdapters/useAddCommentViewAdapter");

    useAddCommentViewAdapter.mockReturnValue({
      output: {
        screenId: "AddCommentScreen",
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
        commentForm: {
          description: "",
          isSubmitting: false,
          isValid: true,
        },
        photoAttachments: [
          {
            id: "photo-1",
            uri: "https://example.com/photo-1.jpg",
            density: "standard",
            structuralState: "stale",
            onRemove: mockRemovePhoto,
          },
        ],
      },
      actions: {
        setCommentDescription: mockSetComment,
        handleAddPhotos: mockAddPhotos,
        handleSubmitComment: mockSubmitComment,
      },
    });
  });

  it("renders the form, updates comment text, and delegates submit through the adapter", () => {
    const screen = render(<AddCommentScreen />);

    expect(screen.getByPlaceholderText(/comment/i)).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText(/comment/i), "Need more detail");
    fireEvent.press(screen.getAllByText("Add Comment")[1]);

    expect(mockSetComment).toHaveBeenCalledWith("Need more detail");
    expect(mockSubmitComment).toHaveBeenCalled();
  });
});
