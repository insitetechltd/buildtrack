//DO NOT REMOVE THIS CODE

// CRITICAL: Import ErrorUtils shim FIRST before any React Native imports
// This prevents "Cannot read property 'getGlobalHandler' of undefined" errors
import "./src/utils/errorUtilsShim";

console.log("[index] Project ID is: ", process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID);
import "./global.css";
import "react-native-get-random-values";
import { LogBox } from "react-native";
LogBox.ignoreLogs([
  "Expo AV has been deprecated", 
  "Disconnected from Metro", 
  "AbortError",
  "Invalid Refresh Token",
  "Refresh Token Not Found"
]);

// Suppress console errors for refresh token issues (they're handled gracefully)
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const errorMessage = args[0]?.message || args[0] || '';
  const errorString = String(errorMessage);
  
  // Suppress refresh token errors - they're handled by auth store
  if (errorString.includes('Invalid Refresh Token') || 
      errorString.includes('Refresh Token Not Found')) {
    // Silently handle - auth store will clear session
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
