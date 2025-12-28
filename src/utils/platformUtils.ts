import { Platform } from 'react-native';

/**
 * Platform detection utilities for handling macOS/desktop vs mobile differences
 */

/**
 * Check if the app is running on macOS or desktop
 * On macOS, Platform.OS can be "web" (if running via Expo web) or "macos" (if using react-native-macos)
 */
export const isDesktop = (): boolean => {
  return Platform.OS === 'web' || Platform.OS === 'macos' || Platform.OS === 'windows' || Platform.OS === 'linux';
};

/**
 * Check if the app is running on macOS specifically
 */
export const isMacOS = (): boolean => {
  return Platform.OS === 'macos' || (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('mac'));
};

/**
 * Check if the app is running on a touch device
 * Desktop devices typically don't have touch support
 */
export const isTouchDevice = (): boolean => {
  if (isDesktop()) return false;
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

/**
 * Get appropriate minimum touch target size
 * Desktop needs larger click targets, mobile can be smaller
 */
export const getMinTouchTarget = (): number => {
  return isDesktop() ? 44 : 40; // 44px recommended for desktop, 40px for mobile
};

