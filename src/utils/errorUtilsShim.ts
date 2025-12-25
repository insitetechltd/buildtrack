/**
 * ErrorUtils Shim
 * 
 * This file MUST be imported FIRST in index.ts before any React Native imports.
 * It ensures ErrorUtils is available before Expo's dev tools try to access it.
 * 
 * This prevents the "Cannot read property 'getGlobalHandler' of undefined" error
 * that occurs in development mode.
 */

// Initialize ErrorUtils immediately when this file is imported
if (typeof global !== 'undefined') {
  const existingErrorUtils = (global as any).ErrorUtils;
  
  if (!existingErrorUtils) {
    (global as any).ErrorUtils = {
      getGlobalHandler: () => {
        return (error: Error, isFatal?: boolean) => {
          console.error(isFatal ? 'Fatal Error:' : 'Error:', error);
        };
      },
      setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => {
        // Store the handler for potential future use
        (global as any)._errorHandler = handler;
      },
      reportError: (error: Error) => {
        console.error('Reported Error:', error);
      },
      reportFatalError: (error: Error) => {
        console.error('Fatal Error:', error);
      },
    };
  }
}

export {};



