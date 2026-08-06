import React from "react";
import { render } from "@testing-library/react-native";

import AppNavigator from "@/navigation/AppNavigator";

export function renderAppShellJourney(_initialUrl?: string) {
  return render(<AppNavigator />);
}
