import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CompanyBanner from "../CompanyBanner";
import { resolveCompanyBannerImageUrl } from "../../api/companyBannerStorage";
import { useCompanyStore } from "../../state/companyStore";

jest.mock("../../api/companyBannerStorage", () => ({
  resolveCompanyBannerImageUrl: jest.fn(),
}));

jest.mock("../../state/companyStore", () => ({
  useCompanyStore: jest.fn(),
}));

describe("CompanyBanner", () => {
  const ensureCompanyLoaded = jest.fn().mockResolvedValue(null);

  beforeEach(() => {
    jest.clearAllMocks();
    (useCompanyStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        getCompanyBanner: () => ({
          text: "Safety First",
          backgroundColor: "#111",
          textColor: "#fff",
          isVisible: true,
          imageStoragePath: "company-1/branding/banner.jpg",
        }),
        companies: [{ id: "company-1", name: "Acme" }],
        ensureCompanyLoaded,
      }),
    );
  });

  it("hydrates company and renders the shared banner image for every seat", async () => {
    (resolveCompanyBannerImageUrl as jest.Mock).mockResolvedValue(
      "https://signed.example/banner.jpg",
    );

    const screen = render(<CompanyBanner companyId="company-1" />);

    expect(ensureCompanyLoaded).toHaveBeenCalledWith("company-1");
    await waitFor(() => {
      expect(screen.getByTestId("company-banner__image")).toBeTruthy();
    });
  });

  it("falls back to text when no resolvable image exists", async () => {
    (resolveCompanyBannerImageUrl as jest.Mock).mockResolvedValue(null);

    const screen = render(<CompanyBanner companyId="company-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("company-banner__text")).toBeTruthy();
      expect(screen.getByText("Safety First")).toBeTruthy();
    });
  });

  it("renders a plan entrance strip when no custom banner exists", () => {
    (useCompanyStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        getCompanyBanner: () => undefined,
        companies: [{ id: "company-1", name: "Acme" }],
        ensureCompanyLoaded,
      }),
    );

    const onPress = jest.fn();
    const screen = render(
      <CompanyBanner
        companyId="company-1"
        showPlanEntranceFallback
        onPress={onPress}
      />,
    );

    expect(screen.getByTestId("company-banner__plan-entrance")).toBeTruthy();
    expect(screen.getByText("Acme · Company Plan")).toBeTruthy();
    fireEvent.press(screen.getByTestId("company-banner__pressable"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
