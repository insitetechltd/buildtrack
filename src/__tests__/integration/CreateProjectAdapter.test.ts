import { act, renderHook } from "@testing-library/react-native";
import { Alert } from "react-native";

import { useCreateProjectViewAdapter } from "@/ui/viewAdapters/useCreateProjectViewAdapter";

jest.useFakeTimers();

const mockNavigateBack = jest.fn();
const mockAlert = jest.fn();

let mockStoreState = {
  projects: [] as Array<{ id: string; name: string }>,
};

const mockCreateProject = jest.fn(async () => {
  mockStoreState = {
    projects: [{ id: "project-1", name: "Tower B" }],
  };

  return "project-1";
});

const mockFetchProjects = jest.fn().mockResolvedValue(undefined);

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "admin-1",
      role: "admin",
      companyId: "company-1",
    },
  }),
}));

jest.mock("@/state/projectStore.supabase", () => {
  const store = {
    createProject: (...args: unknown[]) => mockCreateProject(...args),
    fetchProjects: (...args: unknown[]) => mockFetchProjects(...args),
    projects: [] as Array<{ id: string; name: string }>,
  };

  const useProjectStoreWithCompanyInit = jest.fn(() => store);
  const useProjectStore = jest.fn(() => mockStoreState);
  useProjectStore.getState = () => mockStoreState;

  return {
    useProjectStoreWithCompanyInit,
    useProjectStore,
  };
});

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: () => ({
    getCompanyBanner: jest.fn(),
  }),
}));

jest.mock("@/types/buildtrack", () => {
  const actual = jest.requireActual("@/types/buildtrack");

  return {
    ...actual,
    isAdmin: jest.fn(() => true),
  };
});

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    projects: {
      projectCreated: "Project Created",
      projectCreatedMessage: "Project created.",
      failedToCreateProject: "Failed to create project.",
      createNewProject: "Create New Project",
      create: "Create",
    },
    errors: {
      error: "Error",
    },
    common: {
      ok: "OK",
    },
  }),
}));

jest.mock("@/utils/DataRefreshManager", () => ({
  notifyDataMutation: jest.fn(),
}));

describe("useCreateProjectViewAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = {
      projects: [],
    };
    jest.spyOn(Alert, "alert").mockImplementation(mockAlert);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("navigates back when the authoritative project store contains the created project", async () => {
    const { result } = renderHook(() =>
      useCreateProjectViewAdapter({
        onNavigateBack: mockNavigateBack,
      }),
    );

    const submission = {
      name: "Tower B",
      description: "South block expansion",
      status: "planning" as const,
      startDate: new Date("2026-06-20T00:00:00.000Z"),
      endDate: new Date("2026-12-20T00:00:00.000Z"),
      location: "Site B",
      clientInfo: {
        name: "Acme Construction",
        email: "ops@acme.test",
        phone: "555-0100",
      },
    };

    await act(async () => {
      const promise = result.current.actions.submitProject(submission);
      await jest.advanceTimersByTimeAsync(10000);
      await promise;
    });

    expect(mockCreateProject).toHaveBeenCalled();
    expect(mockFetchProjects).toHaveBeenCalled();
    expect(mockNavigateBack).toHaveBeenCalledWith("project-1");
    expect(mockAlert).not.toHaveBeenCalled();
  });
});
