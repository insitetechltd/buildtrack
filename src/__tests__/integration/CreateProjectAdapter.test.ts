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
const mockAssignUserToProject = jest.fn().mockResolvedValue(undefined);
const mockUpdateUserProjectCategory = jest.fn().mockResolvedValue(undefined);
const mockFetchUsersByCompany = jest.fn().mockResolvedValue(undefined);

const mockUsers = [
  {
    id: "admin-1",
    name: "Sara",
    email: "sara@test.com",
    companyId: "company-1",
    role: "admin",
    systemPermission: "admin",
    isActive: true,
  },
  {
    id: "worker-1",
    name: "Wes",
    email: "wes@test.com",
    companyId: "company-1",
    role: "member",
    systemPermission: "member",
    isActive: true,
  },
];

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    user: {
      id: "admin-1",
      role: "admin",
      companyId: "company-1",
      systemPermission: "admin",
    },
  }),
}));

jest.mock("@/state/projectStore.supabase", () => {
  const store = {
    createProject: (...args: unknown[]) => mockCreateProject(...args),
    fetchProjects: (...args: unknown[]) => mockFetchProjects(...args),
    assignUserToProject: (...args: unknown[]) => mockAssignUserToProject(...args),
    updateUserProjectCategory: (...args: unknown[]) =>
      mockUpdateUserProjectCategory(...args),
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

jest.mock("@/state/userStore.supabase", () => ({
  useUserStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      users: mockUsers,
      fetchUsersByCompany: mockFetchUsersByCompany,
    };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

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
    userManagement: {
      accessDenied: "Access denied.",
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

  it("exposes same-company roster candidates for intentional placement", () => {
    const { result } = renderHook(() =>
      useCreateProjectViewAdapter({
        onNavigateBack: mockNavigateBack,
      }),
    );

    expect(result.current.output.rosterCandidates.map((r) => r.userId).sort()).toEqual([
      "admin-1",
      "worker-1",
    ]);
    expect(
      result.current.output.rosterCandidates.find((r) => r.userId === "worker-1")
        ?.canBeProjectAdmin,
    ).toBe(false);
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
      initialMembers: [
        { userId: "admin-1", asProjectAdmin: true },
        { userId: "worker-1", asProjectAdmin: false },
      ],
    };

    await act(async () => {
      const promise = result.current.actions.submitProject(submission);
      await jest.advanceTimersByTimeAsync(10000);
      await promise;
    });

    expect(mockCreateProject).toHaveBeenCalled();
    expect(mockAssignUserToProject).toHaveBeenCalled();
    expect(mockFetchProjects).toHaveBeenCalled();
    expect(mockNavigateBack).toHaveBeenCalledWith("project-1");
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it("blocks submit when more than one Project Admin is selected", async () => {
    const { result } = renderHook(() =>
      useCreateProjectViewAdapter({
        onNavigateBack: mockNavigateBack,
      }),
    );

    await act(async () => {
      await result.current.actions.submitProject({
        name: "Tower B",
        description: "South block expansion",
        status: "planning",
        startDate: new Date("2026-06-20T00:00:00.000Z"),
        endDate: new Date("2026-12-20T00:00:00.000Z"),
        location: "Site B",
        clientInfo: { name: "Acme", email: "", phone: "" },
        initialMembers: [
          { userId: "admin-1", asProjectAdmin: true },
          { userId: "worker-1", asProjectAdmin: true },
        ],
      });
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalled();
  });
});
