import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Language = "en" | "zh-TW";

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "en", // Default to English
      
      setLanguage: (language: Language) => {
        set({ language });
      },
    }),
    {
      name: "buildtrack-language",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
