import React, { createContext, useContext } from "react";

import type { CaptureSessionResult } from "./types";

export type CaptureSessionHostProps = {
  onCancel: () => void;
  onComplete: (result: CaptureSessionResult) => void;
  selectionLimit?: number;
};

export type CaptureSessionHostContextValue = CaptureSessionHostProps & {
  goToHybridLibrary: () => void;
  goToCamera: () => void;
};

const CaptureSessionHostContext =
  createContext<CaptureSessionHostContextValue | null>(null);

export function CaptureSessionHostProvider({
  value,
  children,
}: {
  value: CaptureSessionHostContextValue;
  children: React.ReactNode;
}) {
  return (
    <CaptureSessionHostContext.Provider value={value}>
      {children}
    </CaptureSessionHostContext.Provider>
  );
}

export function useCaptureSessionHost(): CaptureSessionHostContextValue {
  const ctx = useContext(CaptureSessionHostContext);
  if (!ctx) {
    throw new Error(
      "useCaptureSessionHost must be used inside CaptureSessionModule",
    );
  }
  return ctx;
}
