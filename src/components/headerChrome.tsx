import React, { createContext, useContext } from "react";

/** Header chrome: brand mark XOR back control — never both. */
export type HeaderChromeValue = {
  /** When false, BrandHeaderTitle must not render the Taskr logo mark. */
  allowBrandMark: boolean;
};

const HeaderChromeContext = createContext<HeaderChromeValue>({
  allowBrandMark: true,
});

export function HeaderChromeProvider({
  allowBrandMark,
  children,
}: HeaderChromeValue & { children: React.ReactNode }) {
  return (
    <HeaderChromeContext.Provider value={{ allowBrandMark }}>
      {children}
    </HeaderChromeContext.Provider>
  );
}

export function useHeaderChrome(): HeaderChromeValue {
  return useContext(HeaderChromeContext);
}

/** Shared hit-target size for back control and brand mark (40×40). */
export const HEADER_LEADING_CONTROL_SIZE_CLASS = "h-10 w-10";
