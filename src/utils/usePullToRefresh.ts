import { useCallback, useState } from "react";

import { triggerRefresh } from "@/utils/DataRefreshManager";

/**
 * Operator pull-to-refresh only. Do not bind `refreshing` to the 60s poll.
 * Does not scroll the list; callers must keep the ScrollView mounted.
 */
export function usePullToRefresh() {
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const handlePullRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await triggerRefresh({ force: true });
    } catch {
      // Keep the current list; spinner still clears.
    } finally {
      setIsPullRefreshing(false);
    }
  }, []);

  return { isPullRefreshing, handlePullRefresh };
}
