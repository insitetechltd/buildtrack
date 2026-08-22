import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import OwnerConsoleScreen from "@/screens/OwnerConsoleScreen";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ModernScreenHeader", () => {
  const { Text, Pressable } = require("react-native");
  return ({
    title,
    onBack,
  }: {
    title: string;
    onBack?: () => void;
  }) => (
    <>
      <Text>{title}</Text>
      {onBack ? (
        <Pressable testID="mock-header-back" onPress={onBack} />
      ) : null}
    </>
  );
});

jest.mock("@/components/BrandHeaderTitle", () => {
  const { Text } = require("react-native");
  return ({ label }: { label: string }) => <Text>{label}</Text>;
});

describe("OwnerConsoleScreen", () => {
  it("renders three top-level sections with navigation callbacks", () => {
    const onOpenMonitoring = jest.fn();
    const onOpenEconomics = jest.fn();
    const onOpenTenantOps = jest.fn();

    const { getByTestId } = render(
      <OwnerConsoleScreen
        onNavigateBack={jest.fn()}
        onOpenMonitoring={onOpenMonitoring}
        onOpenEconomics={onOpenEconomics}
        onOpenTenantOps={onOpenTenantOps}
      />,
    );

    fireEvent.press(getByTestId("owner-console__section_monitoring"));
    fireEvent.press(getByTestId("owner-console__section_economics"));
    fireEvent.press(getByTestId("owner-console__section_tenant-ops"));

    expect(onOpenMonitoring).toHaveBeenCalledTimes(1);
    expect(onOpenEconomics).toHaveBeenCalledTimes(1);
    expect(onOpenTenantOps).toHaveBeenCalledTimes(1);
  });
});
