// Import Constants with error handling for Node.js environment
let Constants: any = null;
try {
  Constants = require('expo-constants').default;
} catch (error) {
  // Constants not available in Node.js environment
  Constants = {
    expoConfig: null
  };
}

export type EnvironmentType = 'eas' | 'local' | 'development' | 'unknown';

export interface EnvironmentInfo {
  type: EnvironmentType;
  isEAS: boolean;
  isLocal: boolean;
  isDevelopment: boolean;
  displayName: string;
  description: string;
}

/**
 * Detects the current environment and provides information about whether
 * the app is running on EAS, local network, or development mode.
 */
export function detectEnvironment(): EnvironmentInfo {
  // Check if running in development mode first
  const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
  
  // More specific EAS detection - only if actually running on EAS runtime
  // Not just having EAS config, but actually being served by EAS
  const isEAS = !!(
    // Check if we're actually running on EAS (not just configured for it)
    (Constants.expoConfig?.extra?.eas?.projectId && !isDevelopment) ||
    // Check for EAS-specific runtime indicators
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    // Check if we're in a production EAS environment
    (Constants.expoConfig?.updates?.url?.includes('u.expo.dev') && !isDevelopment)
  );

  // Check if running locally (Metro bundler)
  const isLocal = isDevelopment && !isEAS;

  // Debug logging (only in development)
  if (isDevelopment) {
    console.log('🔍 Environment Detection Debug:', {
      __DEV__,
      NODE_ENV: process.env.NODE_ENV,
      isDevelopment,
      isEAS,
      isLocal,
      easProjectId: Constants.expoConfig?.extra?.eas?.projectId,
      updatesUrl: Constants.expoConfig?.updates?.url,
      publicEasProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    });
  }

  // Determine environment type
  let type: EnvironmentType;
  let displayName: string;
  let description: string;

  if (isEAS) {
    type = 'eas';
    displayName = 'EAS';
    description = 'Expo Application Services';
  } else if (isLocal) {
    type = 'local';
    displayName = 'Local';
    description = 'Local Development';
  } else if (isDevelopment) {
    type = 'development';
    displayName = 'Dev';
    description = 'Development Mode';
  } else {
    type = 'unknown';
    displayName = 'Unknown';
    description = 'Unknown Environment';
  }

  return {
    type,
    isEAS,
    isLocal,
    isDevelopment,
    displayName,
    description,
  };
}

/**
 * Gets environment-specific styling for the indicator
 */
export function getEnvironmentStyles(env: EnvironmentInfo) {
  switch (env.type) {
    case 'eas':
      return {
        backgroundColor: '#10b981', // green-500
        textColor: '#ffffff',
        borderColor: '#059669', // green-600
        icon: 'cloud' as const,
      };
    case 'local':
      return {
        backgroundColor: '#3b82f6', // blue-500
        textColor: '#ffffff',
        borderColor: '#2563eb', // blue-600
        icon: 'home' as const,
      };
    case 'development':
      return {
        backgroundColor: '#f59e0b', // amber-500
        textColor: '#ffffff',
        borderColor: '#d97706', // amber-600
        icon: 'code' as const,
      };
    default:
      return {
        backgroundColor: '#6b7280', // gray-500
        textColor: '#ffffff',
        borderColor: '#4b5563', // gray-600
        icon: 'help-circle' as const,
      };
  }
}
