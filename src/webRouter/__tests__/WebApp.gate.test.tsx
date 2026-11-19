import { Platform } from "react-native";

import { isWebPlatform } from "../platformGate";

describe("platformGate (M-WEB-01 spike)", () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(Platform, "OS");

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(Platform, "OS", originalDescriptor);
    }
  });

  it("is true when Platform.OS is web", () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "web",
    });
    expect(isWebPlatform()).toBe(true);
  });

  it("is false on ios", () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "ios",
    });
    expect(isWebPlatform()).toBe(false);
  });
});
