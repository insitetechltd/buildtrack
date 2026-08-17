import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import SetPasswordScreen from "@/screens/SetPasswordScreen";

const mockCompleteFirstLoginPassword = jest.fn();

jest.mock("@/state/authStore", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      completeFirstLoginPassword: mockCompleteFirstLoginPassword,
      isLoading: false,
    }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    setPassword: {
      title: "Set your password",
      subtitle: "Choose a password so you can sign in next time.",
      password: "New password",
      passwordPlaceholder: "At least 6 characters",
      confirmPassword: "Confirm password",
      confirmPasswordPlaceholder: "Re-enter your password",
      submit: "Continue",
      submitting: "Saving…",
      passwordRequired: "Password is required",
      passwordTooShort: "Password must be at least 6 characters",
      confirmPasswordRequired: "Please confirm your password",
      passwordsDoNotMatch: "Passwords do not match",
      failedTitle: "Could not save password",
      retryAfterAuth: "Password saved. Tap Continue again to finish.",
    },
  }),
}));

describe("SetPasswordScreen", () => {
  beforeEach(() => {
    mockCompleteFirstLoginPassword.mockReset();
    mockCompleteFirstLoginPassword.mockResolvedValue({ success: true });
  });

  it("does not submit when confirm does not match", () => {
    const screen = render(<SetPasswordScreen />);

    fireEvent.changeText(screen.getByTestId("set-password-password"), "secret1");
    fireEvent.changeText(screen.getByTestId("set-password-confirm"), "secret2");
    fireEvent.press(screen.getByTestId("set-password-submit"));

    expect(mockCompleteFirstLoginPassword).not.toHaveBeenCalled();
    expect(screen.getByText("Passwords do not match")).toBeTruthy();
  });

  it("submits matching passwords through completeFirstLoginPassword", () => {
    const screen = render(<SetPasswordScreen />);

    fireEvent.changeText(screen.getByTestId("set-password-password"), "secret1");
    fireEvent.changeText(screen.getByTestId("set-password-confirm"), "secret1");
    fireEvent.press(screen.getByTestId("set-password-submit"));

    expect(mockCompleteFirstLoginPassword).toHaveBeenCalledWith("secret1");
  });
});
