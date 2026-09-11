import { Alert, Linking } from "react-native";

import { COMPANY_PLAN_MANAGEMENT_URL } from "@/legal/legalLinks";
import { showCompanyPlanWebManagementAlert } from "../showCompanyPlanWebManagementAlert";

describe("showCompanyPlanWebManagementAlert", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows a manage-on-web alert and opens the billing page", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const openSpy = jest
      .spyOn(Linking, "openURL")
      .mockResolvedValue(undefined as never);

    showCompanyPlanWebManagementAlert();

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe("Manage plan on the web");
    expect(String(message)).toMatch(/cancel/i);
    expect(Array.isArray(buttons)).toBe(true);

    const open = (buttons as Array<{ text?: string; onPress?: () => void }>).find(
      (b) => b.text === "Open website",
    );
    expect(typeof open?.onPress).toBe("function");
    open?.onPress?.();
    expect(openSpy).toHaveBeenCalledWith(COMPANY_PLAN_MANAGEMENT_URL);
  });
});
