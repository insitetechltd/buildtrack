import { renderHook } from "@testing-library/react-native";
import { useActivityTabBadgeCount } from "../useActivityTabBadgeCount";

jest.mock("@/state/authStore", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithInit: jest.fn(),
}));

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: jest.fn(),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: jest.fn(),
}));

jest.mock("@/state/unattachedPhotoBatchStore", () => ({
  useUnattachedPhotoBatchStore: jest.fn(),
}));

jest.mock("@/state/activityFeedReadStore", () => ({
  useActivityFeedReadStore: jest.fn(),
}));

describe("useActivityTabBadgeCount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-04T09:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns unread Recent Activity count for the active workspace project", () => {
    const { useAuthStore } = require("@/state/authStore");
    const { useProjectStoreWithInit } = require("@/state/projectStore.supabase");
    const { useProjectFilterStore } = require("@/state/projectFilterStore");
    const { useTaskStore } = require("@/state/taskStore.supabase");
    const { useUnattachedPhotoBatchStore } = require("@/state/unattachedPhotoBatchStore");
    const { useActivityFeedReadStore } = require("@/state/activityFeedReadStore");

    const recentTimestamp = new Date("2026-07-04T08:00:00.000Z").toISOString();
    const olderTimestamp = new Date("2026-07-03T08:00:00.000Z").toISOString();

    useAuthStore.mockImplementation((selector: (state: { user: { id: string; role: string } | null }) => unknown) =>
      selector({ user: { id: "user-1", role: "supervisor" } }),
    );

    useProjectFilterStore.mockImplementation((selector: (state: { selectedProjectId: string | null }) => unknown) =>
      selector({ selectedProjectId: "project-1" }),
    );

    useProjectStoreWithInit.mockReturnValue({
      getProjectsByUser: () => [{ id: "project-1", name: "Tower A", companyId: "company-1" }],
      projects: [{ id: "project-1", name: "Tower A", companyId: "company-1" }],
      projectIdsByUser: { "user-1": ["project-1"] },
      projectQueryMeta: { "projects:all": { hasFetchedOnce: true } },
    });

    useTaskStore.mockImplementation((selector: (state: { tasksById: Record<string, unknown> }) => unknown) =>
      selector({
        tasksById: {
          "task-1": {
            id: "task-1",
            projectId: "project-1",
            status: "in_progress",
            title: "Recent task",
            createdAt: recentTimestamp,
            updates: [
              {
                id: "update-1",
                timestamp: recentTimestamp,
                status: "in_progress",
                description: "Latest update",
              },
            ],
          },
          "task-2": {
            id: "task-2",
            projectId: "project-1",
            status: "new",
            title: "Older task",
            createdAt: olderTimestamp,
            updates: [
              {
                id: "update-2",
                timestamp: olderTimestamp,
                status: "new",
                description: "Older update",
              },
            ],
          },
        },
      }),
    );

    useUnattachedPhotoBatchStore.mockImplementation((selector: (state: { getBatchesForProject: () => [] }) => unknown) =>
      selector({ getBatchesForProject: () => [] }),
    );

    useActivityFeedReadStore.mockImplementation((selector: (state: { getLastSeenAt: () => number | null }) => unknown) =>
      selector({
        getLastSeenAt: () => new Date("2026-07-03T12:00:00.000Z").getTime(),
      }),
    );

    const { result } = renderHook(() => useActivityTabBadgeCount());

    expect(result.current).toBe(1);
  });

  it("hides the badge when there is no active project", () => {
    const { useAuthStore } = require("@/state/authStore");
    const { useProjectStoreWithInit } = require("@/state/projectStore.supabase");
    const { useProjectFilterStore } = require("@/state/projectFilterStore");
    const { useTaskStore } = require("@/state/taskStore.supabase");
    const { useUnattachedPhotoBatchStore } = require("@/state/unattachedPhotoBatchStore");
    const { useActivityFeedReadStore } = require("@/state/activityFeedReadStore");

    useAuthStore.mockImplementation((selector: (state: { user: { id: string; role: string } | null }) => unknown) =>
      selector({ user: { id: "user-1", role: "worker" } }),
    );
    useProjectFilterStore.mockImplementation((selector: (state: { selectedProjectId: string | null }) => unknown) =>
      selector({ selectedProjectId: null }),
    );
    useProjectStoreWithInit.mockReturnValue({
      getProjectsByUser: () => [],
      projects: [],
      projectIdsByUser: { "user-1": [] },
      projectQueryMeta: { "projects:all": { hasFetchedOnce: true } },
    });
    useTaskStore.mockImplementation((selector: (state: { tasksById: Record<string, unknown> }) => unknown) =>
      selector({ tasksById: {} }),
    );
    useUnattachedPhotoBatchStore.mockImplementation((selector: (state: { getBatchesForProject: () => [] }) => unknown) =>
      selector({ getBatchesForProject: () => [] }),
    );
    useActivityFeedReadStore.mockImplementation((selector: (state: { getLastSeenAt: () => number | null }) => unknown) =>
      selector({ getLastSeenAt: () => null }),
    );

    const { result } = renderHook(() => useActivityTabBadgeCount());

    expect(result.current).toBeUndefined();
  });
});
