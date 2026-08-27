import { useEffect } from "react";
import { useColorScheme } from "nativewind";

import { useThemeStore } from "@/state/themeStore";

/**
 * Syncs persisted Profile theme toggle → NativeWind colorScheme
 * so `dark:` utilities resolve app-wide.
 */
export default function ThemeRoot({ children }: { children: React.ReactNode }) {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(isDarkMode ? "dark" : "light");
  }, [isDarkMode, setColorScheme]);

  return <>{children}</>;
}
