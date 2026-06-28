import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import LoginScreen from "@/screens/LoginScreen";

jest.mock("@/ui/viewAdapters/useLoginViewAdapter", () => ({
  useLoginViewAdapter: jest.fn(),
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

jest.mock("expo-constants", () => ({
  expoConfig: {
    version: "1.2.3",
    ios: {
      buildNumber: "456",
    },
  },
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    login: {
      constructionTaskManagement: "Construction Task Management",
      emailOrPhone: "Email or phone",
      emailOrPhonePlaceholder: "Enter your email or phone",
      passwordPlaceholder: "Enter your password",
      signIn: "Sign In",
      signingIn: "Signing In...",
    },
    auth: {
      password: "Password",
    },
  }),
}));

describe("LoginScreen", () => {
  const mockSetEmailOrPhone = jest.fn();
  const mockSetPassword = jest.fn();
  const mockTogglePasswordVisibility = jest.fn();
  const mockSubmitLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const { useLoginViewAdapter } = require("@/ui/viewAdapters/useLoginViewAdapter");

    useLoginViewAdapter.mockReturnValue({
      output: {
        screenId: "LoginScreen",
        emailOrPhone: "demo@example.com",
        password: "secret123",
        isPasswordVisible: false,
        buildIdentifierLabel: "v1.2.3 (456)",
        validationErrors: {},
        isLoading: false,
      },
      actions: {
        setEmailOrPhone: mockSetEmailOrPhone,
        setPassword: mockSetPassword,
        togglePasswordVisibility: mockTogglePasswordVisibility,
        submitLogin: mockSubmitLogin,
      },
    });
  });

  it("renders login fields and delegates submit through the login adapter", () => {
    const screen = render(<LoginScreen />);

    expect(screen.getByText("Construction Task Management")).toBeTruthy();
    expect(screen.getByText("v1.2.3 (456)")).toBeTruthy();

    fireEvent.changeText(screen.getByTestId("login-emailOrPhone"), "demo@example.com");
    fireEvent.changeText(screen.getByTestId("login-password"), "secret123");
    fireEvent.press(screen.getByTestId("login-togglePassword"));
    fireEvent.press(screen.getByTestId("login-submit"));

    expect(mockSetEmailOrPhone).toHaveBeenCalledWith("demo@example.com");
    expect(mockSetPassword).toHaveBeenCalledWith("secret123");
    expect(mockTogglePasswordVisibility).toHaveBeenCalledTimes(1);
    expect(mockSubmitLogin).toHaveBeenCalledTimes(1);
  });
});
