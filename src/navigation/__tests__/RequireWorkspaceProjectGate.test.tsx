import React from "react";
import { Text } from "react-native";
import { render, waitFor } from "@testing-library/react-native";

import { RequireWorkspaceProjectGate } from "@/navigation/RequireWorkspaceProjectGate";

jest.mock("@/screens/ProjectPickerScreen", () => {
  const ReactNative = require("react-native");
  return function MockProjectPickerScreen({
    allowBack,
  }: {
    allowBack?: boolean;
  }) {
    return (
      <ReactNative.Text>{`forced-picker allowBack=${String(allowBack)}`}</ReactNative.Text>
    );
  };
});

const mockAuthState = {
  user: { id: "user-1", role: "manager", companyId: "co-a" } as {
    id: string;
    role: string;
    companyId: string;
  } | null,
};

jest.mock("@/state/authStore", () => ({
  useAuthStore: (selector?: (state: typeof mockAuthState) => unknown) =>
    selector ? selector(mockAuthState) : mockAuthState,
}));

const mockSetSelectedProject = jest.fn().mockResolvedValue(undefined);
const mockProjectFilterState = {
  selectedProjectId: null as string | null,
  setSelectedProject: mockSetSelectedProject,
};

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: (selector?: (state: typeof mockProjectFilterState) => unknown) =>
    selector ? selector(mockProjectFilterState) : mockProjectFilterState,
}));

const mockProjectState = {
  projects: [] as Array<{ id: string; companyId: string }>,
  projectIdsByUser: {} as Record<string, string[]>,
  projectQueryMeta: {} as Record<string, { hasFetchedOnce?: boolean }>,
  assignmentQueryMeta: {} as Record<string, { hasFetchedOnce?: boolean }>,
  isLoading: false,
};

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStore: (selector?: (state: typeof mockProjectState) => unknown) =>
    selector ? selector(mockProjectState) : mockProjectState,
}));

describe("RequireWorkspaceProjectGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.user = { id: "user-1", role: "manager", companyId: "co-a" };
    mockProjectFilterState.selectedProjectId = null;
    mockProjectState.projects = [];
    mockProjectState.projectIdsByUser = {};
    mockProjectState.projectQueryMeta = {};
    mockProjectState.assignmentQueryMeta = {};
    mockProjectState.isLoading = false;
  });

  it("auto-selects the sole membership project before opening the field shell", async () => {
    mockProjectState.projects = [{ id: "proj-office", companyId: "co-a" }];
    mockProjectState.projectIdsByUser = { "user-1": ["proj-office"] };
    mockProjectState.assignmentQueryMeta = {
      "assignments:user:user-1": { hasFetchedOnce: true },
    };
    mockProjectState.projectQueryMeta = {
      "projects:all": { hasFetchedOnce: true },
    };

    render(
      <RequireWorkspaceProjectGate>
        <Text>field shell</Text>
      </RequireWorkspaceProjectGate>,
    );

    await waitFor(() => {
      expect(mockSetSelectedProject).toHaveBeenCalledWith("proj-office", "user-1");
    });
  });

  it("forces the project picker when multiple memberships and no selection", async () => {
    mockProjectState.projects = [
      { id: "proj-office", companyId: "co-a" },
      { id: "proj-site", companyId: "co-a" },
    ];
    mockProjectState.projectIdsByUser = {
      "user-1": ["proj-office", "proj-site"],
    };
    mockProjectState.assignmentQueryMeta = {
      "assignments:user:user-1": { hasFetchedOnce: true },
    };
    mockProjectState.projectQueryMeta = {
      "projects:all": { hasFetchedOnce: true },
    };

    const screen = render(
      <RequireWorkspaceProjectGate>
        <Text>field shell</Text>
      </RequireWorkspaceProjectGate>,
    );

    expect(screen.getByText("forced-picker allowBack=false")).toBeTruthy();
    expect(screen.queryByText("field shell")).toBeNull();
  });

  it("drops other-company memberships so a sole same-company project can auto-open", async () => {
    mockProjectState.projects = [
      { id: "proj-office", companyId: "co-a" },
      { id: "proj-foreign", companyId: "co-b" },
    ];
    mockProjectState.projectIdsByUser = {
      "user-1": ["proj-office", "proj-foreign"],
    };
    mockProjectState.assignmentQueryMeta = {
      "assignments:user:user-1": { hasFetchedOnce: true },
    };
    mockProjectState.projectQueryMeta = {
      "projects:all": { hasFetchedOnce: true },
    };

    render(
      <RequireWorkspaceProjectGate>
        <Text>field shell</Text>
      </RequireWorkspaceProjectGate>,
    );

    await waitFor(() => {
      expect(mockSetSelectedProject).toHaveBeenCalledWith("proj-office", "user-1");
    });
  });

  it("opens the field shell once a valid project is selected", () => {
    mockProjectFilterState.selectedProjectId = "proj-office";
    mockProjectState.projects = [
      { id: "proj-office", companyId: "co-a" },
      { id: "proj-site", companyId: "co-b" },
    ];
    mockProjectState.projectIdsByUser = {
      "user-1": ["proj-office", "proj-site"],
    };
    mockProjectState.assignmentQueryMeta = {
      "assignments:user:user-1": { hasFetchedOnce: true },
    };
    mockProjectState.projectQueryMeta = {
      "projects:all": { hasFetchedOnce: true },
    };

    const screen = render(
      <RequireWorkspaceProjectGate>
        <Text>field shell</Text>
      </RequireWorkspaceProjectGate>,
    );

    expect(screen.getByText("field shell")).toBeTruthy();
    expect(screen.queryByText(/forced-picker/)).toBeNull();
  });

  it("clears a selected project that is no longer in membership", async () => {
    mockProjectFilterState.selectedProjectId = "proj-left";
    mockProjectState.projects = [{ id: "proj-office", companyId: "co-a" }];
    mockProjectState.projectIdsByUser = { "user-1": ["proj-office"] };
    mockProjectState.assignmentQueryMeta = {
      "assignments:user:user-1": { hasFetchedOnce: true },
    };
    mockProjectState.projectQueryMeta = {
      "projects:all": { hasFetchedOnce: true },
    };

    render(
      <RequireWorkspaceProjectGate>
        <Text>field shell</Text>
      </RequireWorkspaceProjectGate>,
    );

    await waitFor(() => {
      expect(mockSetSelectedProject).toHaveBeenCalledWith(null, "user-1");
    });
  });
});
