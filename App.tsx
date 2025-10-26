import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AppNavigator from "./src/navigation/AppNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";

// VERSION CONTROL - Increment this to force a fresh app state
const APP_VERSION = "54.0";
const VERSION_KEY = "@app_version";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project. 
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

🔥 REAL-TIME DATA SYNC - All users receive updates immediately! ✅
Last Updated: v13.0
*/

export default function App() {
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const storedVersion = await AsyncStorage.getItem(VERSION_KEY);
        
        if (storedVersion !== APP_VERSION) {
          console.log(`Version mismatch: ${storedVersion} -> ${APP_VERSION}. Clearing all data...`);
          
          // Clear ALL AsyncStorage data except the version key
          await AsyncStorage.clear();
          await AsyncStorage.setItem(VERSION_KEY, APP_VERSION);
          
          console.log("Data cleared. App will now use fresh Supabase data.");
          
          // Force a re-render by reloading the app
          if (typeof window !== "undefined" && window.location) {
            window.location.reload();
          }
        } else {
          console.log(`Version ${APP_VERSION} - App state is current`);
        }
      } catch (error) {
        console.error("Version check failed:", error);
      }
    };
    
    checkVersion();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// FORCE RELOAD v12.0 - REAL-TIME DATA SYNC SYSTEM
