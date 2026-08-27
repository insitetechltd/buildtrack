import {
  companyBannerStoragePath,
  isEphemeralBannerImageUri,
  resolveCompanyBannerImageUrl,
} from "../companyBannerStorage";
import { createSignedFileUrl } from "../fileUploadService";

jest.mock("../fileUploadService", () => {
  const actual = jest.requireActual("../fileUploadService");
  return {
    ...actual,
    createSignedFileUrl: jest.fn(),
  };
});

describe("companyBannerStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds a company-scoped branding object key", () => {
    expect(companyBannerStoragePath("company-1", "jpeg")).toBe(
      "company-1/branding/banner.jpeg",
    );
  });

  it("detects ephemeral local and clipboard URIs", () => {
    expect(isEphemeralBannerImageUri("file:///tmp/banner.jpg")).toBe(true);
    expect(isEphemeralBannerImageUri("data:image/png;base64,abc")).toBe(true);
    expect(isEphemeralBannerImageUri("ph://asset")).toBe(true);
    expect(isEphemeralBannerImageUri("company-1/branding/banner.jpg")).toBe(false);
    expect(isEphemeralBannerImageUri("https://example.com/b.jpg")).toBe(false);
  });

  it("resolves signed URLs from imageStoragePath for all seats", async () => {
    (createSignedFileUrl as jest.Mock).mockResolvedValue("https://signed.example/banner");

    await expect(
      resolveCompanyBannerImageUrl({
        imageStoragePath: "company-1/branding/banner.jpg",
      }),
    ).resolves.toBe("https://signed.example/banner");

    expect(createSignedFileUrl).toHaveBeenCalledWith(
      "company-1/branding/banner.jpg",
      expect.any(Number),
    );
  });

  it("ignores ephemeral imageUri so other devices do not load broken local paths", async () => {
    await expect(
      resolveCompanyBannerImageUrl({
        imageUri: "file:///var/mobile/Containers/banner.jpg",
      }),
    ).resolves.toBeNull();
    expect(createSignedFileUrl).not.toHaveBeenCalled();
  });
});
