//DO NOT REMOVE THIS CODE

// CRITICAL: Import ErrorUtils shim FIRST before any React Native imports
// This prevents "Cannot read property 'getGlobalHandler' of undefined" errors
import "./src/utils/errorUtilsShim";

import "./global.css";
import "react-native-get-random-values";
import { LogBox } from "react-native";

if (__DEV__) {
  console.log("[index] Project ID is: ", process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID);
  LogBox.ignoreLogs([
    "Expo AV has been deprecated",
    "Disconnected from Metro",
    "AbortError",
    "Invalid Refresh Token",
    "Refresh Token Not Found",
    "Auth session missing",
    "AuthSessionMissingError",
    "[File Upload] createSignedUrl failed",
    "Storage object not found",
    "Object not found",
    "SafeAreaView has been deprecated",
    "The app is running using the Legacy Architecture",
    "Ignoring DevTools app debug target",
    "Failed to open debugger. Please check that the dev server is running and reload the app.",
    "Open debugger to view warnings.",
    "The action 'SET_PARAMS'",
    "was not handled by any navigator",
  ]);
}

// Suppress console errors for refresh token issues and missing storage/auth objects (they're handled gracefully)
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const errorMessage = args[0]?.message || args[0] || '';
  const errorString = String(errorMessage);
  
  // Suppress refresh token / missing session / missing storage object errors - they're handled gracefully
  if (
    errorString.includes('Invalid Refresh Token') || 
    errorString.includes('Refresh Token Not Found') ||
    errorString.includes('Auth session missing') ||
    errorString.includes('AuthSessionMissingError') ||
    errorString.includes('Object not found')
  ) {
    // Silently handle - store/component fallbacks handle these gracefully
    return;
  }
  
  // Call original console.error for all other errors
  originalConsoleError.apply(console, args);
};

import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
