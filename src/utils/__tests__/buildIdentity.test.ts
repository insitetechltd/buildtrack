import {
  formatBuildIdentityLabel,
  platformToken,
  resolveBuildChannel,
  resolveNativeBuildParts,
} from "../buildIdentity";

describe("buildIdentity", () => {
  it("maps platform tokens", () => {
    expect(platformToken("ios")).toBe("i");
    expect(platformToken("android")).toBe("a");
    expect(platformToken("web")).toBe("i");
  });

  it("resolves known channels and falls back to dev", () => {
    expect(resolveBuildChannel("tf")).toBe("tf");
    expect(resolveBuildChannel("RC")).toBe("rc");
    expect(resolveBuildChannel("sim")).toBe("sim");
    expect(resolveBuildChannel("dev")).toBe("dev");
    expect(resolveBuildChannel(undefined)).toBe("dev");
    expect(resolveBuildChannel("nope")).toBe("dev");
  });

  it("formats iOS TF / Android RC / sim / metro labels", () => {
    expect(
      formatBuildIdentityLabel({
        appVersion: "1.1.3",
        buildNumber: 248,
        platform: "i",
        channel: "tf",
      }),
    ).toBe("v1.1.3 (248i-tf)");
    expect(
      formatBuildIdentityLabel({
        appVersion: "1.1.3",
        buildNumber: "248",
        platform: "android",
        channel: "rc",
      }),
    ).toBe("v1.1.3 (248a-rc)");
    expect(
      formatBuildIdentityLabel({
        appVersion: "1.1.3",
        buildNumber: 248,
        platform: "i",
        channel: "sim",
      }),
    ).toBe("v1.1.3 (248i-sim)");
    expect(
      formatBuildIdentityLabel({
        appVersion: "1.1.3",
        buildNumber: 0,
        platform: "i",
        channel: null,
      }),
    ).toBe("v1.1.3 (0i-dev)");
  });

  it("prefers native build parts over config", () => {
    expect(
      resolveNativeBuildParts({
        nativeApplicationVersion: "1.1.3",
        nativeBuildVersion: "248",
        configVersion: "9.9.9",
        configIosBuildNumber: "194",
        configAndroidVersionCode: 41,
      }),
    ).toEqual({ appVersion: "1.1.3", buildNumber: "248" });
  });

  it("falls back to android versionCode when iOS build missing", () => {
    expect(
      resolveNativeBuildParts({
        configVersion: "1.1.3",
        configAndroidVersionCode: 41,
      }),
    ).toEqual({ appVersion: "1.1.3", buildNumber: "41" });
  });
});
