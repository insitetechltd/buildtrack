import { act, renderHook, waitFor } from "@testing-library/react-native";

import { loginIdentifierIsRegistered } from "@/api/loginIdentifierLookup";
import { SIGNUP_URL } from "@/legal/legalLinks";
import { useLoginViewAdapter } from "@/ui/viewAdapters/useLoginViewAdapter";

jest.mock("@/api/loginIdentifierLookup", () => ({
  loginIdentifierIsRegistered: jest.fn(),
}));

const mockLogin = jest.fn();

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => ({
    login: mockLogin,
    isLoading: false,
  }),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    common: { ok: "OK" },
    login: {
      signingIn: "Signing In...",
      signIn: "Sign In",
      signUp: "Sign Up",
      checkingAccount: "Checking…",
      emailOrPhoneRequired: "Email or phone number is required",
      invalidEmailOrPhone: "Please enter a valid email or phone number",
      loginFailed: "Login Failed",
      invalidCredentials: "Invalid email or password. Please try again.",
      emailNotConfirmed: "Email not confirmed",
      profileMissing: "Profile missing",
      phoneLookupFailed: "Phone lookup failed",
      approvalPending: "Approval Pending",
      approvalPendingMessage: "Pending approval",
      signUpOnWebFailed: "Could not open the sign-up page.",
    },
    validation: {
      passwordRequired: "Password is required",
      passwordTooShort: "Password must be at least 6 characters",
    },
  }),
}));

jest.mock("expo-constants", () => ({
  expoConfig: { version: "1.2.3", ios: { buildNumber: "456" } },
}));

jest.mock("expo-application", () => ({
  nativeApplicationVersion: "1.2.3",
  nativeBuildVersion: "456",
}));

const mockLookup = loginIdentifierIsRegistered as jest.MockedFunction<
  typeof loginIdentifierIsRegistered
>;

describe("useLoginViewAdapter account gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps password locked until a registered email is confirmed", async () => {
    mockLookup.mockResolvedValue(true);
    const { result } = renderHook(() => useLoginViewAdapter());

    expect(result.current.output.isPasswordEnabled).toBe(false);
    expect(result.current.output.primaryAction).toBe("disabled");

    act(() => {
      result.current.actions.setEmailOrPhone("sara@insitetest.com");
    });

    expect(result.current.output.accountLookupStatus).toBe("checking");

    await act(async () => {
      jest.advanceTimersByTime(450);
    });

    await waitFor(() => {
      expect(result.current.output.accountLookupStatus).toBe("registered");
    });

    expect(result.current.output.isPasswordEnabled).toBe(true);
    expect(result.current.output.primaryAction).toBe("login");
    expect(result.current.output.primaryButtonLabel).toBe("Sign In");
  });

  it("routes unregistered emails to web signup via the primary action", async () => {
    mockLookup.mockResolvedValue(false);
    const openURL = jest
      .spyOn(require("react-native").Linking, "openURL")
      .mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useLoginViewAdapter());

    act(() => {
      result.current.actions.setEmailOrPhone("new-founder@example.com");
    });

    await act(async () => {
      jest.advanceTimersByTime(450);
    });

    await waitFor(() => {
      expect(result.current.output.primaryAction).toBe("signup");
    });

    expect(result.current.output.isPasswordEnabled).toBe(false);
    expect(result.current.output.primaryButtonLabel).toBe("Sign Up");

    await act(async () => {
      await result.current.actions.submitLogin();
    });

    expect(openURL).toHaveBeenCalledWith(
      `${SIGNUP_URL}?email=${encodeURIComponent("new-founder@example.com")}`,
    );
    expect(mockLogin).not.toHaveBeenCalled();
    openURL.mockRestore();
  });
});
