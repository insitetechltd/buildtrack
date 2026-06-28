import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import CreateProjectScreen from "@/screens/CreateProjectScreen";

jest.mock("@/ui/viewAdapters/useCreateProjectViewAdapter", () => ({
  useCreateProjectViewAdapter: jest.fn(),
}));

jest.mock("@/components/StandardHeader", () => ({
  __esModule: true,
  default: function MockStandardHeader({ title }: { title: string }) {
    const { View, Text } = require("react-native");

    return (
      <View>
        <Text>{title}</Text>
      </View>
    );
  },
}));

jest.mock("@/components/ProjectForm", () => ({
  __esModule: true,
  default: function MockProjectForm({
    onSubmit,
    submitButtonText,
  }: {
    onSubmit: (formData: unknown) => Promise<void>;
    submitButtonText: string;
  }) {
    const { Pressable, Text } = require("react-native");

    return (
      <Pressable
        testID="create-project__submit"
        onPress={() =>
          void onSubmit({
            name: "Tower B",
            description: "South block expansion",
            status: "planning",
            startDate: new Date("2026-06-20T00:00:00.000Z"),
            endDate: new Date("2026-12-20T00:00:00.000Z"),
            location: "Site B",
            clientInfo: {
              name: "Acme Construction",
              email: "ops@acme.test",
              phone: "555-0100",
            },
          })
        }
      >
        <Text>{submitButtonText}</Text>
      </Pressable>
    );
  },
}));

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "admin-1",
      role: "admin",
      companyId: "company-1",
    },
  }),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithCompanyInit: () => ({
    createProject: jest.fn().mockResolvedValue("project-1"),
    fetchProjects: jest.fn().mockResolvedValue(undefined),
    projects: [],
  }),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: () => ({
    getCompanyBanner: jest.fn(),
  }),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    userManagement: {
      accessDenied: "Access denied",
    },
    projects: {
      createNewProject: "Create New Project",
      create: "Create",
      projectCreated: "Project Created",
      projectCreatedMessage: "Project created.",
      failedToCreateProject: "Failed to create project.",
    },
    common: {
      ok: "OK",
    },
    errors: {
      error: "Error",
    },
  }),
}));

jest.mock("@/types/buildtrack", () => {
  const actual = jest.requireActual("@/types/buildtrack");

  return {
    ...actual,
    isAdmin: jest.fn(() => true),
  };
});

jest.mock("@/utils/DataRefreshManager", () => ({
  notifyDataMutation: jest.fn(),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("CreateProjectScreen", () => {
  const mockSubmitProject = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();

    const { useCreateProjectViewAdapter } = require("@/ui/viewAdapters/useCreateProjectViewAdapter");

    useCreateProjectViewAdapter.mockReturnValue({
      output: {
        screenId: "CreateProjectScreen",
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
        },
        isSubmitting: false,
        headerTitle: "Create New Project",
        submitButtonText: "Create",
        canSubmit: true,
        companyBanner: null,
      },
      actions: {
        submitProject: mockSubmitProject,
        cancel: jest.fn(),
      },
    });
  });

  it("keeps create-project submission wired through the view adapter", () => {
    const screen = render(<CreateProjectScreen onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Create New Project")).toBeTruthy();

    fireEvent.press(screen.getByTestId("create-project__submit"));

    expect(mockSubmitProject).toHaveBeenCalled();
  });
});
