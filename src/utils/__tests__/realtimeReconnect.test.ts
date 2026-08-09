import {
  nextRealtimeReconnectDelayMs,
  REALTIME_RECONNECT_BASE_MS,
  REALTIME_RECONNECT_MAX_MS,
  shouldScheduleRealtimeReconnect,
} from "../realtimeReconnect";

describe("realtimeReconnect", () => {
  it("grows exponentially then caps", () => {
    expect(nextRealtimeReconnectDelayMs(0)).toBe(REALTIME_RECONNECT_BASE_MS);
    expect(nextRealtimeReconnectDelayMs(1)).toBe(2_000);
    expect(nextRealtimeReconnectDelayMs(2)).toBe(4_000);
    expect(nextRealtimeReconnectDelayMs(10)).toBe(REALTIME_RECONNECT_MAX_MS);
  });

  it("floors negative attempts at base delay", () => {
    expect(nextRealtimeReconnectDelayMs(-3)).toBe(REALTIME_RECONNECT_BASE_MS);
  });

  it("schedules reconnect only for failure statuses when not tearing down", () => {
    expect(shouldScheduleRealtimeReconnect("CHANNEL_ERROR", false)).toBe(true);
    expect(shouldScheduleRealtimeReconnect("CLOSED", false)).toBe(true);
    expect(shouldScheduleRealtimeReconnect("TIMED_OUT", false)).toBe(true);
    expect(shouldScheduleRealtimeReconnect("SUBSCRIBED", false)).toBe(false);
    expect(shouldScheduleRealtimeReconnect("CLOSED", true)).toBe(false);
  });
});
