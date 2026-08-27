import { act, renderHook } from "@testing-library/react-native";
import { useActivityFeedReadStore } from "@/state/activityFeedReadStore";

describe("activityFeedReadStore", () => {
  beforeEach(() => {
    useActivityFeedReadStore.setState({ lastSeenAtByScope: {} });
  });

  it("stores and reads last seen timestamps per user and project", () => {
    const { result } = renderHook(() => useActivityFeedReadStore());

    expect(result.current.getLastSeenAt("user-1", "project-1")).toBeNull();

    act(() => {
      result.current.markActivityFeedSeen("user-1", "project-1", 1000);
    });

    expect(result.current.getLastSeenAt("user-1", "project-1")).toBe(1000);

    act(() => {
      result.current.markActivityFeedSeen("user-1", "project-1", 900);
    });

    expect(result.current.getLastSeenAt("user-1", "project-1")).toBe(1000);
  });
});
