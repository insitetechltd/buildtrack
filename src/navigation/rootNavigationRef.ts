import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./navigationTypes";

export const rootNavigationRef =
  typeof createNavigationContainerRef === "function"
    ? createNavigationContainerRef<RootStackParamList>()
    : ({
        isReady: () => false,
        navigate: () => {},
        dispatch: () => {},
        reset: () => {},
      } as any);
