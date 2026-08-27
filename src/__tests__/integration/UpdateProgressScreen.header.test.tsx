import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import UpdateProgressScreen from "../../screens/UpdateProgressScreen";
import { useUpdateProgressViewAdapter } from "../../ui/viewAdapters/useUpdateProgressViewAdapter";

const mockGoBack = jest.fn();

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      callback();
    },
  };
});

jest.mock("../../ui/viewAdapters/useUpdateProgressViewAdapter", () => ({
  useUpdateProgressViewAdapter: jest.fn(),
}));

jest.mock("../../state/authStore", () => ({
  useAuthStore: () => ({
    user: { id: "user-1", companyId: "company-1", name: "Casey" },
  }),
}));

jest.mock("../../state/companyStore", () => ({
  useCompanyStore: () => ({
    getCompanyBanner: () => null,
  }),
}));

jest.mock("../../state/themeStore", () => ({
  useThemeStore: () => ({
    isDarkMode: false,
  }),
}));

jest.mock("../../utils/useTranslation", () => ({
  useTranslation: () => ({
    taskDetail: {
      progressUpdate: "Progress Update",
      photosAndFiles: "Photos & Files",
      tapToAddFiles: "Tap to add files",
      updateDescription: "Update Description",
      updateDescriptionPlaceholder: "Describe progress",
      completionPercentage: "Completion Percentage",
      current: "Current",
      previous: "Previous",
      submitUpdate: "Submit Update",
    },
    common: {
      loading: "Loading",
    },
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@react-native-community/slider", () => "Slider");

jest.mock("../../components/ProfileMenu", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../api/supabase", () => ({
  checkSupabaseConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../utils/environmentDetector", () => ({
  detectEnvironment: () => ({ mode: "test" }),
  getEnvironmentStyles: () => ({}),
}));

describe("UpdateProgressScreen header regression", () => {
  const mockUseUpdateProgressViewAdapter =
    useUpdateProgressViewAdapter as jest.MockedFunction<typeof useUpdateProgressViewAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack.mockReset();
  });

  it("renders the header title and marker and routes back presses through navigation", () => {
    mockUseUpdateProgressViewAdapter.mockReturnValue({
      output: {
        readiness: {
          hasUsableData: true,
        },
        photos: [],
        scalarMetrics: {
          totalPhotos: 0,
        },
        form: {
          description: "",
          completionPercentage: 25,
          previousPercentage: 10,
          isSubmitting: false,
        },
      },
      actions: {
        handleAddPhotos: jest.fn(),
        setDescription: jest.fn(),
        setCompletionPercentage: jest.fn(),
        handleSubmitUpdate: jest.fn(),
      },
      task: {
        id: "task-1",
        title: "Install lobby lighting",
      },
    } as ReturnType<typeof useUpdateProgressViewAdapter>);

    const onNavigateBack = jest.fn();
    const screen = render(<UpdateProgressScreen onNavigateBack={onNavigateBack} />);

    expect(screen.getByText("Progress Update")).toBeTruthy();
    expect(screen.getByTestId("update-progress__task_title")).toHaveTextContent(
      "Install lobby lighting",
    );
    expect(screen.getByTestId("app-screen-header__profile-trigger")).toBeTruthy();
    expect(screen.getByTestId("update-progress__take_photo")).toBeTruthy();
    expect(screen.getByTestId("file-upload-harness__plus_icon")).toBeTruthy();

    fireEvent.press(screen.getByTestId("app-screen-header__back"));

    expect(onNavigateBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
