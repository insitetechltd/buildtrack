import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./navigationTypes";

export const rootNavigationRef =
  createNavigationContainerRef<RootStackParamList>();
