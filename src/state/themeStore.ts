import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ThemeState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false, // Default to light mode
      
      toggleDarkMode: () => {
        set((state) => ({ isDarkMode: !state.isDarkMode }));
      },
      
      setDarkMode: (isDark: boolean) => {
        set({ isDarkMode: isDark });
      },
    }),
    {
      name: "buildtrack-theme",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

