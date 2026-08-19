import { act, renderHook } from "@testing-library/react-native";

import { triggerRefresh } from "@/utils/DataRefreshManager";
import { usePullToRefresh } from "@/utils/usePullToRefresh";

jest.mock("@/utils/DataRefreshManager", () => ({
  triggerRefresh: jest.fn(() => Promise.resolve()),
}));

const mockTriggerRefresh = triggerRefresh as jest.MockedFunction<typeof triggerRefresh>;

describe("usePullToRefresh", () => {
  beforeEach(() => {
    mockTriggerRefresh.mockReset();
    mockTriggerRefresh.mockResolvedValue(undefined);
  });

  it("sets pull-refreshing only while triggerRefresh is in flight", async () => {
    let resolveRefresh: (() => void) | undefined;
    mockTriggerRefresh.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const { result } = renderHook(() => usePullToRefresh());

    expect(result.current.isPullRefreshing).toBe(false);

    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.handlePullRefresh();
    });

    expect(result.current.isPullRefreshing).toBe(true);

    await act(async () => {
      resolveRefresh?.();
      await pending;
    });

    expect(mockTriggerRefresh).toHaveBeenCalledTimes(1);
    expect(mockTriggerRefresh).toHaveBeenCalledWith({ force: true });
    expect(result.current.isPullRefreshing).toBe(false);
  });

  it("clears pull-refreshing if triggerRefresh rejects", async () => {
    mockTriggerRefresh.mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(() => usePullToRefresh());

    await act(async () => {
      await result.current.handlePullRefresh();
    });

    expect(result.current.isPullRefreshing).toBe(false);
  });
});
