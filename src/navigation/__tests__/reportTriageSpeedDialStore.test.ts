import {
  setReportTriageDialExpanded,
  useReportTriageDialExpanded,
  toggleReportTriageDialExpanded,
} from "../reportTriageSpeedDialStore";
import { renderHook, act } from "@testing-library/react-native";

describe("reportTriageSpeedDialStore", () => {
  beforeEach(() => {
    setReportTriageDialExpanded(false);
  });

  it("toggles expanded state", () => {
    const { result } = renderHook(() => useReportTriageDialExpanded());
    expect(result.current).toBe(false);

    act(() => {
      toggleReportTriageDialExpanded();
    });
    expect(result.current).toBe(true);

    act(() => {
      setReportTriageDialExpanded(false);
    });
    expect(result.current).toBe(false);
  });
});
